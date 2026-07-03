import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rawOhlcRetentionDays } from "@/lib/compaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  // Vercel Cron は CRON_SECRET を、market-alert 等は INGEST_SECRET を用いる
  const secrets = [process.env.CRON_SECRET, process.env.INGEST_SECRET].filter(
    (s): s is string => Boolean(s)
  );
  return secrets.some((s) => auth === `Bearer ${s}`);
}

/**
 * 容量削減のためのプルーニング。
 *  - 保持日数を過ぎた Signal の生OHLC窓(ohlc15Json / ohlc5Json)を DB NULL 化（featuresJson は残す）
 *  - 任意で deleteScanOlderThanDays を指定すると、その日数を超えた source="scan"
 *    （取引に紐付かないもの）を削除して更に容量を削減
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { deleteScanOlderThanDays?: number } = {};
  try {
    body = (await req.json()) as { deleteScanOlderThanDays?: number };
  } catch {
    body = {};
  }

  const retentionDays = rawOhlcRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const nulled = await prisma.signal.updateMany({
    where: { barTime: { lt: cutoff }, pruned: false },
    data: { ohlc15Json: Prisma.DbNull, ohlc5Json: Prisma.DbNull, pruned: true }
  });

  let deletedScan = 0;
  if (typeof body.deleteScanOlderThanDays === "number" && body.deleteScanOlderThanDays > 0) {
    const delCutoff = new Date(Date.now() - body.deleteScanOlderThanDays * 24 * 60 * 60 * 1000);
    const res = await prisma.signal.deleteMany({
      where: { source: "scan", barTime: { lt: delCutoff }, trades: { none: {} } }
    });
    deletedScan = res.count;
  }

  return NextResponse.json({
    ok: true,
    retentionDays,
    ohlcNulled: nulled.count,
    deletedScan
  });
}

/** Vercel Cron 用（GET）。生OHLC窓の null 化のみ実施。 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const retentionDays = rawOhlcRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const nulled = await prisma.signal.updateMany({
    where: { barTime: { lt: cutoff }, pruned: false },
    data: { ohlc15Json: Prisma.DbNull, ohlc5Json: Prisma.DbNull, pruned: true }
  });
  return NextResponse.json({ ok: true, retentionDays, ohlcNulled: nulled.count });
}
