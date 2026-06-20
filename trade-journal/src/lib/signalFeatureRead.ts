import { buildFeatures } from "@/lib/features";
import type { CompactBar, SignalFeatures } from "@/lib/types";

interface SignalRow {
  barTime: Date;
  close: number;
  prevHigh: number | null;
  prevLow: number | null;
  ma20: number | null;
  atr15: number | null;
  longThreshold: number | null;
  shortThreshold: number | null;
  close1h: number | null;
  ema20_1h: number | null;
  ema50_1h: number | null;
  featuresJson: unknown;
  ohlc15Json: unknown;
}

/** 保存済み featuresJson があればそれを、無ければ再計算して返す。 */
export function ensureSignalFeatures(s: SignalRow): SignalFeatures {
  if (s.featuresJson && typeof s.featuresJson === "object") {
    return s.featuresJson as SignalFeatures;
  }
  const ohlc = Array.isArray(s.ohlc15Json) ? (s.ohlc15Json as CompactBar[]) : null;
  return buildFeatures({
    barTimeEpochSec: Math.floor(s.barTime.getTime() / 1000),
    close: s.close,
    prevHigh: s.prevHigh,
    prevLow: s.prevLow,
    ma20: s.ma20,
    atr15: s.atr15,
    longThreshold: s.longThreshold,
    shortThreshold: s.shortThreshold,
    close1h: s.close1h,
    ema20_1h: s.ema20_1h,
    ema50_1h: s.ema50_1h,
    ohlc15: ohlc
  });
}
