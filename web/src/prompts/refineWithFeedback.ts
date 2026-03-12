import { DraftAnswerStructured } from "@/lib/types";

export interface RefineWithFeedbackInput {
  standard: "JGAAP" | "IFRS" | "BOTH";
  originalAnswerMarkdown: string;
  feedbackRating: "ADEQUATE" | "INSUFFICIENT" | "INCORRECT" | "RECONSIDER";
  feedbackComment?: string;
}

export function buildRefineWithFeedbackPrompt(input: RefineWithFeedbackInput): string {
  const { standard, originalAnswerMarkdown, feedbackRating, feedbackComment } = input;

  const standardLabel =
    standard === "JGAAP"
      ? "日本基準（J-GAAP）"
      : standard === "IFRS"
      ? "IFRS"
      : "日本基準およびIFRSの両方";

  return [
    "あなたは日本基準およびIFRSに精通した会計専門家として、既存の回答案に対するフィードバックを踏まえて改訂案を作成します。",
    "",
    `対象となる会計基準区分: ${standardLabel}`,
    "",
    "【元の回答案（Markdown）】",
    originalAnswerMarkdown,
    "",
    "【フィードバック（評価）】",
    `評価: ${feedbackRating}`,
    "",
    "【フィードバック（コメント）】",
    feedbackComment ?? "（コメントなし）",
    "",
    "制約条件:",
    "- 元の回答案の構造（論点 / 追加確認した事実 / 選択肢 / 推奨案 / 仕訳例 / 参照情報 / 不確実性）は維持してください。",
    "- ただし、明らかな誤り・不足・曖昧さについては積極的に修正・補足してください。",
    "- 結論は必ず前提条件付きにし、断定的な表現を避けてください。",
    "",
    "出力フォーマット:",
    "- 元の回答案と同じセクション構成のMarkdownテキストとして、改訂後の回答案を提示してください。",
    "- どの点をどのように修正したかが読み取れるように、文章レベルで改善してください（差分表示は不要です）。",
    "",
    "回答は日本語で出力してください。"
  ].join("\n");
}

