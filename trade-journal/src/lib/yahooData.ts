import type { CompactBar } from "@/lib/types";

/**
 * Yahoo Finance Chart API から OHLC を取得する共通層。
 * 日経・FX とも同じエンドポイントを使う。
 */

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_HTTP_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*"
};

export async function fetchYahooChart(
  symbol: string,
  interval: string,
  range: string
): Promise<CompactBar[]> {
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: YAHOO_HTTP_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);
  const payload = (await res.json()) as {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: {
          quote?: {
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }[];
        };
      }[];
    };
  };
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0] ?? {};
  const opens = quote.open ?? [];
  const highs = quote.high ?? [];
  const lows = quote.low ?? [];
  const closes = quote.close ?? [];
  const volumes = quote.volume ?? [];
  const bars: CompactBar[] = [];
  const n = Math.min(timestamps.length, opens.length, highs.length, lows.length, closes.length);
  for (let i = 0; i < n; i++) {
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    if (o == null || h == null || l == null || c == null) continue;
    const v = volumes[i] ?? 0;
    bars.push([timestamps[i], o, h, l, c, v ?? 0]);
  }
  if (!bars.length) throw new Error(`No valid bars from Yahoo for ${symbol}`);
  return bars;
}

export async function fetchBarsForSymbol(
  symbol: string,
  interval: string,
  range: string
): Promise<{ symbol: string; bars: CompactBar[] }> {
  const bars = await fetchYahooChart(symbol, interval, range);
  return { symbol, bars };
}

/** 指定の barTime（epochSec）より後の足だけを返す（前方足＝結果評価用）。 */
export function forwardBarsAfter(bars: CompactBar[], afterEpochSec: number, maxBars: number): CompactBar[] {
  return bars.filter((b) => b[0] > afterEpochSec).slice(0, maxBars);
}
