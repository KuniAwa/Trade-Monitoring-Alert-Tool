import type { StatsSummary } from "@/lib/stats";

export interface ConditionDiscoveryInput {
  /** 集計サマリー（バケット別の勝率・平均R・平均前方リターン等） */
  stats: StatsSummary;
  /** 代表的な個別事例（勝ち/負けの抜粋）。過学習防止のため少数のみ */
  samples: unknown[];
  /** 現行アラート条件の要約（参考。これに縛られないことを明示する） */
  currentRules: string;
}

export const conditionDiscoverySystemMessage =
  "あなたは日経225先物のシステムトレード設計を支援するアナリストです。" +
  "与えられた集計（アラートと同一データ＝Yahoo の15分足・1時間足・出来高から算出した指標と結果ラベル）を読み、" +
  "現行アラート条件との一致確認ではなく、現行条件以外も含めて『より良い売買条件』の改善仮説を提案します。" +
  "重要な原則: (1) 必ず集計の数値を根拠として引用する。(2) サンプル数が少ない場合は過学習リスクを明示する。" +
  "(3) 各仮説に『次にどう検証するか』を必ず添える。(4) 断定や投資助言はしない。" +
  "出力は指定のJSONスキーマに従う有効なJSONオブジェクト1個のみ（説明文・コードフェンス禁止）。日本語で記述。";

export function buildConditionDiscoveryUserPrompt(input: ConditionDiscoveryInput): string {
  const schema = {
    overview: "string（全体所見。サンプル規模と傾向の要約）",
    hypotheses: [
      {
        name: "string（仮説名）",
        condition: "string（売買条件。現行条件以外も可）",
        rationale: "string（集計のどの数値から示唆されたか）",
        expectedEffect: "string（勝率/期待Rへの想定効果）",
        validation: "string（次に測るべき指標・手順）",
        caveat: "string（過学習やサンプル不足などの注意。任意）"
      }
    ],
    limitations: ["string（分析上の限界・前提）"]
  };
  return [
    "# 現行アラート条件（参考。これに縛られないこと）",
    input.currentRules,
    "",
    "# 集計サマリー（バケット別）",
    JSON.stringify(input.stats, null, 2),
    "",
    "# 代表事例（少数抜粋）",
    JSON.stringify(input.samples, null, 2),
    "",
    "# 出力スキーマ（このJSON構造に厳密に従うこと）",
    JSON.stringify(schema, null, 2)
  ].join("\n");
}

export const CURRENT_RULES_SUMMARY =
  "現行アラートは日経225先物について、(a) 1時間足の終値>EMA20>EMA50 かつ EMA20 が3本連続上向き（ショートは逆）で環境認識、" +
  "(b) 15分足の確定終値が『前営業日 日中(9:00-15:45)の高値+0.20×ATR(14)』を上抜け（ショートは安値-0.20×ATR を下抜け）、" +
  "(c) 前足終値が閾値未突破の『初ブレイク』、(d) 15分足20MAの上(ショートは下)、(e) 押し率50%以上は除外・33%以内が理想、" +
  "(f) 出来高は同時刻帯中央値の1.5倍以上で『出来高あり』を参考表示。これらを満たすと通知する。";
