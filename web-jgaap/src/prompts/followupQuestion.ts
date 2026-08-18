import type { JgaapAiPayload } from "@/lib/jgaapCaseContext";

export function buildFollowupQuestionPrompt(payload: JgaapAiPayload): string {
  const sections: string[] = [
    `ケース名: ${payload.caseTitle}`,
    payload.topicLabel ? `トピック: ${payload.topicLabel}` : "",
    `\n取引概要:\n${payload.transactionSummaryJa}`,
    `\n初期質問:\n${payload.initialQuestionJa}`
  ].filter(Boolean);

  if (payload.standardLinks.length > 0) {
    sections.push(`\n参考リンク:\n${payload.standardLinks.map((u) => `- ${u}`).join("\n")}`);
  }
  if (payload.standardsPrompt) {
    sections.push(`\nリンク済み日本基準の項:\n${payload.standardsPrompt}`);
  }
  if (payload.searchSummaries.length > 0) {
    sections.push(
      `\nPerplexity 検索結果（補助情報・規範引用には使わない）:\n${payload.searchSummaries.join("\n---\n")}`
    );
  }
  if (payload.previousConversation.length > 0) {
    sections.push(
      `\n対話履歴:\n${payload.previousConversation.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join("\n\n")}`
    );
  }

  return `${sections.join("\n")}\n\n---\n事実が不足している点について、簡潔な追加質問を日本語で行ってください。最終結論はまだ述べないでください。`;
}

export const followupSystemMessage =
  "あなたは日本基準（企業会計基準・適用指針）専門のアシスタントです。出力はすべて日本語で行ってください。" +
  "事実が不足している場合は焦点を絞った追加質問をしてください。" +
  "リンク済みの日本基準の項を主要な文脈として用い、引用を改変しないでください。" +
  "Perplexity 検索結果は補助情報であり、規範の根拠にはしません。";
