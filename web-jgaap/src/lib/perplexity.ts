import { getPerplexityAgentPreset } from "@/lib/openAiConfig";

export interface PerplexitySearchItem {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

const AGENT_API_URL = "https://api.perplexity.ai/v1/agent";

const SEARCH_INSTRUCTIONS =
  "日本の企業会計基準（ASBJ）に関する補助調査を行うアシスタントです。" +
  "web_search を使い、会計基準・適用指針・実務解説など関連ソースを探してください。" +
  "回答は日本語で簡潔にまとめてください。";

type AgentSearchResult = {
  id?: number;
  title?: string;
  url?: string;
  snippet?: string;
  source?: string;
};

type AgentOutputItem = {
  type?: string;
  results?: AgentSearchResult[];
};

type AgentApiResponse = {
  output_text?: string;
  output?: AgentOutputItem[];
};

function extractSearchResultsFromOutput(
  output: AgentOutputItem[] | undefined
): PerplexitySearchItem[] {
  const items: PerplexitySearchItem[] = [];
  const seen = new Set<string>();

  for (const item of output ?? []) {
    if (item.type !== "search_results" || !Array.isArray(item.results)) continue;
    for (const r of item.results) {
      const url = r.url?.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      items.push({
        title: r.title?.trim() || "（無題）",
        snippet: r.snippet?.trim() || "",
        url,
        source: r.source?.trim() || "Perplexity"
      });
    }
  }

  return items;
}

function parseJsonResults(content: string): PerplexitySearchItem[] | null {
  let toParse = content.trim();
  const jsonBlock = toParse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    toParse = jsonBlock[1].trim();
  }

  try {
    const parsed = JSON.parse(toParse) as { results?: PerplexitySearchItem[] };
    if (Array.isArray(parsed.results) && parsed.results.length > 0) {
      return parsed.results.map((r) => ({
        title: r.title ?? "（無題）",
        snippet: r.snippet ?? "",
        url: r.url ?? "https://www.perplexity.ai/",
        source: r.source ?? "Perplexity"
      }));
    }
  } catch {
    // fall through
  }

  return null;
}

function summaryFromOutputText(query: string, outputText: string): PerplexitySearchItem[] {
  const trimmed = outputText.trim();
  if (!trimmed) return [];

  const jsonResults = parseJsonResults(trimmed);
  if (jsonResults) return jsonResults;

  return [
    {
      title: `Perplexity: ${query.slice(0, 50)}${query.length > 50 ? "…" : ""}`,
      snippet: trimmed,
      url: "https://www.perplexity.ai/",
      source: "Perplexity"
    }
  ];
}

function errorResult(message: string): PerplexitySearchItem[] {
  return [
    {
      title: "Perplexity 検索エラー",
      snippet: message,
      url: "https://www.perplexity.ai/",
      source: "Perplexity (error)"
    }
  ];
}

async function callPerplexityAgentApi(query: string): Promise<AgentApiResponse> {
  const response = await fetch(AGENT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      preset: getPerplexityAgentPreset(),
      instructions: SEARCH_INSTRUCTIONS,
      input: query,
      tools: [{ type: "web_search" }],
      temperature: 0
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Perplexity Agent API error: ${response.status} ${text}`);
  }

  return JSON.parse(text) as AgentApiResponse;
}

export async function searchPerplexity(query: string): Promise<PerplexitySearchItem[]> {
  if (!process.env.PERPLEXITY_API_KEY) {
    return [
      {
        title: "Perplexity 検索（ダミー結果）",
        snippet:
          "PERPLEXITY_API_KEY が設定されていないため、実際の検索は行われていません。" +
          "本番利用時は .env.local に PERPLEXITY_API_KEY を設定し、Vercel でも同じ値を環境変数として登録してください。",
        url: "https://www.perplexity.ai/",
        source: "Perplexity (mock)"
      }
    ];
  }

  try {
    const apiResponse = await callPerplexityAgentApi(query);
    const fromSearch = extractSearchResultsFromOutput(apiResponse.output);
    if (fromSearch.length > 0) {
      return fromSearch;
    }

    const outputText = apiResponse.output_text?.trim();
    if (outputText) {
      return summaryFromOutputText(query, outputText);
    }

    return [
      {
        title: "Perplexity 検索結果の解析に失敗しました",
        snippet: "Agent API から検索結果を取得できませんでした。",
        url: "https://www.perplexity.ai/",
        source: "Perplexity (parse-error)"
      }
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(message);
  }
}
