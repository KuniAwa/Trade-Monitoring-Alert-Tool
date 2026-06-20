/**
 * テクニカル指標の計算。すべて「古い順（index 0 が最古）」の配列を入力に取る。
 * market-alert (cron.py) と同じ系列（OHLC・出来高）から算出できるものに限定する。
 */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const alpha = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  seed /= period;
  out[period - 1] = seed;
  let prev = seed;
  for (let i = period; i < values.length; i++) {
    prev = alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

/** Wilder ATR。TR は前足終値参照。 */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n === 0 || period <= 0) return out;
  const tr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      tr[i] = highs[i] - lows[i];
    } else {
      const pc = closes[i - 1];
      tr[i] = Math.max(highs[i] - lows[i], Math.abs(highs[i] - pc), Math.abs(lows[i] - pc));
    }
  }
  if (n < period + 1) return out;
  let first = 0;
  for (let i = 1; i <= period; i++) first += tr[i];
  first /= period;
  out[period] = first;
  let prev = first;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

/** Wilder RSI。直近値（最新の確定値）を返す。データ不足時は null。 */
export function rsiLast(closes: number[], period = 14): number | null {
  const n = closes.length;
  if (n < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** MACD（最新の確定値）。data不足時は null を含むオブジェクト。 */
export function macdLast(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: number | null; signal: number | null; hist: number | null } {
  if (closes.length < slow + signal) return { macd: null, signal: null, hist: null };
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const f = emaFast[i];
    const s = emaSlow[i];
    macdLine.push(f != null && s != null ? f - s : 0);
  }
  const startIdx = slow - 1;
  const macdValid = macdLine.slice(startIdx);
  const signalSeries = ema(macdValid, signal);
  const lastMacd = macdValid[macdValid.length - 1] ?? null;
  const lastSignal = signalSeries[signalSeries.length - 1] ?? null;
  const hist = lastMacd != null && lastSignal != null ? lastMacd - lastSignal : null;
  return { macd: lastMacd, signal: lastSignal, hist };
}

/** ボリンジャーバンド幅(%)（最新値）= (上限-下限)/中央。 */
export function bollingerWidthPct(closes: number[], period = 20, mult = 2): number | null {
  if (closes.length < period) return null;
  const window = closes.slice(closes.length - period);
  const mean = window.reduce((a, b) => a + b, 0) / period;
  const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  if (mean === 0) return null;
  return ((2 * mult * sd) / mean) * 100;
}
