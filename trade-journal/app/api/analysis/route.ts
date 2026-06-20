import { NextResponse } from "next/server";
import { assembleAnalysis } from "@/lib/assembleRecords";
import { generateConditionDiscovery } from "@/lib/aiClient";
import { CURRENT_RULES_SUMMARY } from "@/prompts/conditionDiscovery";
import type { StatRecord } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** AI に渡す代表事例: 前方リターン上位/下位を少数抽出（過学習防止のため少数） */
function pickSamples(records: StatRecord[], n = 6): unknown[] {
  const withReturn = records
    .filter((r) => typeof r.outcome?.forwardReturn === "number" || typeof r.rMultiple === "number")
    .map((r) => ({
      direction: r.direction,
      isRealTrade: r.isRealTrade,
      rMultiple: r.rMultiple ?? null,
      forwardReturn: r.outcome?.forwardReturn ?? null,
      oshiritsu: r.oshiritsu ?? null,
      session: r.features?.sessionBucket ?? null,
      atrRegime: r.features?.atrRegime ?? null,
      trendAligned:
        (r.direction === "long" && r.trendUp) || (r.direction === "short" && r.trendDown),
      rsi14: r.features?.rsi14 ?? null,
      volumeRatio: r.volumeRatio ?? null
    }));
  const score = (x: { rMultiple: number | null; forwardReturn: number | null }): number =>
    x.rMultiple ?? x.forwardReturn ?? 0;
  const sorted = [...withReturn].sort((a, b) => score(b) - score(a));
  const top = sorted.slice(0, Math.ceil(n / 2));
  const bottom = sorted.slice(-Math.floor(n / 2));
  return [...top, ...bottom];
}

export async function GET() {
  const analysis = await assembleAnalysis();
  return NextResponse.json({
    ok: true,
    stats: analysis.stats,
    forwardBarsAvailable: analysis.forwardBarsAvailable,
    signalCount: analysis.signalCount,
    tradeCount: analysis.tradeCount
  });
}

export async function POST() {
  const analysis = await assembleAnalysis();
  let discovery;
  try {
    discovery = await generateConditionDiscovery({
      stats: analysis.stats,
      samples: pickSamples(analysis.records),
      currentRules: CURRENT_RULES_SUMMARY
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "AI error" },
      { status: 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    stats: analysis.stats,
    discovery,
    forwardBarsAvailable: analysis.forwardBarsAvailable,
    signalCount: analysis.signalCount,
    tradeCount: analysis.tradeCount
  });
}
