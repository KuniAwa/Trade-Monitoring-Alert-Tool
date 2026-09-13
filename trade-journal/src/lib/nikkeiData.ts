import { NIKKEI_YAHOO_DEFAULT } from "@/lib/markets";
import { fetchYahooChart, forwardBarsAfter } from "@/lib/yahooData";
import type { CompactBar } from "@/lib/types";

/**
 * 日経データの取得（Yahoo Finance Chart API）。
 * 候補シンボルを順に試すラッパー。汎用取得は yahooData.ts。
 */

const YAHOO_NIKKEI_CANDIDATES = ["NIY=F", "^N225"];

function symbolCandidates(): string[] {
  const explicit = (process.env.NIKKEI_SYMBOL ?? "").trim();
  const list = explicit ? [explicit] : [];
  for (const s of YAHOO_NIKKEI_CANDIDATES) if (!list.includes(s)) list.push(s);
  return list.length ? list : [NIKKEI_YAHOO_DEFAULT];
}

async function fetchFirstAvailable(
  interval: string,
  range: string
): Promise<{ symbol: string; bars: CompactBar[] }> {
  let lastErr: unknown = null;
  for (const sym of symbolCandidates()) {
    try {
      const bars = await fetchYahooChart(sym, interval, range);
      return { symbol: sym, bars };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Yahoo fetch failed");
}

export async function fetch15mBars(range = "1mo"): Promise<{ symbol: string; bars: CompactBar[] }> {
  return fetchFirstAvailable("15m", range);
}

export async function fetch5mBars(range = "5d"): Promise<{ symbol: string; bars: CompactBar[] }> {
  return fetchFirstAvailable("5m", range);
}

export async function fetch1hBars(range = "1mo"): Promise<{ symbol: string; bars: CompactBar[] }> {
  return fetchFirstAvailable("60m", range);
}

export { forwardBarsAfter };
