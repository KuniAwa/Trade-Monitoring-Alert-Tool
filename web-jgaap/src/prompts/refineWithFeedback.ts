import type { JgaapAiPayload } from "@/lib/jgaapCaseContext";
import type { JgaapDraftAnswerStructured, JgaapFeedbackRating } from "@/lib/types";

export type RefineWithFeedbackInput = {
  payload: JgaapAiPayload;
  previousDraft: JgaapDraftAnswerStructured;
  feedbackRating: JgaapFeedbackRating;
  feedbackCommentJa?: string | null;
};

export function buildRefineWithFeedbackUserPrompt(input: RefineWithFeedbackInput): string {
  const { payload, previousDraft, feedbackRating, feedbackCommentJa } = input;

  return [
    `ケース名: ${payload.caseTitle}`,
    payload.topicLabel ? `トピック: ${payload.topicLabel}` : "",
    `\n取引概要:\n${payload.transactionSummaryJa}`,
    `\n初期質問:\n${payload.initialQuestionJa}`,
    payload.standardsPrompt ? `\nリンク済み日本基準の項:\n${payload.standardsPrompt}` : "",
    payload.backgroundPrompt
      ? `\n結論の背景（参考・要約用。規範 citations には使わない。設例は対象外）:\n${payload.backgroundPrompt}`
      : "",
    payload.searchSummaries.length
      ? `\nPerplexity 検索結果（補助情報）:\n${payload.searchSummaries.join("\n---\n")}`
      : "",
    payload.previousConversation.length
      ? `\n対話:\n${payload.previousConversation.map((t) => `${t.role}: ${t.content}`).join("\n\n")}`
      : "",
    "\n---",
    "前回の回答案（JSON）:",
    JSON.stringify(previousDraft, null, 2),
    "\n---",
    `フィードバック評価: ${feedbackRating}`,
    `フィードバックコメント: ${feedbackCommentJa?.trim() || "（なし）"}`,
    "\n---",
    "フィードバックを反映して回答案を改訂してください。JgaapDraftAnswerStructured に一致する JSON を1つ出力。",
    "スキーマは同じ。INSUFFICIENT / INCORRECT / RECONSIDER は明示的に対処。",
    "options は常に空配列 []。選択肢は出力せず、recommendation に推奨される会計処理を直接記載。",
    "reasoningSteps の citations は関連項を複数（合計 3〜6 件程度）含める。解釈が必要なら GUIDANCE も含める。",
    "quoteJa は逐語引用。BACKGROUND / EXAMPLE を規範引用に使わない。設例は references にも含めない。",
    "関連する結論の背景は references に [結論の背景（要約）] {standardId} 第{paragraphId}項: {要約} の形式で記載（出典は standardId と項番号）。",
    "関連する Perplexity 検索結果は references に [Perplexity検索結果（要約）] {title}（{url}）: {要約} の形式で記載。",
    "すべて日本語。JSON のみ。"
  ]
    .filter(Boolean)
    .join("\n");
}

export const refineWithFeedbackSystemMessage =
  "あなたは日本基準専門のアシスタントです。ユーザーのフィードバックに基づき会計判断の回答案を改訂します。" +
  "選択肢（A/B/C）は出力せず、推奨される会計処理を recommendation に直接記載してください。" +
  "quoteJa の引用は改変・要約禁止です。" +
  "結論の背景と Perplexity 検索結果は規範 citations に使わず、関連するものだけ references に要約として記載してください。" +
  "references では種別（結論の背景／Perplexity検索結果）と要約である点、出典を明示してください。設例は対象外です。" +
  "単一の有効な JSON オブジェクトのみを出力してください。すべて日本語で記述してください。";
