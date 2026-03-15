/**
 * 論点ラベルごとに「追加質問で確認すべき観点」を定義。
 * キーは大文字・小文字・前後空白を無視してマッチさせる想定。
 */
export const TOPIC_CONFIRMATION_HINTS: Record<string, string> = {
  収益認識:
    "履行義務の識別、取引価格の算定・配分、履行義務への配分額の認識時点（時点/期間）、契約の組み合わせ・変更。",
  リース:
    "リース期間、所有権移転の有無、最低リース料の現価、オペレーティング・ファイナンスの区分、サブリース・改定。",
  のれん:
    "のれんの発生原因（取得対価の配分）、減損の兆候・テスト単位、回収可能価額の算定、非割引キャッシュフロー。",
  減損:
    "資産のグルーピング、減損の兆候、使用価値・正味売却価格の算定、将来キャッシュフローの見積もり。",
  資産除去債務:
    "除去範囲・時期、原価の見積もり、割引率、計上時点（取得時/発生時）。",
  株主資本:
    "自己株式、ストックオプション、その他の純資産の部の表示、配当・中間配当。",
  キャッシュフロー:
    "営業・投資・財務の区分、金利の表示区分、為替換算、重要な非 cash 取引。",
  関連当事者:
    "関連当事者の範囲、取引の内容・条件、注記開示の要否。",
  外貨換算:
    "機能通貨、換算日・換算レート、為替差損益の計上区分。",
  リスク・不確実性:
    "重要な見積りの不確実性、開示すべきリスク、注記の内容。"
};

export interface SearchResultItem {
  query: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface FollowupQuestionInput {
  standard: "JGAAP" | "IFRS" | "BOTH";
  topicLabel: string | null;
  transactionSummary: string;
  initialQuestion: string;
  notebookSummaries: string[];
  standardLinks: string[];
  previousConversation: { role: "user" | "assistant"; content: string }[];
  /** 構造化された検索結果（クエリ・タイトル・要約・URL・ソース）。従来の searchSummaries は内部で構築。 */
  searchResults: SearchResultItem[];
}

function normalizeTopicLabel(label: string | null): string {
  if (!label || !label.trim()) return "";
  return label.trim();
}

function getTopicHint(topicLabel: string | null): string {
  const key = normalizeTopicLabel(topicLabel);
  if (!key) {
    return "論点ラベルが未指定のため、取引概要と最初の質問から、会計処理の選択に必要な事実・前提を洗い出してください。";
  }
  for (const [hintKey, hintText] of Object.entries(TOPIC_CONFIRMATION_HINTS)) {
    if (key === hintKey || key.includes(hintKey) || hintKey.includes(key)) {
      return `このケースの論点ラベルは「${key}」です。該当論点では特に次の観点の確認が重要です: ${hintText}`;
    }
  }
  return `論点ラベルは「${key}」です。この論点に応じ、該当する会計基準で求められる確認事項（事実関係・前提条件・適用条件）を想起し、追加質問を構成してください。`;
}

/** 検索結果をクエリ別にまとめて、プロンプト用の文字列を生成 */
function formatSearchResultsForPrompt(items: SearchResultItem[]): string {
  if (items.length === 0) return "（未取得）";

  const byQuery = new Map<string, SearchResultItem[]>();
  for (const r of items) {
    const q = r.query || "（クエリ不明）";
    if (!byQuery.has(q)) byQuery.set(q, []);
    byQuery.get(q)!.push(r);
  }

  const blocks: string[] = [];
  let index = 0;
  for (const [query, list] of byQuery) {
    blocks.push(`検索クエリ: "${query}"`);
    for (const r of list) {
      index += 1;
      blocks.push(
        `  [${index}] タイトル: ${r.title}`,
        `      要約: ${r.snippet}`,
        `      URL: ${r.url}`,
        `      ソース: ${r.source}`
      );
    }
    blocks.push("");
  }
  return blocks.join("\n");
}

export function buildFollowupQuestionPrompt(input: FollowupQuestionInput): string {
  const {
    standard,
    topicLabel,
    transactionSummary,
    initialQuestion,
    notebookSummaries,
    standardLinks,
    previousConversation,
    searchResults
  } = input;

  const standardLabel =
    standard === "JGAAP"
      ? "日本基準（J-GAAP）"
      : standard === "IFRS"
        ? "IFRS"
        : "日本基準およびIFRSの両方";

  const topicSection = getTopicHint(topicLabel);
  const searchBlock = formatSearchResultsForPrompt(searchResults);

  return [
    "あなたは日本基準およびIFRSに精通した会計専門家として、会計論点の検討プロセスを支援します。",
    "",
    "目的: 不足している事実や前提条件を洗い出すための「追加質問」を段階的に生成することです。",
    "",
    `対象となる会計基準区分: ${standardLabel}`,
    "",
    "【論点ラベルに基づく確認観点】",
    topicSection,
    "",
    "【取引概要】",
    transactionSummary,
    "",
    "【利用者からの最初の質問】",
    initialQuestion,
    "",
    "【会計基準リンク（ユーザー指定）】",
    standardLinks.length ? standardLinks.join("\n") : "（指定なし）",
    "",
    "【NotebookLM 要約】",
    notebookSummaries.length ? notebookSummaries.join("\n---\n") : "（未入力）",
    "",
    "【これまでの対話の要約】",
    previousConversation.length
      ? previousConversation
          .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
          .join("\n")
      : "（まだ対話はありません）",
    "",
    "【Perplexity 検索結果（補助情報・参照用）】",
    "検索結果は番号[1],[2],…で参照できます。基準リンクとNotebookLM要約を最優先しつつ、必要に応じて「検索結果[○]の〇〇を踏まえ」のように参照し、論点に関連する事実の有無や解釈を確認する質問を含めてください。",
    "",
    searchBlock,
    "",
    "制約条件:",
    "- 会計基準本文の全文引用は行わず、要点ベースで扱うこと",
    "- 検索結果は補助情報とし、基準リンクとNotebookLM要約を優先して解釈すること",
    "- 不足情報がある場合は、結論を急がず、まず「どの事実が必要か」を明確にすること",
    "- 論点ラベルに応じ、その論点で典型的に必要な確認を漏らさないこと",
    "",
    "出力フォーマット:",
    "1. 追加で確認すべき主要な事実を 3〜7 個の箇条書きで列挙してください。",
    "2. 各項目について、「なぜその事実が会計処理の選択に影響するか」を1〜2文で説明してください。",
    "3. 検索結果を参照した場合は、該当番号（例: 検索結果[1]）に言及してください。",
    "",
    "回答は日本語で、ユーザーに直接問いかける形で出力してください。"
  ].join("\n");
}
