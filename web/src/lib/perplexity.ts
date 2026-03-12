export interface PerplexitySearchItem {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export async function searchPerplexity(query: string): Promise<PerplexitySearchItem[]> {
  if (!process.env.PERPLEXITY_API_KEY) {
    // APIキーがない場合はダミーの結果を返してアプリ全体が止まらないようにする
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

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that performs web research about accounting topics and returns only JSON.\n" +
            "Respond in JSON format: { \"results\": [ { \"title\": string, \"snippet\": string, \"url\": string, \"source\": string } ] }.\n" +
            "Do not include any additional text outside of the JSON."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0
    })
  });

  if (!response.ok) {
    const text = await response.text();
    // エラー時もアプリを止めず、ダミー結果を返す
    return [
      {
        title: "Perplexity 検索エラー",
        snippet: `Perplexity API error: ${response.status} ${text}`,
        url: "https://www.perplexity.ai/",
        source: "Perplexity (error)"
      }
    ];
  }

  const text = await response.text();

  try {
    const apiResponse = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
      citations?: string[];
    };
    const content = apiResponse.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty content");
    }

    // content が JSON なら results を取得（```json ... ``` の場合は中身だけパース）
    let toParse = content;
    const jsonBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
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
      // content 内の JSON パースに失敗 → 下のフォールバックへ
    }

    // 本文を 1 件の検索結果として返す（JSON でなくても表示できる）
    return [
      {
        title: `Perplexity: ${query.slice(0, 50)}${query.length > 50 ? "…" : ""}`,
        snippet: content,
        url: "https://www.perplexity.ai/",
        source: "Perplexity"
      }
    ];
  } catch {
    // レスポンス全体のパースに失敗した場合
  }

  return [
    {
      title: "Perplexity 検索結果の解析に失敗しました",
      snippet:
        "Perplexity からのレスポンスを解釈できませんでした。レスポンス本文はログを確認してください。",
      url: "https://www.perplexity.ai/",
      source: "Perplexity (parse-error)"
    }
  ];
}

