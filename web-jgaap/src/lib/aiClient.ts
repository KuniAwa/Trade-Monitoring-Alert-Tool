import type { JgaapAiPayload } from "@/lib/jgaapCaseContext";
import {
  draftAnswerToPlainText,
  enrichDraftAnswerFromParagraphIndex,
  parseJgaapDraftAnswerStructured,
  type ParagraphIndexEntry
} from "@/lib/jgaapDraftAnswerFormat";
import { getOpenAiConversationModel, getOpenAiDraftAnswerModel } from "@/lib/openAiConfig";
import type { JgaapDraftAnswerStructured } from "@/lib/types";
import {
  buildDraftAnswerUserPrompt,
  draftAnswerSystemMessage
} from "@/prompts/draftAnswer";
import { buildFollowupQuestionPrompt, followupSystemMessage } from "@/prompts/followupQuestion";
import {
  buildRefineWithFeedbackUserPrompt,
  refineWithFeedbackSystemMessage,
  type RefineWithFeedbackInput
} from "@/prompts/refineWithFeedback";

export type StructuredResult = {
  structuredJson: string;
  summaryJa: string;
};

/** GPT-5 系は temperature のカスタム値を受け付けない（既定 1 のみ）。 */
function modelAllowsCustomTemperature(model: string): boolean {
  return !/^gpt-5/i.test(model);
}

function chatCompletionBody(
  model: string,
  system: string,
  user: string,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    ...extra
  };
  if (modelAllowsCustomTemperature(model)) {
    body.temperature = 0.2;
  }
  return body;
}

async function callOpenAiJson(model: string, system: string, user: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(
      chatCompletionBody(model, system, user, { response_format: { type: "json_object" } })
    )
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI API error: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return (json.choices[0]?.message?.content ?? "").trim();
}

async function callOpenAiText(model: string, system: string, user: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(chatCompletionBody(model, system, user))
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI API error: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return (json.choices[0]?.message?.content ?? "").trim();
}

function dummyStructuredDraft(payload: JgaapAiPayload): JgaapDraftAnswerStructured {
  return {
    issueJa: `[ダミー] OPENAI_API_KEY 未設定。論点: ${payload.initialQuestionJa.slice(0, 120)}`,
    judgmentCriteriaJa: ["関連する日本基準を事実に適用する"],
    confirmedFactsJa: [payload.transactionSummaryJa.slice(0, 200) || "取引概要あり"],
    options: [],
    recommendation: {
      titleJa: "主たる会計処理（事実確認要）",
      rationaleJa:
        "条件付きの推奨プレースホルダー。OPENAI_API_KEY を設定して再生成してください。",
      assumptionsJa: ["記載事実が完全である前提"],
      reasoningSteps: [
        {
          stepJa: "適用基準の特定",
          explanationJa: "リンク済みの項から認識要件を確認する。",
          citations: []
        }
      ]
    },
    journalEntries: [],
    references: ["（プレースホルダー）"],
    uncertaintiesJa: ["OPENAI_API_KEY を設定のうえ再生成してください。"]
  };
}

function toStructuredResult(
  structured: JgaapDraftAnswerStructured,
  paragraphIndex: Map<string, ParagraphIndexEntry>
): StructuredResult {
  const enriched = enrichDraftAnswerFromParagraphIndex(structured, paragraphIndex);
  const structuredJson = JSON.stringify(enriched, null, 2);
  return { structuredJson, summaryJa: draftAnswerToPlainText(enriched).slice(0, 4000) };
}

export async function callAi(params: { mode: "FOLLOWUP"; payload: JgaapAiPayload }): Promise<string> {
  const prompt = buildFollowupQuestionPrompt(params.payload);

  if (!process.env.OPENAI_API_KEY) {
    return [
      "[ダミー応答] OPENAI_API_KEY が未設定です。",
      "",
      "契約の識別、履行義務の単位、取引価格の算定について、不足している事実はありますか。"
    ].join("\n");
  }

  return callOpenAiText(getOpenAiConversationModel(), followupSystemMessage, prompt);
}

export async function generateStructuredDraftAnswer(
  payload: JgaapAiPayload,
  paragraphIndex: Map<string, ParagraphIndexEntry>
): Promise<StructuredResult> {
  if (!process.env.OPENAI_API_KEY) {
    return toStructuredResult(dummyStructuredDraft(payload), paragraphIndex);
  }

  const raw = await callOpenAiJson(
    getOpenAiDraftAnswerModel(),
    draftAnswerSystemMessage,
    buildDraftAnswerUserPrompt(payload)
  );
  const structured = parseJgaapDraftAnswerStructured(raw) ?? dummyStructuredDraft(payload);
  return toStructuredResult(structured, paragraphIndex);
}

export async function refineDraftWithFeedback(
  input: RefineWithFeedbackInput,
  paragraphIndex: Map<string, ParagraphIndexEntry>
): Promise<StructuredResult> {
  if (!process.env.OPENAI_API_KEY) {
    const base = enrichDraftAnswerFromParagraphIndex(input.previousDraft, paragraphIndex);
    const refined: JgaapDraftAnswerStructured = {
      ...base,
      recommendation: {
        ...base.recommendation,
        rationaleJa: `[ダミー改訂] フィードバック（${input.feedbackRating}）を反映: ${input.feedbackCommentJa ?? "コメントなし"}。${base.recommendation.rationaleJa}`
      },
      uncertaintiesJa: [
        ...base.uncertaintiesJa,
        "OPENAI_API_KEY を設定すると AI による改訂が可能です。"
      ]
    };
    return toStructuredResult(refined, paragraphIndex);
  }

  const raw = await callOpenAiJson(
    getOpenAiDraftAnswerModel(),
    refineWithFeedbackSystemMessage,
    buildRefineWithFeedbackUserPrompt(input)
  );
  const structured = parseJgaapDraftAnswerStructured(raw) ?? input.previousDraft;
  return toStructuredResult(structured, paragraphIndex);
}
