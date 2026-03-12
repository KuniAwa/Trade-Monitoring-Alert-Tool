import { buildFollowupQuestionPrompt, FollowupQuestionInput } from "@/prompts/followupQuestions";
import { buildDraftAnswerPrompt, DraftAnswerInput } from "@/prompts/draftAnswer";
import {
  RefineWithFeedbackInput,
  buildRefineWithFeedbackPrompt
} from "@/prompts/refineWithFeedback";

export type AiMode = "FOLLOWUP" | "DRAFT_ANSWER" | "REFINE_WITH_FEEDBACK";

export interface AiCallParams {
  mode: AiMode;
  payload: FollowupQuestionInput | DraftAnswerInput | RefineWithFeedbackInput;
}

function buildPrompt(params: AiCallParams): string {
  switch (params.mode) {
    case "FOLLOWUP":
      return buildFollowupQuestionPrompt(params.payload as FollowupQuestionInput);
    case "DRAFT_ANSWER":
      return buildDraftAnswerPrompt(params.payload as DraftAnswerInput);
    case "REFINE_WITH_FEEDBACK":
      return buildRefineWithFeedbackPrompt(params.payload as RefineWithFeedbackInput);
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown AI mode: ${params.mode}`);
  }
}

/**
 * LLM呼び出しのラッパー。
 * - MVPでは OpenAI API を想定した実装にしつつ、
 *   OPENAI_API_KEY がない場合は簡易なダミー応答を返してアプリが止まらないようにします。
 */
export async function callAi(params: AiCallParams): Promise<string> {
  const prompt = buildPrompt(params);

  if (!process.env.OPENAI_API_KEY) {
    // ローカル検証用の簡易ダミー応答
    return [
      "【AIダミー応答】OPENAI_API_KEY が設定されていないため、固定メッセージを返しています。",
      "",
      "プロンプト概要（先頭数行）:",
      prompt.split("\n").slice(0, 8).join("\n"),
      "",
      "本番利用時は .env.local に OPENAI_API_KEY を設定し、Vercel でも同じ値を環境変数として登録してください。"
    ].join("\n");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたは日本基準およびIFRSに精通した会計専門家として、会計論点の検討を支援するアシスタントです。" +
            "会計基準リンクとNotebookLM要約を優先して解釈し、Web検索結果は補助情報として扱ってください。" +
            "不足情報がある場合は追加質問を優先し、結論は必ず前提条件付きで提示してください。" +
            "最終判断はユーザー自身が行う前提で、検討材料を提供します。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI API error: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const content = json.choices[0]?.message?.content ?? "";
  return content.trim();
}

