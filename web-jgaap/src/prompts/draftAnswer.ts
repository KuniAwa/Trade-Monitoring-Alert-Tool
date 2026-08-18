import type { JgaapAiPayload } from "@/lib/jgaapCaseContext";
import type { JgaapDraftAnswerStructured } from "@/lib/types";

function schemaSample(): JgaapDraftAnswerStructured {
  return {
    issueJa: "論点の要約（日本語）",
    judgmentCriteriaJa: ["判断基準1"],
    confirmedFactsJa: ["ケースから確認できた事実"],
    options: [],
    recommendation: {
      titleJa: "推奨される会計処理の見出し（例: 収益の認識）",
      rationaleJa: "条件付きの推奨要約（推奨する会計処理とその理由。代替案の列挙は不要）",
      assumptionsJa: ["前提"],
      reasoningSteps: [
        {
          stepJa: "ステップ 1: 適用基準・定義の確認",
          explanationJa: "日本語での説明",
          citations: [
            {
              standardId: "ASBJ 29",
              paragraphId: "16",
              kind: "BODY",
              quoteJa: "リンク済み項からの逐語引用（改変禁止）"
            }
          ]
        },
        {
          stepJa: "ステップ 2: 適用指針による具体化",
          explanationJa: "日本語での説明",
          citations: [
            {
              standardId: "ASBJ-AG 30",
              paragraphId: "12",
              kind: "GUIDANCE",
              quoteJa: "適用指針の逐語引用（必要な場合）"
            }
          ]
        }
      ]
    },
    journalEntries: [
      {
        descriptionJa: "仕訳例",
        debitJa: "借方科目",
        creditJa: "貸方科目",
        amountExampleJa: "任意"
      }
    ],
    references: [
      "[結論の背景（要約）] ASBJ 29 第95項: 開発時の考え方の要約（規範根拠ではない）",
      "[Perplexity検索結果（要約）] 記事タイトル（https://example.com）: 実務解説の要約"
    ],
    uncertaintiesJa: ["残る不確実性"]
  };
}

const OUTPUT_RULES = [
  "- すべての文字列フィールドは日本語。",
  "- quoteJa はリンク済み項から逐語引用。要約・改変禁止。",
  "- 規範的根拠の引用は BODY（会計基準本文）または GUIDANCE（適用指針）のみ。",
  "- standardId はリンク済み文書の ID（例: ASBJ 29 / ASBJ-AG 30）をそのまま使う。",
  "- paragraphId は項番号のみ（例: \"16\"）。「第16項」とは書かない。",
  "- リンク済みに適用指針があり、論点が解釈や適用判断を要する場合は、BODY に加え GUIDANCE を少なくとも 1 件 citations に含める。",
  "- BACKGROUND（結論の背景）と EXAMPLE（設例）は citations に使わない。設例は references にも含めない。",
  "- 関連する結論の背景は references に要約として記載する（関連がなければ省略可）。書式: [結論の背景（要約）] {standardId} 第{paragraphId}項: {要約}。出典は standardId と項番号で足りる。本文の逐語引用はしない。",
  "- 関連する Perplexity 検索結果は references に要約として記載する（検索結果がなければ省略可）。書式: [Perplexity検索結果（要約）] {title}（{url}）: {要約}。URL を出典として必ず含める。",
  "- references の各要素は、結論の背景か Perplexity 検索結果かを先頭のラベルで明示し、要約であることを必ず書く。",
  "- options は常に空配列 [] とする。A/B/C 等の選択肢は出力しない。",
  "- recommendation に推奨される会計処理を直接記載する。",
  "- recommendation.reasoningSteps は 2〜4 ステップ。各ステップの citations は 0〜3 件（全体で合計 3〜6 件程度）。",
  "- リンク済みの項の中から選ぶ。存在しない paragraphId は引用しない。",
  "- マークダウン・コードフェンス禁止。JSON のみ。"
];

export function buildDraftAnswerUserPrompt(payload: JgaapAiPayload): string {
  const blocks = [
    `ケース名: ${payload.caseTitle}`,
    payload.topicLabel ? `トピック: ${payload.topicLabel}` : "",
    `\n取引概要:\n${payload.transactionSummaryJa}`,
    `\n初期質問:\n${payload.initialQuestionJa}`,
    payload.standardLinks.length
      ? `\n参考リンク:\n${payload.standardLinks.map((u) => `- ${u}`).join("\n")}`
      : "",
    payload.standardsPrompt
      ? `\nリンク済み日本基準・項（引用は quoteJa を逐語で）:\n${payload.standardsPrompt}`
      : "",
    payload.backgroundPrompt
      ? `\n結論の背景（参考・要約用。規範 citations には使わない。設例は対象外）:\n${payload.backgroundPrompt}`
      : "",
    payload.searchSummaries.length
      ? `\nPerplexity 検索結果（補助情報・規範引用不可）:\n${payload.searchSummaries.join("\n---\n")}`
      : "",
    payload.previousConversation.length
      ? `\n対話:\n${payload.previousConversation.map((t) => `${t.role}: ${t.content}`).join("\n\n")}`
      : "",
    payload.pastFeedbackBlock ?? "",
    "\n---",
    "JgaapDraftAnswerStructured に一致する JSON オブジェクトを1つ出力してください。",
    "ルール:",
    ...OUTPUT_RULES,
    "\nスキーマ例:",
    JSON.stringify(schemaSample(), null, 2)
  ].filter(Boolean);

  return blocks.join("\n");
}

export const draftAnswerSystemMessage =
  "あなたは日本基準（企業会計基準・適用指針）専門のアシスタントです。" +
  "提供された項の引用を主要な規範ソースとして用いてください。" +
  "引用は改変せず quoteJa に逐語で転記してください。" +
  "複数の選択肢（A/B/C）は提示せず、推奨される会計処理を recommendation に直接記載してください。" +
  "推奨の論証では、BODY（会計基準）と GUIDANCE（適用指針）を状況に応じて組み合わせて引用してください。" +
  "結論の背景・設例を規範的根拠にしないでください。" +
  "関連する結論の背景は references に項番号付きの要約として記載し、[結論の背景（要約）] と出典（standardId）を明示してください。" +
  "Perplexity 検索結果は citations に含めず、関連するものだけ references に [Perplexity検索結果（要約）] と URL 付きで記載してください。" +
  "設例は対象外です。" +
  "単一の有効な JSON オブジェクトのみを出力してください。最終判断はユーザーに委ね、条件付きの表現を用いてください。";
