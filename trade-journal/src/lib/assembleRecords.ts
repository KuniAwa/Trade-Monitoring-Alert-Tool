import { prisma } from "@/lib/prisma";
import { buildSignalRecords, type SignalLike } from "@/lib/signalAnalysis";
import { ensureSignalFeatures } from "@/lib/signalFeatureRead";
import { aggregateStats, type StatRecord, type StatsSummary } from "@/lib/stats";
import type { Direction } from "@/lib/types";

export interface AssembledAnalysis {
  stats: StatsSummary;
  records: StatRecord[];
  forwardBarsAvailable: boolean;
  signalCount: number;
  tradeCount: number;
}

/**
 * 直近のシグナル（仮想）と実取引を1つの母数にまとめ、集計する。
 * lookbackDays 以内を対象（結果ラベルは Yahoo の前方足が取れる範囲のみ算出）。
 */
export async function assembleAnalysis(lookbackDays = 35): Promise<AssembledAnalysis> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const signals = (await prisma.signal.findMany({
    where: { barTime: { gte: since } },
    orderBy: { barTime: "desc" },
    take: 2000
  })) as unknown as SignalLike[];

  const { records: signalRecords, forwardBarsAvailable } = await buildSignalRecords(signals);

  const trades = await prisma.trade.findMany({
    where: { entryAt: { gte: since } },
    orderBy: { entryAt: "desc" },
    take: 1000,
    include: { signal: true }
  });

  const tradeRecords: StatRecord[] = trades.map((t) => {
    const dir = t.direction as Direction;
    const sig = t.signal;
    return {
      direction: dir,
      isRealTrade: true,
      rMultiple: t.rMultiple,
      oshiritsu: sig ? (dir === "long" ? sig.oshiritsuLong : sig.oshiritsuShort) : null,
      trendUp: sig?.trendUp ?? false,
      trendDown: sig?.trendDown ?? false,
      volumeRatio: sig?.volumeRatio ?? null,
      features: sig ? ensureSignalFeatures(sig) : null,
      outcome: null
    };
  });

  const records = [...tradeRecords, ...signalRecords];
  return {
    stats: aggregateStats(records),
    records,
    forwardBarsAvailable,
    signalCount: signals.length,
    tradeCount: trades.length
  };
}
