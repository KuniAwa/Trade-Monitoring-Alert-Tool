const MODEL = "gpt-4o-mini";

export type EnrichInput = {
  context: {
    capturedMonth: number | null;
    location: string | null;
    habitat: string | null;
    userNote: string | null;
  };
  candidates: Array<{
    id: string;
    scientificName: string;
    family: string | null;
    plantNetScore: number;
    knownCommonNames: string[];
  }>;
};

export type EnrichResultItem = {
  candidateId: string;
  commonNameJa: string | null;
  description: string;
  rerankScore: number;
  rerankReason: string;
};

type EnrichResponseJson = {
  items: EnrichResultItem[];
};

const SYSTEM = `あなたは山野草と植物分類の補助アシスタントです。ユーザーに渡す Pl@ntNet の識別候補（学名・スコア）と、撮影地・季節・生息環境のメタ情報に基づき、
候補を信頼度の順に再ランクし、各候補について日本の利用者向けの和名（一般的な通称。不明なら null）と、簡潔な説明（2〜4文。生育環境・特徴・季節感・混同注意など）を付けてください。
knownCommonNames に英語名がある場合は、日本語として自然な訳語を commonNameJa に入れてください（カタカナ訳・一般名の訳語を優先）。
絶対に推測で学名を作らず、与えた学名一覧に対応する行のみ返してください。有毒・可食性は誤用防止のため断定せず、必要なら「要専門確認」と併記してください。`;

function buildUserPrompt(input: EnrichInput): string {
  const c = input.context;
  const lines = input.candidates.map(
    (x) =>
      `- id=${x.id} 学名: ${x.scientificName} 科: ${x.family ?? "不明"} Pl@ntNetスコア: ${x.plantNetScore.toFixed(4)} knownCommonNames: ${x.knownCommonNames.length > 0 ? x.knownCommonNames.join(", ") : "(なし)"}`
  );
  return [
    "## メタ情報",
    `- 撮影月: ${c.capturedMonth != null ? String(c.capturedMonth) : "未入力"}`,
    `- 場所: ${c.location?.trim() || "未入力"}`,
    `- 生息/環境: ${c.habitat?.trim() || "未入力"}`,
    `- メモ: ${c.userNote?.trim() || "なし"}`,
    "",
    "## 候補（Pl@ntNet 上位）",
    ...lines,
    "",
    "出力: { \"items\": EnrichResultItem[] } 形式。items は上記 id をすべて含め、**rerankScore 降順**で並べる。",
    "各 EnrichResultItem: candidateId, commonNameJa, description, rerankScore (0〜1 概ね), rerankReason（日本語 1〜3 文）"
  ].join("\n");
}

function parseJson(text: string): EnrichResponseJson {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("LLM: JSON オブジェクトが見つかりません。");
  }
  const json = JSON.parse(trimmed.slice(start, end + 1)) as EnrichResponseJson;
  if (!json.items || !Array.isArray(json.items)) {
    throw new Error("LLM: items 配列が不正です。");
  }
  return json;
}

export async function enrichCandidatesWithLlm(
  input: EnrichInput
): Promise<EnrichResultItem[]> {
  if (!process.env.OPENAI_API_KEY) {
    return input.candidates
      .sort((a, b) => b.plantNetScore - a.plantNetScore)
      .map((c, i) => ({
        candidateId: c.id,
        commonNameJa: null,
        description: "OPENAI_API_KEY 未設定のため説明の自動生成をスキップしました。",
        rerankScore: 1 - i * 0.01,
        rerankReason: "未設定"
      }));
  }

  if (input.candidates.length === 0) {
    return [];
  }

  const userPrompt = buildUserPrompt(input);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI API: ${res.status} ${t.slice(0, 400)}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(text);
  return parsed.items;
}
