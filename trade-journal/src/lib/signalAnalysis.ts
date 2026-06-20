import { buildFeatures } from "@/lib/features";
import { fetch15mBars, forwardBarsAfter } from "@/lib/nikkeiData";
import { computeOutcome } from "@/lib/outcome";
import type { StatRecord } from "@/lib/stats";
import type { CompactBar, Direction, OutcomeLabel, SignalFeatures } from "@/lib/types";

/** ATRストップ倍率（cron.py の STOP_ATR_MULT と揃える） */
const STOP_ATR_MULT = 1.5;
/** 結果評価に使う前方15分足の本数（既定16本＝約4時間） */
const FORWARD_BARS = 16;

export interface SignalLike {
  id: string;
  barTime: Date;
  source: string;
  alertDir: string | null;
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
  trendUp: boolean;
  trendDown: boolean;
  oshiritsuLong: number | null;
  oshiritsuShort: number | null;
  volumeRatio: number | null;
  featuresJson: unknown;
  ohlc15Json: unknown;
  outcomeJson: unknown;
}

/** シグナルの「想定方向」: アラート方向 → 無ければ1時間足トレンド。両方無ければ null。 */
export function signalDirection(s: SignalLike): Direction | null {
  if (s.alertDir === "long" || s.alertDir === "short") return s.alertDir;
  if (s.trendUp) return "long";
  if (s.trendDown) return "short";
  return null;
}

function riskWidthFor(s: SignalLike, dir: Direction): number | null {
  if (s.atr15 && s.atr15 > 0) return STOP_ATR_MULT * s.atr15;
  if (dir === "long" && s.prevHigh != null) return Math.abs(s.close - s.prevHigh) || null;
  if (dir === "short" && s.prevLow != null) return Math.abs(s.prevLow - s.close) || null;
  return null;
}

function ensureFeatures(s: SignalLike): SignalFeatures {
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

/**
 * シグナル群から StatRecord を構築する。
 * 結果ラベルは、保存済み outcomeJson を優先し、無ければ Yahoo の前方足から算出する。
 * Yahoo 取得は1回だけ行い使い回す（同一データソース）。
 */
export async function buildSignalRecords(signals: SignalLike[]): Promise<{
  records: StatRecord[];
  forwardBarsAvailable: boolean;
}> {
  let bars: CompactBar[] | null = null;
  let forwardBarsAvailable = false;
  try {
    const fetched = await fetch15mBars("1mo");
    bars = fetched.bars;
    forwardBarsAvailable = true;
  } catch {
    bars = null;
  }

  const records: StatRecord[] = [];
  for (const s of signals) {
    const dir = signalDirection(s);
    if (!dir) continue;
    const features = ensureFeatures(s);
    let outcome: OutcomeLabel | null =
      s.outcomeJson && typeof s.outcomeJson === "object" ? (s.outcomeJson as OutcomeLabel) : null;

    if (!outcome && bars) {
      const epoch = Math.floor(s.barTime.getTime() / 1000);
      const fwd = forwardBarsAfter(bars, epoch, FORWARD_BARS);
      if (fwd.length) {
        outcome = computeOutcome({
          direction: dir,
          basePrice: s.close,
          riskWidth: riskWidthFor(s, dir),
          forwardBars: fwd
        });
      }
    }

    records.push({
      direction: dir,
      isRealTrade: false,
      oshiritsu: dir === "long" ? s.oshiritsuLong : s.oshiritsuShort,
      trendUp: s.trendUp,
      trendDown: s.trendDown,
      volumeRatio: s.volumeRatio,
      features,
      outcome
    });
  }
  return { records, forwardBarsAvailable };
}
