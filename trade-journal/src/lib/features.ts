import { lastClosedBarIndex } from "@/lib/barSelection";
import { rsiLast } from "@/lib/indicators";
import { roundRatio } from "@/lib/compaction";
import type { CompactBar, SignalFeatures } from "@/lib/types";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MOMENTUM_5M_LOOKBACK = 6; // 6本 = 30分

/** epochSec を JST の {hour, minute, weekday(0=月)} に変換 */
function jstParts(epochSec: number): { hour: number; minute: number; weekday: number; dateKey: string } {
  const d = new Date(epochSec * 1000 + JST_OFFSET_MS);
  const day = d.getUTCDay();
  const weekday = (day + 6) % 7;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return {
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday,
    dateKey: `${y}-${m}-${dd}`
  };
}

export function sessionBucket(hour: number): string {
  if (hour >= 9 && hour < 11) return "morning";
  if (hour >= 11 && hour < 13) return "midday";
  if (hour >= 13 && hour < 15) return "afternoon";
  if (hour >= 15 && hour < 18) return "evening";
  return "night";
}

function lastClosedIndex5m(bars: CompactBar[], nowSec: number): number {
  return lastClosedBarIndex(bars, 5, nowSec);
}

/** 5分足小窓から本日JSTセッションVWAPを算出（出来高ありの足のみ）。 */
function sessionVwap5m(bars: CompactBar[], throughIdx: number): number | null {
  const todayKey = jstParts(Math.floor(Date.now() / 1000)).dateKey;
  const windows: [number, number][] = [
    [9 * 60, 15 * 60 + 45],
    [8 * 60, 16 * 60],
    [0, 24 * 60 - 1]
  ];
  let sumPv = 0;
  let sumV = 0;
  for (let i = 0; i <= throughIdx; i++) {
    const b = bars[i];
    const p = jstParts(b[0]);
    if (p.dateKey !== todayKey) continue;
    const mins = p.hour * 60 + p.minute;
    if (!windows.some(([s, e]) => mins >= s && mins <= e)) continue;
    const vol = b[5] ?? 0;
    if (vol <= 0) continue;
    const typical = (b[2] + b[3] + b[4]) / 3;
    sumPv += typical * vol;
    sumV += vol;
  }
  return sumV > 0 ? sumPv / sumV : null;
}

export interface FeatureInput {
  barTimeEpochSec: number;
  close: number;
  prevHigh?: number | null;
  prevLow?: number | null;
  ma20?: number | null;
  atr15?: number | null;
  longThreshold?: number | null;
  shortThreshold?: number | null;
  close1h?: number | null;
  ema20_1h?: number | null;
  ema50_1h?: number | null;
  ohlc15?: CompactBar[] | null;
  ohlc5?: CompactBar[] | null;
}

/** スナップショットから現行アラート条件以外も含む拡張特徴量を導出する。 */
export function buildFeatures(input: FeatureInput): SignalFeatures {
  const f: SignalFeatures = {};
  const { close, atr15, ma20, ema20_1h, ema50_1h } = input;

  if (ema20_1h != null && ema50_1h != null && ema50_1h !== 0) {
    f.emaSpreadPct1h = roundRatio(((ema20_1h - ema50_1h) / ema50_1h) * 100);
  }
  if (ma20 != null && ma20 !== 0) {
    f.ma20DeviationPct = roundRatio(((close - ma20) / ma20) * 100);
  }
  if (atr15 != null && close !== 0) {
    f.atrPct = roundRatio((atr15 / close) * 100);
  }
  if (atr15 != null && atr15 > 0) {
    if (input.longThreshold != null) f.distToLongThrAtr = roundRatio((input.longThreshold - close) / atr15);
    if (input.shortThreshold != null) f.distToShortThrAtr = roundRatio((close - input.shortThreshold) / atr15);
  }
  if (input.prevHigh != null && input.prevLow != null) {
    f.prevRange = roundRatio(input.prevHigh - input.prevLow);
  }

  const parts = jstParts(input.barTimeEpochSec);
  f.sessionBucket = sessionBucket(parts.hour);
  f.weekday = parts.weekday;

  if (input.ohlc15 && input.ohlc15.length >= 15) {
    const closes = input.ohlc15.map((b) => b[4]);
    f.rsi14 = roundRatio(rsiLast(closes, 14));
  }

  if (f.atrPct != null) {
    f.atrRegime = f.atrPct < 0.15 ? "low" : f.atrPct < 0.3 ? "mid" : "high";
  }

  // 5分足由来（最小セット: モメンタム + VWAP乖離）
  if (input.ohlc5 && input.ohlc5.length >= 2) {
    const nowSec = input.barTimeEpochSec;
    const idx = lastClosedIndex5m(input.ohlc5, nowSec);
    const lastClose = input.ohlc5[idx][4];
    const prevIdx = idx - MOMENTUM_5M_LOOKBACK;
    if (prevIdx >= 0) {
      const prevClose = input.ohlc5[prevIdx][4];
      if (prevClose > 0) {
        f.momentum5mPct = roundRatio(((lastClose - prevClose) / prevClose) * 100);
      }
    }
    const vwap = sessionVwap5m(input.ohlc5, idx);
    if (vwap != null && vwap !== 0) {
      f.vwapDeviation5mPct = roundRatio(((lastClose - vwap) / vwap) * 100);
    }
  }

  return f;
}
