import type { CompactBar } from "@/lib/types";

/**
 * 日経データの取得（Yahoo Finance Chart API）。
 * market-alert/api/cron.py と同一のデータソース・シンボル候補を使う。
 * 取得した足は「古い順」の CompactBar 配列に正規化する。
 */

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_HTTP_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*"
};
const YAHOO_NIKKEI_CANDIDATES = ["NIY=F", "^N225"];

function symbolCandidates(): string[] {
  const explicit = (process.env.NIKKEI_SYMBOL ?? "").trim();
  const list = explicit ? [explicit] : [];
  for (const s of YAHOO_NIKKEI_CANDIDATES) if (!list.includes(s)) list.push(s);
  return list;
}

async function fetchYahooChart(
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
        indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }[] };
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

/** 15分足を取得（候補シンボルを順に試す）。失敗時は例外。 */
export async function fetch15mBars(range = "1mo"): Promise<{ symbol: string; bars: CompactBar[] }> {
  let lastErr: unknown = null;
  for (const sym of symbolCandidates()) {
    try {
      const bars = await fetchYahooChart(sym, "15m", range);
      return { symbol: sym, bars };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Yahoo fetch failed");
}

/** 1時間足を取得（候補シンボルを順に試す）。 */
export async function fetch1hBars(range = "1mo"): Promise<{ symbol: string; bars: CompactBar[] }> {
  let lastErr: unknown = null;
  for (const sym of symbolCandidates()) {
    try {
      const bars = await fetchYahooChart(sym, "60m", range);
      return { symbol: sym, bars };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Yahoo 1h fetch failed");
}

/** 指定の barTime（epochSec）より後の15分足だけを返す（前方足＝結果評価用）。 */
export function forwardBarsAfter(bars: CompactBar[], afterEpochSec: number, maxBars: number): CompactBar[] {
  return bars.filter((b) => b[0] > afterEpochSec).slice(0, maxBars);
}
