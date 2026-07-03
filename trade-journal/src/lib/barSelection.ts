import type { CompactBar } from "@/lib/types";

/** 足の確定判定に使うバッファ（秒）— データ配信遅延の余裕 */
const CLOSE_BUFFER_SEC = 30;

/** 足の終了時刻（epochSec）が現在時刻を過ぎていれば確定足とみなす */
export function isBarClosed(
  barOpenEpochSec: number,
  intervalMinutes: number,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  return nowSec >= barOpenEpochSec + intervalMinutes * 60 + CLOSE_BUFFER_SEC;
}

/**
 * 古い順の足配列から「直近の確定足」のインデックスを返す。
 * 末尾が未確定のときだけ1本戻す。データ欠損で末尾が古い場合は誤ってさらに戻さない。
 */
export function lastClosedBarIndex(
  bars: CompactBar[],
  intervalMinutes: number,
  nowSec = Math.floor(Date.now() / 1000)
): number {
  if (!bars.length) return -1;
  for (let i = bars.length - 1; i >= 0; i--) {
    if (isBarClosed(bars[i][0], intervalMinutes, nowSec)) return i;
  }
  return bars.length >= 2 ? bars.length - 2 : 0;
}

/** 取得時刻と判定足の終了時刻の差（分）。大きいほどデータが古い。 */
export function barLagMinutes(
  barOpenEpochSec: number,
  intervalMinutes: number,
  fetchedAtSec: number
): number {
  const barEndSec = barOpenEpochSec + intervalMinutes * 60;
  return Math.max(0, Math.round((fetchedAtSec - barEndSec) / 60));
}

/** 15分足の遅延がこの分数を超えたら警告（通常は最大30分程度） */
export const STALE_WARN_MINUTES_15M = 45;
/** 5分足の遅延警告しきい値 */
export const STALE_WARN_MINUTES_5M = 20;

export function staleDataWarningJa(lagMinutes: number, intervalLabel: string): string | null {
  const threshold = intervalLabel === "5分足" ? STALE_WARN_MINUTES_5M : STALE_WARN_MINUTES_15M;
  if (lagMinutes <= threshold) return null;
  return `判定足のデータが取得時刻より約${lagMinutes}分古いです（${intervalLabel}・Yahoo側の欠損の可能性）`;
}
