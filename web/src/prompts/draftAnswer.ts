import { DraftAnswerStructured } from "@/lib/types";

export interface DraftAnswerInput {
  standard: "JGAAP" | "IFRS" | "BOTH";
  transactionSummary: string;
  initialQuestion: string;
  notebookSummaries: string[];
  standardLinks: string[];
  conversation: { role: "user" | "assistant"; content: string }[];
  searchSummaries: string[];
  /** 同論点ラベルの過去ケースでのフィードバック（回答案の改善に活用） */
  pastFeedbackFromSameTopic?: string;
}

export function buildDraftAnswerPrompt(input: DraftAnswerInput): string {
  const {
    standard,
    transactionSummary,
    initialQuestion,
    notebookSummaries,
    standardLinks,
    conversation,
    searchSummaries,
    pastFeedbackFromSameTopic
  } = input;

  const standardLabel =
    standard === "JGAAP"
      ? "日本基準（J-GAAP）"
      : standard === "IFRS"
      ? "IFRS"
      : "日本基準およびIFRSの両方";

  return [
    "あなたは日本基準およびIFRSに精通した会計専門家として、会計処理の選択肢と推奨案を整理します。",
    "",
    "目的: ユーザーが最終判断を行うための『検討のたたき台』となる回答案を作成することです。",
    "ただし、結論は常に前提条件付きで提示し、断定しないでください。",
    "",
    `対象となる会計基準区分: ${standardLabel}`,
    "",
    "【取引概要】",
    transactionSummary,
    "",
    "【利用者からの最初の質問】",
    initialQuestion,
    "",
    "【会計基準リンク（ユーザー指定）】",
    standardLinks.length ? standardLinks.join("\n") : "（指定なし）",
    "",
    "【NotebookLM 要約】",
    notebookSummaries.length ? notebookSummaries.join("\n---\n") : "（未入力）",
    "",
    "【対話履歴（追加質問と回答）】",
    conversation.length
      ? conversation
          .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
          .join("\n")
      : "（まだ対話はありません）",
    "",
    "【Perplexity 検索結果の要約（補助情報）】",
    searchSummaries.length ? searchSummaries.join("\n---\n") : "（未取得）",
    "",
    ...(pastFeedbackFromSameTopic
      ? [
          "【同論点ラベルの過去ケースでのフィードバック】",
          "以下は、同じ論点ラベルで過去に保存されたフィードバックです。『不足』『誤り』『要再検討』の指摘を踏まえ、今回の回答案ではそれらを補強・明確化してください。『妥当』のケースは参考にしつつ、一貫した品質にしてください。",
          "",
          pastFeedbackFromSameTopic,
          ""
        ]
      : []),
    "制約条件:",
    "- 会計基準本文の全文引用は行わず、要点ベースで扱うこと",
    "- Web検索結果はあくまで補助情報とし、基準リンクとNotebookLM要約を優先すること",
    "- 不確実性や残された論点があれば必ず明示すること",
    "",
    "出力フォーマット（Markdownテキストで出力）:",
    "1. 論点",
    "2. 追加確認した事実",
    "3. 会計処理の選択肢 A/B/C",
    "   - 各選択肢について、適用条件・メリット・デメリットを整理してください。",
    "4. 推奨案（どの選択肢をどのような前提のもとで推奨するか）",
    "5. 仕訳例（代表的なパターンを1〜2個、金額は例示で構いません）",
    "6. 参照情報（参照した会計基準やガイダンス等を簡潔に列挙）",
    "7. 不確実性 / 残論点",
    "",
    "回答は日本語で、ユーザーがそのまま検討メモとして保存できるように記述してください。"
  ].join("\n");
}

// LLMから構造化JSONを生成する場合のsystem説明（将来拡張用）
export const draftAnswerJsonInstruction = `
上記の情報に基づいて、会計処理の検討結果をJSON形式で出力してください。
スキーマは次のTypeScript型に従ってください:

type DraftAnswerStructured = ${JSON.stringify(
  {
    issue: "string",
    additionalFacts: ["string"],
    options: [
      {
        id: "A | B | C | string",
        title: "string",
        description: "string | undefined",
        conditions: ["string"],
        advantages: ["string"],
        disadvantages: ["string"]
      }
    ],
    recommendation: {
      optionId: "string",
      rationale: "string",
      assumptions: ["string"]
    },
    journalEntries: [
      {
        description: "string",
        debit: "string",
        credit: "string",
        amountExample: "string | undefined"
      }
    ],
    references: ["string"],
    uncertainties: ["string"]
  },
  null,
  2
)};

必ず有効なJSONのみを出力し、日本語テキストやコメントは含めないでください。
`;

