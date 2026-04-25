import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTopResults, identifyWithPlantNet, normalizeOrgan } from "@/lib/plantnet";
import { enrichCandidatesWithLlm, type EnrichResultItem } from "@/lib/enrich";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024;
const OK_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  if (!process.env.PLANTNET_API_KEY) {
    return NextResponse.json(
      { error: "PLANTNET_API_KEY が未設定です。my.plantnet.org で API キーを発行し .env.local に設定してください。" },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const file = form.get("image");
  if (!file || !(file instanceof File)) {
    return badRequest("画像ファイルが必要です。");
  }
  if (file.size < 1) {
    return badRequest("空のファイルは受理できません。");
  }
  if (file.size > MAX_BYTES) {
    return badRequest("画像が大きすぎます（50MB 未満にしてください）。");
  }
  const ct = (file.type || "image/jpeg").toLowerCase();
  if (!OK_TYPES.has(ct)) {
    return badRequest("JPEG / PNG / WebP / HEIC のみ対応しています。形式を変えて再試行してください。");
  }

  const project = (process.env.PLANTNET_PROJECT ?? "k-world-flora").trim() || "k-world-flora";
  const organ = normalizeOrgan(String(form.get("organ") ?? ""));

  const monthRaw = String(form.get("capturedMonth") ?? "").trim();
  const capturedMonth = monthRaw === "" ? null : Math.min(12, Math.max(1, parseInt(monthRaw, 10) || 0)) || null;
  if (monthRaw && capturedMonth == null) {
    return badRequest("撮影月の値が不正です。");
  }

  const location = String(form.get("location") ?? "").trim() || null;
  const habitat = String(form.get("habitat") ?? "").trim() || null;
  const userNote = String(form.get("userNote") ?? "").trim() || null;

  const ab = await file.arrayBuffer();
  const fileName = file.name && file.name.length > 0 ? file.name : "upload.jpg";
  const contentType = file.type && file.type.length > 0 ? file.type : "image/jpeg";

  let plJson: Awaited<ReturnType<typeof identifyWithPlantNet>>;
  try {
    plJson = await identifyWithPlantNet({
      project,
      apiKey: process.env.PLANTNET_API_KEY,
      organ,
      imageBuffer: ab,
      fileName,
      contentType: ct
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Pl@ntNet 失敗: ${msg}` }, { status: 502 });
  }

  const tops = extractTopResults(plJson, 5);
  if (tops.length === 0) {
    return NextResponse.json(
      { error: "有効な候補が得られませんでした。花・葉のどちらかが写るよう撮影し、別の写り方でも試してください。" },
      { status: 422 }
    );
  }

  const rawStr = JSON.stringify(plJson);
  if (rawStr.length > 1_200_000) {
    return NextResponse.json({ error: "Pl@ntNet 応答が大きすぎます。別の画像で試してください。" }, { status: 413 });
  }

  const rec = await prisma.identification.create({
    data: {
      capturedMonth,
      location,
      habitat,
      userNote,
      organ: organ === "auto" ? "auto" : organ,
      plantNetProject: project,
      plantNetRawJson: rawStr
    }
  });

  const created: { id: string; scientificName: string; family: string | null; plantNetScore: number }[] = [];
  for (let i = 0; i < tops.length; i++) {
    const t = tops[i];
    const c = await prisma.candidate.create({
      data: {
        identificationId: rec.id,
        scientificName: t.scientificName,
        family: t.family,
        plantNetScore: t.score,
        rank: i,
        plantNetSpeciesJson: t.speciesJson
      }
    });
    created.push({
      id: c.id,
      scientificName: t.scientificName,
      family: t.family,
      plantNetScore: t.score
    });
  }

  const enrichIn = {
    context: { capturedMonth, location, habitat, userNote },
    candidates: created.map((c) => ({
      id: c.id,
      scientificName: c.scientificName,
      family: c.family,
      plantNetScore: c.plantNetScore
    }))
  };

  let enrich: EnrichResultItem[] = [];
  try {
    enrich = await enrichCandidatesWithLlm(enrichIn);
  } catch {
    // Pl@ntNet の結果は保存済み。LLM 失敗時は候補の説明は null のまま。
  }

  const byId = new Map<string, EnrichResultItem>(enrich.map((x) => [x.candidateId, x]));

  for (const c of created) {
    const e = byId.get(c.id);
    if (e) {
      await prisma.candidate.update({
        where: { id: c.id },
        data: {
          commonNameJa: e.commonNameJa,
          description: e.description,
          rerankScore: e.rerankScore,
          rerankReason: e.rerankReason
        }
      });
    }
  }

  const withRows = await prisma.candidate.findMany({
    where: { identificationId: rec.id }
  });
  const scored = withRows
    .map((row) => ({
      row,
      s: row.rerankScore ?? row.plantNetScore
    }))
    .sort((a, b) => b.s - a.s);
  for (let i = 0; i < scored.length; i++) {
    await prisma.candidate.update({
      where: { id: scored[i].row.id },
      data: { rank: i }
    });
  }

  return NextResponse.json({ id: rec.id });
}
