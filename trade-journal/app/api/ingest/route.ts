import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildFeatures } from "@/lib/features";
import { normalizeIngestPayload } from "@/lib/compaction";
import type { CompactBar, IngestPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

function parseBarTime(s: string): Date | null {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: IngestPayload;
  try {
    payload = (await req.json()) as IngestPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof payload.close !== "number" || !payload.barTime) {
    return NextResponse.json({ ok: false, error: "close and barTime are required" }, { status: 400 });
  }
  const barTime = parseBarTime(payload.barTime);
  if (!barTime) {
    return NextResponse.json({ ok: false, error: "Invalid barTime" }, { status: 400 });
  }

  const { numeric, ohlc15, ohlc5 } = normalizeIngestPayload(payload);
  const source = ["scan", "alert", "summary"].includes(payload.source) ? payload.source : "scan";
  const alertDir = payload.alertDir === "long" || payload.alertDir === "short" ? payload.alertDir : null;

  // 拡張特徴量を保存時に確定（再計算不要にして読み出しを軽くする）
  const features = buildFeatures({
    barTimeEpochSec: Math.floor(barTime.getTime() / 1000),
    close: numeric.close ?? payload.close,
    prevHigh: numeric.prevHigh,
    prevLow: numeric.prevLow,
    ma20: numeric.ma20,
    atr15: numeric.atr15,
    longThreshold: numeric.longThreshold,
    shortThreshold: numeric.shortThreshold,
    close1h: numeric.close1h,
    ema20_1h: numeric.ema20_1h,
    ema50_1h: numeric.ema50_1h,
    ohlc15: ohlc15 as CompactBar[] | null,
    ohlc5: ohlc5 as CompactBar[] | null
  });

  // 容量削減: 同一足・同一ソースの重複は1件に集約（scan の取りこぼし再送対策）
  const existing = await prisma.signal.findFirst({
    where: { barTime, source }
  });

  const data = {
    barTime,
    source,
    alertDir,
    close: numeric.close ?? payload.close,
    prevHigh: numeric.prevHigh,
    prevLow: numeric.prevLow,
    ma20: numeric.ma20,
    atr15: numeric.atr15,
    longThreshold: numeric.longThreshold,
    shortThreshold: numeric.shortThreshold,
    close1h: numeric.close1h,
    ema20_1h: numeric.ema20_1h,
    ema50_1h: numeric.ema50_1h,
    trendUp: numeric.trendUp ?? false,
    trendDown: numeric.trendDown ?? false,
    oshiritsuLong: numeric.oshiritsuLong,
    oshiritsuShort: numeric.oshiritsuShort,
    volumeRatio: numeric.volumeRatio,
    featuresJson: features as unknown as Prisma.InputJsonValue,
    ohlc15Json: ohlc15
      ? (ohlc15 as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    ohlc5Json: ohlc5 ? (ohlc5 as unknown as Prisma.InputJsonValue) : Prisma.DbNull
  };

  const saved = existing
    ? await prisma.signal.update({ where: { id: existing.id }, data })
    : await prisma.signal.create({ data });

  return NextResponse.json({ ok: true, id: saved.id, deduped: Boolean(existing) });
}
