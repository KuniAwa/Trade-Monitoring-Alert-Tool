import type { Direction, OutcomeLabel, SignalFeatures } from "@/lib/types";

export interface StatRecord {
  direction: Direction;
  /** 実取引なら true（仮想シグナルは false） */
  isRealTrade: boolean;
  rMultiple?: number | null;
  oshiritsu?: number | null;
  trendUp?: boolean;
  trendDown?: boolean;
  volumeRatio?: number | null;
  features?: SignalFeatures | null;
  outcome?: OutcomeLabel | null;
}

export interface BucketStat {
  bucket: string;
  count: number;
  winRate: number | null;
  avgForwardReturn: number | null;
  avgR: number | null;
  hit1RRate: number | null;
  hit2RRate: number | null;
  stopFirstRate: number | null;
}

export interface StatsSummary {
  total: number;
  realTradeCount: number;
  virtualCount: number;
  overall: BucketStat;
  byDirection: BucketStat[];
  bySession: BucketStat[];
  byAtrRegime: BucketStat[];
  byTrendAlignment: BucketStat[];
  byOshiritsuBand: BucketStat[];
  byWeekday: BucketStat[];
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function rate(flags: (boolean | null | undefined)[]): number | null {
  const valid = flags.filter((x): x is boolean => typeof x === "boolean");
  if (!valid.length) return null;
  return valid.filter(Boolean).length / valid.length;
}

function summarizeBucket(bucket: string, records: StatRecord[]): BucketStat {
  const forwardReturns = records
    .map((r) => r.outcome?.forwardReturn)
    .filter((x): x is number => typeof x === "number");
  const rValues = records.map((r) => r.rMultiple).filter((x): x is number => typeof x === "number");
  const winFlags = records.map((r) => {
    const fr = r.outcome?.forwardReturn;
    if (typeof r.rMultiple === "number") return r.rMultiple > 0;
    if (typeof fr === "number") return fr > 0;
    return null;
  });
  return {
    bucket,
    count: records.length,
    winRate: rate(winFlags),
    avgForwardReturn: avg(forwardReturns),
    avgR: avg(rValues),
    hit1RRate: rate(records.map((r) => r.outcome?.hit1R)),
    hit2RRate: rate(records.map((r) => r.outcome?.hit2R)),
    stopFirstRate: rate(records.map((r) => r.outcome?.hitStopFirst))
  };
}

function groupBy(records: StatRecord[], keyFn: (r: StatRecord) => string | null): BucketStat[] {
  const map = new Map<string, StatRecord[]>();
  for (const r of records) {
    const k = keyFn(r);
    if (k == null) continue;
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return Array.from(map.entries())
    .map(([k, rs]) => summarizeBucket(k, rs))
    .sort((a, b) => b.count - a.count);
}

function oshiritsuBand(v: number | null | undefined): string | null {
  if (v == null) return null;
  if (v < 20) return "0-20%";
  if (v < 33) return "20-33%";
  if (v < 50) return "33-50%";
  return "50%+";
}

const WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"];

export function aggregateStats(records: StatRecord[]): StatsSummary {
  return {
    total: records.length,
    realTradeCount: records.filter((r) => r.isRealTrade).length,
    virtualCount: records.filter((r) => !r.isRealTrade).length,
    overall: summarizeBucket("全体", records),
    byDirection: groupBy(records, (r) => (r.direction === "long" ? "ロング" : "ショート")),
    bySession: groupBy(records, (r) => r.features?.sessionBucket ?? null),
    byAtrRegime: groupBy(records, (r) => r.features?.atrRegime ?? null),
    byTrendAlignment: groupBy(records, (r) => {
      const aligned =
        (r.direction === "long" && r.trendUp) || (r.direction === "short" && r.trendDown);
      return aligned ? "1時間足トレンド一致" : "トレンド不一致/中立";
    }),
    byOshiritsuBand: groupBy(records, (r) => oshiritsuBand(r.oshiritsu)),
    byWeekday: groupBy(records, (r) => {
      const w = r.features?.weekday;
      return typeof w === "number" && w >= 0 && w < 7 ? WEEKDAY_JA[w] : null;
    })
  };
}
