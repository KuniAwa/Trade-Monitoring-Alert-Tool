import type { CompactBar, IngestPayload } from "@/lib/types";

/**
 * 容量削減ユーティリティ。
 * 仕様検討「2. DBの容量を減らす対策」を実装するための関数群。
 *  - 数値の丸め（保存精度を落とす）
 *  - 生OHLC窓の本数制限（直近 N 本のみ）
 *  - 生OHLCの保持日数（超過分は prune で null 化）
 */

/** 価格の保存桁数（日経は小数1桁、FXは小数3桁） */
const PRICE_DECIMALS_NIKKEI = 1;
const PRICE_DECIMALS_FX = 3;
/** 比率・指標の保存桁数 */
const RATIO_DECIMALS = 3;
/** スナップショットに保存する15分足の最大本数（容量削減） */
export const MAX_STORED_15M_BARS = 20;
/** スナップショットに保存する5分足の最大本数（容量削減） */
export const MAX_STORED_5M_BARS = 40;

export function roundTo(value: number | null | undefined, decimals: number): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function roundPrice(value: number | null | undefined, decimals = PRICE_DECIMALS_NIKKEI): number | null {
  return roundTo(value, decimals);
}

export function roundRatio(value: number | null | undefined): number | null {
  return roundTo(value, RATIO_DECIMALS);
}

/** OHLC 窓を「直近 N 本」に制限し、価格を丸め、出来高は整数化する。 */
export function compactBars(
  bars: CompactBar[] | undefined,
  maxBars = MAX_STORED_15M_BARS,
  priceDecimals = PRICE_DECIMALS_NIKKEI
): CompactBar[] | null {
  if (!bars || !bars.length) return null;
  const tail = bars.slice(Math.max(0, bars.length - maxBars));
  return tail.map(
    (b) =>
      [
        Math.round(b[0]),
        roundPrice(b[1], priceDecimals) ?? 0,
        roundPrice(b[2], priceDecimals) ?? 0,
        roundPrice(b[3], priceDecimals) ?? 0,
        roundPrice(b[4], priceDecimals) ?? 0,
        Math.round(b[5] ?? 0)
      ] as CompactBar
  );
}

/** 投入ペイロードの数値を丸め、保存サイズを抑えた形へ正規化する。 */
export function normalizeIngestPayload(p: IngestPayload): {
  numeric: Omit<IngestPayload, "ohlc15" | "ohlc5" | "barTime" | "source" | "alertDir">;
  ohlc15: CompactBar[] | null;
  ohlc5: CompactBar[] | null;
} {
  const priceDecimals = p.market === "fx" ? PRICE_DECIMALS_FX : PRICE_DECIMALS_NIKKEI;
  return {
    numeric: {
      close: roundPrice(p.close, priceDecimals) ?? 0,
      prevHigh: roundPrice(p.prevHigh, priceDecimals),
      prevLow: roundPrice(p.prevLow, priceDecimals),
      ma20: roundPrice(p.ma20, priceDecimals),
      atr15: roundPrice(p.atr15, priceDecimals),
      longThreshold: roundPrice(p.longThreshold, priceDecimals),
      shortThreshold: roundPrice(p.shortThreshold, priceDecimals),
      close1h: roundPrice(p.close1h, priceDecimals),
      ema20_1h: roundPrice(p.ema20_1h, priceDecimals),
      ema50_1h: roundPrice(p.ema50_1h, priceDecimals),
      trendUp: Boolean(p.trendUp),
      trendDown: Boolean(p.trendDown),
      oshiritsuLong: roundRatio(p.oshiritsuLong),
      oshiritsuShort: roundRatio(p.oshiritsuShort),
      volumeRatio: roundRatio(p.volumeRatio)
    },
    ohlc15: compactBars(p.ohlc15, MAX_STORED_15M_BARS, priceDecimals),
    ohlc5: compactBars(p.ohlc5, MAX_STORED_5M_BARS, priceDecimals)
  };
}

export function rawOhlcRetentionDays(): number {
  const raw = Number(process.env.RAW_OHLC_RETENTION_DAYS ?? "14");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 14;
}
