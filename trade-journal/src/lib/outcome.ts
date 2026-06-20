import type { CompactBar, Direction, OutcomeLabel } from "@/lib/types";

export interface OutcomeInput {
  direction: Direction;
  basePrice: number;
  /** リスク幅（ストップまでの距離）。あれば 1R/2R・ストップ先着を評価 */
  riskWidth?: number | null;
  /** 評価に使う前方足（古い順, base より後の足のみ） */
  forwardBars: CompactBar[];
}

/**
 * 前方足から結果ラベルを算出する（同一データ = Yahoo 15分足の前方足を使用）。
 * long: 上方向が利益。short: 下方向が利益。
 */
export function computeOutcome(input: OutcomeInput): OutcomeLabel {
  const { direction, basePrice, forwardBars } = input;
  const risk = input.riskWidth && input.riskWidth > 0 ? input.riskWidth : null;
  const isLong = direction === "long";

  const label: OutcomeLabel = {
    direction,
    basePrice,
    riskWidth: risk,
    mfe: null,
    mae: null,
    hit1R: risk ? false : null,
    hit2R: risk ? false : null,
    hitStopFirst: risk ? false : null,
    forwardReturn: null,
    forwardBars: forwardBars.length
  };
  if (!forwardBars.length) return label;

  const target1 = risk ? (isLong ? basePrice + risk : basePrice - risk) : null;
  const target2 = risk ? (isLong ? basePrice + 2 * risk : basePrice - 2 * risk) : null;
  const stop = risk ? (isLong ? basePrice - risk : basePrice + risk) : null;

  let mfe = 0;
  let mae = 0;
  let resolved1R = false;
  let resolved2R = false;
  let stopFirst = false;
  let stopHit = false;

  for (const b of forwardBars) {
    const high = b[2];
    const low = b[3];
    const favorable = isLong ? high - basePrice : basePrice - low;
    const adverse = isLong ? basePrice - low : high - basePrice;
    if (favorable > mfe) mfe = favorable;
    if (adverse > mae) mae = adverse;

    if (risk && stop != null) {
      const stopTouched = isLong ? low <= stop : high >= stop;
      const t1Touched = target1 != null && (isLong ? high >= target1 : low <= target1);
      const t2Touched = target2 != null && (isLong ? high >= target2 : low <= target2);
      // 同じ足内では保守的に「ストップ優先」で判定
      if (stopTouched && !resolved1R) {
        stopHit = true;
        stopFirst = true;
        break;
      }
      if (t1Touched) resolved1R = true;
      if (t2Touched) {
        resolved2R = true;
        break;
      }
    }
  }

  label.mfe = mfe;
  label.mae = mae;
  if (risk) {
    label.hit1R = resolved1R || resolved2R;
    label.hit2R = resolved2R;
    label.hitStopFirst = stopFirst && !resolved1R;
  }
  const last = forwardBars[forwardBars.length - 1];
  label.forwardReturn = isLong ? last[4] - basePrice : basePrice - last[4];
  // stopHit を使わない場合の lint 回避
  void stopHit;
  return label;
}
