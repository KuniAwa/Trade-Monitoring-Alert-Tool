import type { OutcomeLabel, SignalFeatures } from "@/lib/types";

export interface TradeReviewInput {
  direction: "long" | "short";
  entryPrice: number;
  exitPrice?: number | null;
  quantity: number;
  stopPrice?: number | null;
  takeProfit?: number | null;
  pnl?: number | null;
  rMultiple?: number | null;
  reason?: string | null;
  emotion?: string | null;
  note?: string | null;
  entryAt: string;
  exitAt?: string | null;
  /** 紐付くシグナル（アラートと同一データ由来の市況） */
  signal?: {
    barTime: string;
    source: string;
    alertDir?: string | null;
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
    features?: SignalFeatures | null;
  } | null;
  /** エントリー後の値動きから算出した結果ラベル */
  outcome?: OutcomeLabel | null;
}

export const tradeReviewSystemMessage =
  "あなたは日経225先物のトレードコーチです。ユーザーの実取引を、エントリー時点の市況データ" +
  "（為替アラートと同じ Yahoo の15分足・1時間足・出来高から算出した指標）と照らして分析します。" +
  "現行アラートのルール（押し率33%以内が理想・50%以上は見送り、1時間足EMA20/50の順位と傾きで環境認識、" +
  "ATRバッファ付きの初ブレイク、リスク幅に対する1R/2R）は参考にしてよいですが、それに限定せず、" +
  "より良い売買につながる改善点（時間帯・ボラティリティ・出来高・押し目の深さ・利確/損切り運用など）を" +
  "幅広く指摘してください。" +
  "重要: 本データの時刻はすべて日本時間（JST）です。日経225先物の日中立会いは概ね 8:45-15:15、" +
  "ナイトセッションは概ね 16:30-翌6:00 です。session（morning=寄り〜前場 / midday=昼休み近辺 / " +
  "afternoon=後場 / evening=引け後〜夕方 / night=ナイト）も参考に、時間帯の評価を誤らないでください。" +
  "断定や投資助言は避け、検討材料として日本語で簡潔に述べます。" +
  "出力は指定のJSONスキーマに従う有効なJSONオブジェクト1個のみ（説明文・コードフェンス禁止）。";

export function buildTradeReviewUserPrompt(input: TradeReviewInput): string {
  const schema = {
    observations: ["string（市況と取引の整合に関する所見）"],
    goodPoints: ["string（うまくいった点）"],
    improvements: ["string（改善点。現行アラート条件以外の観点も歓迎）"],
    nextActions: ["string（次回の具体的アクション）"],
    summary: "string（1〜2文の総評）"
  };
  return [
    "# 取引実績",
    JSON.stringify(
      {
        direction: input.direction,
        entryAt: input.entryAt,
        exitAt: input.exitAt ?? null,
        entryPrice: input.entryPrice,
        exitPrice: input.exitPrice ?? null,
        quantity: input.quantity,
        stopPrice: input.stopPrice ?? null,
        takeProfit: input.takeProfit ?? null,
        pnl: input.pnl ?? null,
        rMultiple: input.rMultiple ?? null,
        reason: input.reason ?? null,
        emotion: input.emotion ?? null,
        note: input.note ?? null
      },
      null,
      2
    ),
    "",
    "# エントリー時点の市況（アラートと同一データ由来）",
    input.signal ? JSON.stringify(input.signal, null, 2) : "（紐付くシグナルなし）",
    "",
    "# エントリー後の値動きから算出した結果ラベル",
    input.outcome ? JSON.stringify(input.outcome, null, 2) : "（結果ラベルなし）",
    "",
    "# 出力スキーマ（このJSON構造に厳密に従うこと）",
    JSON.stringify(schema, null, 2)
  ].join("\n");
}
