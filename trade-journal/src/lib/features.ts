import { rsiLast } from "@/lib/indicators";
import type { CompactBar, SignalFeatures } from "@/lib/types";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** epochSec を JST の {hour, minute, weekday(0=月)} に変換 */
function jstParts(epochSec: number): { hour: number; minute: number; weekday: number } {
  const d = new Date(epochSec * 1000 + JST_OFFSET_MS);
  // getUTC* を使うことで JST シフト済みの値をそのまま読む
  const day = d.getUTCDay(); // 0=日
  const weekday = (day + 6) % 7; // 0=月
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), weekday };
}

export function sessionBucket(hour: number): string {
  if (hour >= 9 && hour < 11) return "morning"; // 寄り〜前場
  if (hour >= 11 && hour < 13) return "midday"; // 昼休み近辺
  if (hour >= 13 && hour < 15) return "afternoon"; // 後場
  if (hour >= 15 && hour < 18) return "evening"; // 引け後〜夕方
  return "night"; // ナイトセッション
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
}

/** スナップショットから現行アラート条件以外も含む拡張特徴量を導出する。 */
export function buildFeatures(input: FeatureInput): SignalFeatures {
  const f: SignalFeatures = {};
  const { close, atr15, ma20, ema20_1h, ema50_1h } = input;

  if (ema20_1h != null && ema50_1h != null && ema50_1h !== 0) {
    f.emaSpreadPct1h = ((ema20_1h - ema50_1h) / ema50_1h) * 100;
  }
  if (ma20 != null && ma20 !== 0) {
    f.ma20DeviationPct = ((close - ma20) / ma20) * 100;
  }
  if (atr15 != null && close !== 0) {
    f.atrPct = (atr15 / close) * 100;
  }
  if (atr15 != null && atr15 > 0) {
    if (input.longThreshold != null) f.distToLongThrAtr = (input.longThreshold - close) / atr15;
    if (input.shortThreshold != null) f.distToShortThrAtr = (close - input.shortThreshold) / atr15;
  }
  if (input.prevHigh != null && input.prevLow != null) {
    f.prevRange = input.prevHigh - input.prevLow;
  }

  const parts = jstParts(input.barTimeEpochSec);
  f.sessionBucket = sessionBucket(parts.hour);
  f.weekday = parts.weekday;

  // RSI は小窓があれば算出
  if (input.ohlc15 && input.ohlc15.length >= 15) {
    const closes = input.ohlc15.map((b) => b[4]);
    f.rsi14 = rsiLast(closes, 14);
  }

  // ATRレジームは atrPct の絶対水準で粗く分類
  if (f.atrPct != null) {
    f.atrRegime = f.atrPct < 0.15 ? "low" : f.atrPct < 0.3 ? "mid" : "high";
  }

  return f;
}
