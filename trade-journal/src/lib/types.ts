export type Direction = "long" | "short";
export type SignalSource = "scan" | "alert" | "summary";

/** 圧縮ローソク足: [epochSec, open, high, low, close, volume] */
export type CompactBar = [number, number, number, number, number, number];

/** market-alert から投入されるスナップショットのペイロード（同一データ由来） */
export interface IngestPayload {
  /** 判定対象の確定足時刻（ISO文字列, JST想定） */
  barTime: string;
  source: SignalSource;
  alertDir?: Direction | null;
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
  trendUp?: boolean;
  trendDown?: boolean;
  oshiritsuLong?: number | null;
  oshiritsuShort?: number | null;
  volumeRatio?: number | null;
  /** 直近の15分足小窓（容量削減のため限定本数） */
  ohlc15?: CompactBar[];
}

/** スナップショットから導く拡張特徴量（現行アラート条件以外の探索用） */
export interface SignalFeatures {
  /** EMA20とEMA50の乖離率(%)（1時間足） */
  emaSpreadPct1h?: number | null;
  /** 終値の20MAからの乖離率(%)（15分足） */
  ma20DeviationPct?: number | null;
  /** ATR を終値で割ったボラティリティ(%) */
  atrPct?: number | null;
  /** ロング閾値までの距離をATRで割った値（>0なら未到達） */
  distToLongThrAtr?: number | null;
  /** ショート閾値までの距離をATRで割った値 */
  distToShortThrAtr?: number | null;
  /** RSI(14)（15分足・小窓から算出可能なら） */
  rsi14?: number | null;
  /** 時間帯バケット: "morning"|"midday"|"afternoon"|"evening"|"night" */
  sessionBucket?: string | null;
  /** 曜日 0=月 .. 4=金 */
  weekday?: number | null;
  /** ATRレジーム: "low"|"mid"|"high"（atrPct の相対) */
  atrRegime?: string | null;
  /** 前日レンジ幅（prevHigh-prevLow） */
  prevRange?: number | null;
}

/** 取引/シグナルの結果ラベル（同一データ＝Yahoo の前方足から算出） */
export interface OutcomeLabel {
  /** 評価方向 */
  direction: Direction;
  /** 基準価格（エントリーまたは終値） */
  basePrice: number;
  /** リスク幅（ストップまでの距離） */
  riskWidth?: number | null;
  /** 評価窓内の最大含み益（価格） */
  mfe?: number | null;
  /** 評価窓内の最大含み損（価格, 正の値） */
  mae?: number | null;
  /** 1R に到達したか */
  hit1R?: boolean | null;
  /** 2R に到達したか */
  hit2R?: boolean | null;
  /** ストップに先に当たったか */
  hitStopFirst?: boolean | null;
  /** 評価窓終端での前方リターン（価格差） */
  forwardReturn?: number | null;
  /** 評価に使った前方足の本数 */
  forwardBars?: number | null;
}

export interface TradeReview {
  /** ルール遵守・市況整合の所見（箇条書き） */
  observations: string[];
  /** うまくいった点 */
  goodPoints: string[];
  /** 改善点（現行条件以外も含む） */
  improvements: string[];
  /** 次回の具体アクション */
  nextActions: string[];
  /** 総評（短文） */
  summary: string;
}

export interface ConditionHypothesis {
  /** 仮説の名称 */
  name: string;
  /** 売買条件の説明（現行アラート条件以外も可） */
  condition: string;
  /** その根拠（集計のどこから示唆されたか） */
  rationale: string;
  /** 期待される効果 */
  expectedEffect: string;
  /** 検証方法（次に何を測るか） */
  validation: string;
  /** 過学習リスクなどの注意 */
  caveat?: string;
}

export interface ConditionDiscovery {
  /** 全体所見 */
  overview: string;
  /** 改善仮説のリスト */
  hypotheses: ConditionHypothesis[];
  /** サンプル不足など分析上の限界 */
  limitations: string[];
}
