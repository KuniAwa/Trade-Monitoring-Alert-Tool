import { resolveOpenAiModel } from "@/lib/openAiModels";
import {
  buildTradeReviewUserPrompt,
  tradeReviewSystemMessage,
  TradeReviewInput
} from "@/prompts/tradeReview";
import {
  buildConditionDiscoveryUserPrompt,
  conditionDiscoverySystemMessage,
  ConditionDiscoveryInput
} from "@/prompts/conditionDiscovery";
import type { ConditionDiscovery, TradeReview } from "@/lib/types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function parseJsonObject<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callOpenAiJson(params: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user }
      ],
      temperature: params.temperature ?? 0.2,
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI API error: ${response.status} ${text}`);
  }
  const json = (await response.json()) as { choices: { message: { content: string } }[] };
  return (json.choices[0]?.message?.content ?? "").trim();
}

function dummyTradeReview(): TradeReview {
  return {
    observations: [
      "【ダミー応答】OPENAI_API_KEY が未設定のため、固定のサンプルを返しています。"
    ],
    goodPoints: ["エントリー根拠が記録されている点は振り返りに有効です。"],
    improvements: [
      "本番では、押し率・1時間足EMA環境・ATRなどエントリー時点の市況と照らした改善点が表示されます。"
    ],
    nextActions: [".env に OPENAI_API_KEY を設定し、再度AI分析を実行してください。"],
    summary: "ダミー応答（APIキー未設定）。"
  };
}

function dummyConditionDiscovery(stats: ConditionDiscoveryInput["stats"]): ConditionDiscovery {
  return {
    overview: `【ダミー応答】OPENAI_API_KEY が未設定です。対象サンプルは ${stats.total} 件です。`,
    hypotheses: [
      {
        name: "（サンプル）押し目の深さと勝率",
        condition: "押し率20%以下のときのみエントリー",
        rationale: "本番では byOshiritsuBand の勝率差を根拠に提示します。",
        expectedEffect: "勝率の改善が見込める可能性。",
        validation: "押し率帯別の1R到達率を比較する。",
        caveat: "サンプル数が少ない場合は過学習に注意。"
      }
    ],
    limitations: ["APIキー未設定のためダミー出力です。"]
  };
}

export async function generateTradeReview(input: TradeReviewInput): Promise<TradeReview> {
  if (!process.env.OPENAI_API_KEY) return dummyTradeReview();
  const raw = await callOpenAiJson({
    model: resolveOpenAiModel("trade_review"),
    system: tradeReviewSystemMessage,
    user: buildTradeReviewUserPrompt(input),
    temperature: 0.2
  });
  const parsed = parseJsonObject<TradeReview>(raw);
  if (parsed) return parsed;
  return {
    observations: [],
    goodPoints: [],
    improvements: [],
    nextActions: [],
    summary: raw.slice(0, 500)
  };
}

export async function generateConditionDiscovery(
  input: ConditionDiscoveryInput
): Promise<ConditionDiscovery> {
  if (!process.env.OPENAI_API_KEY) return dummyConditionDiscovery(input.stats);
  const raw = await callOpenAiJson({
    model: resolveOpenAiModel("condition_discovery"),
    system: conditionDiscoverySystemMessage,
    user: buildConditionDiscoveryUserPrompt(input),
    temperature: 0.3
  });
  const parsed = parseJsonObject<ConditionDiscovery>(raw);
  if (parsed) return parsed;
  return {
    overview: raw.slice(0, 800),
    hypotheses: [],
    limitations: ["AI応答をJSONとして解釈できませんでした。"]
  };
}
