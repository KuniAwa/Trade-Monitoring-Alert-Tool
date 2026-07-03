/**
 * 日経先物の現時点スナップショット（market-alert の build_snapshot と同一ロジック）。
 * DBには保存せず、表示・更新ボタン押下時に Yahoo から都度取得する。
 */

import { atr, ema, sma } from "@/lib/indicators";
import {
  barLagMinutes,
  lastClosedBarIndex,
  staleDataWarningJa
} from "@/lib/barSelection";
import type { CompactBar } from "@/lib/types";

const INTERVAL_1H = 60;
const INTERVAL_15M = 15;
const INTERVAL_5M = 5;

const EMA_FAST_1H = 20;
const EMA_SLOW_1H = 50;
/** 15分足トレンド（執行タイミング用・1時間足より短い期間） */
const EMA_FAST_15M = 9;
const EMA_SLOW_15M = 21;
const ATR_PERIOD_15 = 14;
const BREAKOUT_ATR_MULT = 0.2;
const BREAKOUT_RECENT_15M_BARS = 128;

/** 5分足の短期指標（表示パネル専用・DB保存なし） */
export interface NikkeiFiveMinMetrics {
  barTimeJst: string;
  close: number;
  ma20: number | null;
  atr14: number | null;
  vwap: number | null;
  vwapLabel: string;
}

export interface NikkeiMarketSnapshot {
  symbol: string;
  barTimeJst: string;
  fetchedAtJst: string;
  close: number;
  /** 5分足の短期指標（取得失敗時は null） */
  fiveMin: NikkeiFiveMinMetrics | null;
  ma20_15m: number | null;
  atr15: number | null;
  /** 本日JSTセッションのVWAP（出来高ありの足のみ。^N225等は null） */
  vwap: number | null;
  vwapLabel: string;
  longThreshold: number | null;
  shortThreshold: number | null;
  firstBreakLong: boolean;
  firstBreakShort: boolean;
  prevHigh: number | null;
  prevLow: number | null;
  prevHlLabel: string;
  close1h: number | null;
  ema20_1h: number | null;
  ema50_1h: number | null;
  trend1hJa: string;
  trend1hUp: boolean;
  trend1hDown: boolean;
  close15m: number | null;
  emaFast15m: number | null;
  emaSlow15m: number | null;
  emaFast15mPeriod: number;
  emaSlow15mPeriod: number;
  trend15mJa: string;
  trend15mUp: boolean;
  trend15mDown: boolean;
  oshiritsuLong: number | null;
  oshiritsuShort: number | null;
  breakoutHigh: number | null;
  breakoutLow: number | null;
  /** 判定足が取得時刻より大幅に古い場合の警告（Yahoo 欠損など） */
  staleDataWarning: string | null;
}

function jstParts(epochSec: number): { y: number; m: number; d: number; h: number; min: number; wd: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  });
  const parts = fmt.formatToParts(new Date(epochSec * 1000));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    h: Number(get("hour")),
    min: Number(get("minute")),
    wd: wdMap[get("weekday")] ?? 0
  };
}

function dateKey(p: ReturnType<typeof jstParts>): string {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function prevBusinessDayJst(todayKey: string): string {
  const [y, m, d] = todayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  while (dt.getUTCDay() === 0 || dt.getUTCDay() === 6) {
    dt.setUTCDate(dt.getUTCDate() - 1);
  }
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function sessionHighLowFrom15m(bars: CompactBar[], sessionDateKey: string): { high: number; low: number } | null {
  const windows: [number, number][] = [
    [9 * 60, 15 * 60 + 45],
    [8 * 60, 16 * 60],
    [0, 24 * 60 - 1]
  ];
  for (const [startMin, endMin] of windows) {
    const highs: number[] = [];
    const lows: number[] = [];
    for (const b of bars) {
      const p = jstParts(b[0]);
      if (dateKey(p) !== sessionDateKey) continue;
      const mins = p.h * 60 + p.min;
      if (mins < startMin || mins > endMin) continue;
      if (b[2] > 0) highs.push(b[2]);
      if (b[3] > 0) lows.push(b[3]);
    }
    if (highs.length && lows.length) return { high: Math.max(...highs), low: Math.min(...lows) };
  }
  return null;
}

function computePrevSessionHl(bars15: CompactBar[]): { high: number; low: number } | null {
  const todayKey = dateKey(jstParts(Math.floor(Date.now() / 1000)));
  const dates = new Set<string>();
  for (const b of bars15) {
    const k = dateKey(jstParts(b[0]));
    if (k < todayKey) dates.add(k);
  }
  const candidates = [...dates].sort().reverse();
  if (!candidates.length) candidates.push(prevBusinessDayJst(todayKey));
  for (const dk of candidates) {
    const hl = sessionHighLowFrom15m(bars15, dk);
    if (hl) return hl;
  }
  return null;
}

function trendEmaSlope(
  bars: CompactBar[],
  emaFastPeriod: number,
  emaSlowPeriod: number,
  intervalMinutes: number,
  nowSec: number
): {
  up: boolean;
  down: boolean;
  close: number | null;
  emaFast: number | null;
  emaSlow: number | null;
} {
  const n = bars.length;
  const L = lastClosedBarIndex(bars, intervalMinutes, nowSec);
  if (n < 3 || L < emaSlowPeriod - 1 || L < 2) {
    return { up: false, down: false, close: null, emaFast: null, emaSlow: null };
  }
  const closes = bars.map((b) => b[4]);
  const emaFastSeries = ema(closes, emaFastPeriod);
  const emaSlowSeries = ema(closes, emaSlowPeriod);
  const c = closes[L];
  const eFast = emaFastSeries[L];
  const eSlow = emaSlowSeries[L];
  const eFastM1 = emaFastSeries[L - 1];
  const eFastM2 = emaFastSeries[L - 2];
  if (c <= 0 || eFast == null || eSlow == null || eFastM1 == null || eFastM2 == null) {
    return { up: false, down: false, close: c, emaFast: eFast, emaSlow: eSlow };
  }
  const upStack = c > eFast && eFast > eSlow;
  const downStack = c < eFast && eFast < eSlow;
  const slopeUp = eFast > eFastM1 && eFastM1 > eFastM2;
  const slopeDown = eFast < eFastM1 && eFastM1 < eFastM2;
  return {
    up: upStack && slopeUp,
    down: downStack && slopeDown,
    close: c,
    emaFast: eFast,
    emaSlow: eSlow
  };
}

function trendJa(up: boolean, down: boolean): string {
  if (up) return "上昇（EMA順位+傾きOK）";
  if (down) return "下降（EMA順位+傾きOK）";
  return "中立/レンジ寄り";
}

function sessionVwapAtBar(bars: CompactBar[], throughIdx: number): number | null {
  const todayKey = dateKey(jstParts(Math.floor(Date.now() / 1000)));
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
    if (dateKey(p) !== todayKey) continue;
    const mins = p.h * 60 + p.min;
    const inWindow = windows.some(([s, e]) => mins >= s && mins <= e);
    if (!inWindow) continue;
    const vol = b[5] ?? 0;
    if (vol <= 0) continue;
    const typical = (b[2] + b[3] + b[4]) / 3;
    sumPv += typical * vol;
    sumV += vol;
  }
  return sumV > 0 ? sumPv / sumV : null;
}

function atrAtLastClosed(
  bars: CompactBar[],
  intervalMinutes: number,
  nowSec: number,
  period = ATR_PERIOD_15
): number | null {
  if (bars.length < period + 3) return null;
  const highs = bars.map((b) => b[2]);
  const lows = bars.map((b) => b[3]);
  const closes = bars.map((b) => b[4]);
  const atrList = atr(highs, lows, closes, period);
  const idx = lastClosedBarIndex(bars, intervalMinutes, nowSec);
  if (idx < 0) return null;
  const v = atrList[idx];
  return v != null && v > 0 ? v : null;
}

/** 5分足から短期指標を算出（表示パネル専用）。 */
export function buildFiveMinMetrics(bars5: CompactBar[], nowSec?: number): NikkeiFiveMinMetrics | null {
  const now = nowSec ?? Math.floor(Date.now() / 1000);
  const n = bars5.length;
  if (n < 2) return null;
  const idx = lastClosedBarIndex(bars5, INTERVAL_5M, now);
  const bar = bars5[idx];
  const close = bar[4];
  if (close <= 0) return null;

  const closes = bars5.map((b) => b[4]);
  const ma20 = sma(closes, 20)[idx];
  const atr14 = atrAtLastClosed(bars5, INTERVAL_5M, now);
  const vwap = sessionVwapAtBar(bars5, idx);

  return {
    barTimeJst: fmtJstFromEpoch(bar[0]),
    close,
    ma20,
    atr14,
    vwap,
    vwapLabel: "本日JSTセッションVWAP（5分足）"
  };
}

function longOshiritsu(
  bars15: CompactBar[],
  breakoutLevel: number,
  currentClose: number,
  nowSec: number
): { pct: number | null; breakoutHigh: number | null } {
  const n = bars15.length;
  const endIdx = lastClosedBarIndex(bars15, INTERVAL_15M, nowSec);
  if (endIdx < 0) return { pct: null, breakoutHigh: null };
  let lastBelow: number | null = null;
  for (let i = endIdx; i >= 0; i--) {
    if (bars15[i][4] <= breakoutLevel) {
      lastBelow = i;
      break;
    }
  }
  let breakIdx: number | null = null;
  if (lastBelow != null) breakIdx = lastBelow + 1;
  else {
    const ws = Math.max(0, endIdx - BREAKOUT_RECENT_15M_BARS);
    for (let i = ws; i <= endIdx; i++) {
      if (bars15[i][2] > breakoutLevel) {
        breakIdx = i;
        break;
      }
    }
  }
  if (breakIdx == null || breakIdx > endIdx) return { pct: null, breakoutHigh: null };
  const highs = bars15.slice(breakIdx, endIdx + 1).map((b) => b[2]);
  const breakoutHigh = Math.max(...highs);
  const denom = breakoutHigh - breakoutLevel;
  if (denom <= 0) return { pct: null, breakoutHigh };
  return { pct: ((breakoutHigh - currentClose) / denom) * 100, breakoutHigh };
}

function shortOshiritsu(
  bars15: CompactBar[],
  breakoutLevel: number,
  currentClose: number,
  nowSec: number
): { pct: number | null; breakoutLow: number | null } {
  const n = bars15.length;
  const endIdx = lastClosedBarIndex(bars15, INTERVAL_15M, nowSec);
  if (endIdx < 0) return { pct: null, breakoutLow: null };
  let lastAbove: number | null = null;
  for (let i = endIdx; i >= 0; i--) {
    if (bars15[i][4] >= breakoutLevel) {
      lastAbove = i;
      break;
    }
  }
  let breakIdx: number | null = null;
  if (lastAbove != null) breakIdx = lastAbove + 1;
  else {
    const ws = Math.max(0, endIdx - BREAKOUT_RECENT_15M_BARS);
    for (let i = ws; i <= endIdx; i++) {
      if (bars15[i][3] > 0 && bars15[i][3] < breakoutLevel) {
        breakIdx = i;
        break;
      }
    }
  }
  if (breakIdx == null || breakIdx > endIdx) return { pct: null, breakoutLow: null };
  const lows = bars15.slice(breakIdx, endIdx + 1).map((b) => b[3]);
  const breakoutLow = Math.min(...lows);
  const denom = breakoutLevel - breakoutLow;
  if (denom <= 0) return { pct: null, breakoutLow };
  return { pct: ((currentClose - breakoutLow) / denom) * 100, breakoutLow };
}

function fmtJstFromEpoch(epochSec: number): string {
  const s = new Date(epochSec * 1000).toLocaleString("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${s} JST`;
}

export function buildNikkeiMarketSnapshot(
  symbol: string,
  bars15: CompactBar[],
  bars1h: CompactBar[],
  bars5?: CompactBar[]
): NikkeiMarketSnapshot | null {
  const fetchedAtSec = Math.floor(Date.now() / 1000);
  const n = bars15.length;
  if (n < 2) return null;
  const idx = lastClosedBarIndex(bars15, INTERVAL_15M, fetchedAtSec);
  if (idx < 0) return null;
  const bar = bars15[idx];
  const close = bar[4];
  if (close <= 0) return null;

  const prevHl = computePrevSessionHl(bars15);
  if (!prevHl || prevHl.high <= 0 || prevHl.low <= 0) return null;

  const closes15 = bars15.map((b) => b[4]);
  const smaList = sma(closes15, 20);
  const ma20 = smaList[idx];

  const atr15 = atrAtLastClosed(bars15, INTERVAL_15M, fetchedAtSec);
  const buf = atr15 && atr15 > 0 ? BREAKOUT_ATR_MULT * atr15 : 0;
  const longThreshold = prevHl.high + buf;
  const shortThreshold = prevHl.low - buf;

  const prevIdx = idx >= 1 ? idx - 1 : null;
  const prevClose = prevIdx != null ? bars15[prevIdx][4] : null;
  const firstBreakLong =
    prevClose != null && prevClose <= longThreshold && close > longThreshold;
  const firstBreakShort =
    prevClose != null && prevClose >= shortThreshold && close < shortThreshold;

  const trend1h = trendEmaSlope(bars1h, EMA_FAST_1H, EMA_SLOW_1H, INTERVAL_1H, fetchedAtSec);
  const trend15m = trendEmaSlope(bars15, EMA_FAST_15M, EMA_SLOW_15M, INTERVAL_15M, fetchedAtSec);

  const longO = longOshiritsu(bars15, prevHl.high, close, fetchedAtSec);
  const shortO = shortOshiritsu(bars15, prevHl.low, close, fetchedAtSec);
  const vwap = sessionVwapAtBar(bars15, idx);

  const fiveMin = bars5?.length ? buildFiveMinMetrics(bars5, fetchedAtSec) : null;

  const lag15 = barLagMinutes(bar[0], INTERVAL_15M, fetchedAtSec);
  const warn15 = staleDataWarningJa(lag15, "15分足");
  const lag5 =
    fiveMin && bars5?.length
      ? barLagMinutes(
          bars5[lastClosedBarIndex(bars5, INTERVAL_5M, fetchedAtSec)][0],
          INTERVAL_5M,
          fetchedAtSec
        )
      : 0;
  const warn5 = fiveMin ? staleDataWarningJa(lag5, "5分足") : null;
  const staleDataWarning =
    [warn15, warn5].filter(Boolean).join(" ") || null;

  return {
    symbol,
    barTimeJst: fmtJstFromEpoch(bar[0]),
    fetchedAtJst: fmtJstFromEpoch(fetchedAtSec),
    close,
    fiveMin,
    ma20_15m: ma20,
    atr15,
    vwap,
    vwapLabel: "本日JSTセッションVWAP",
    longThreshold,
    shortThreshold,
    firstBreakLong,
    firstBreakShort,
    prevHigh: prevHl.high,
    prevLow: prevHl.low,
    prevHlLabel: "前営業日・JST日中セッション高安",
    close1h: trend1h.close,
    ema20_1h: trend1h.emaFast,
    ema50_1h: trend1h.emaSlow,
    trend1hJa: trendJa(trend1h.up, trend1h.down),
    trend1hUp: trend1h.up,
    trend1hDown: trend1h.down,
    close15m: trend15m.close,
    emaFast15m: trend15m.emaFast,
    emaSlow15m: trend15m.emaSlow,
    emaFast15mPeriod: EMA_FAST_15M,
    emaSlow15mPeriod: EMA_SLOW_15M,
    trend15mJa: trendJa(trend15m.up, trend15m.down),
    trend15mUp: trend15m.up,
    trend15mDown: trend15m.down,
    oshiritsuLong: longO.pct != null ? Math.round(longO.pct * 10) / 10 : null,
    oshiritsuShort: shortO.pct != null ? Math.round(shortO.pct * 10) / 10 : null,
    breakoutHigh: longO.breakoutHigh,
    breakoutLow: shortO.breakoutLow,
    staleDataWarning
  };
}
