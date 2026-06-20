import type { Direction } from "@/lib/types";

export interface TradeInputCore {
  direction: Direction;
  entryPrice: number;
  exitPrice?: number | null;
  quantity?: number | null;
  stopPrice?: number | null;
}

/** 損益（値幅×数量）。未決済は null。 */
export function computePnl(t: TradeInputCore): number | null {
  if (t.exitPrice == null) return null;
  const qty = t.quantity ?? 1;
  const perUnit = t.direction === "long" ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice;
  return perUnit * qty;
}

/** 何R獲れたか（リスク幅 = |entry - stop|）。ストップ未設定や未決済は null。 */
export function computeRMultiple(t: TradeInputCore): number | null {
  if (t.exitPrice == null || t.stopPrice == null) return null;
  const risk = Math.abs(t.entryPrice - t.stopPrice);
  if (risk <= 0) return null;
  const perUnit = t.direction === "long" ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice;
  return perUnit / risk;
}
