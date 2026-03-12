import { DraftAnswerStructured } from "@/lib/types";

export interface FollowupQuestionInput {
  standard: "JGAAP" | "IFRS" | "BOTH";
  transactionSummary: string;
  initialQuestion: string;
  notebookSummaries: string[];
  standardLinks: string[];
  previousConversation: { role: "user" | "assistant"; content: string }[];
  searchSummaries: string[];
}

export function buildFollowupQuestionPrompt(input: FollowupQuestionInput): string {
  const {
    standard,
    transactionSummary,
    initialQuestion,
    notebookSummaries,
    standardLinks,
    previousConversation,
    searchSummaries
  } = input;

  const standardLabel =
    standard === "JGAAP"
      ? "日本基準（J-GAAP）"
      : standard === "IFRS"
      ? "IFRS"
      : "日本基準およびIFRSの両方";

  return [
    "あなたは日本基準およびIFRSに精通した会計専門家として、会計論点の検討プロセスを支援します。",
    "",
    "目的: 不足している事実や前提条件を洗い出すための「追加質問」を段階的に生成することです。",
    "",
    `対象となる会計基準区分: ${standardLabel}`,
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
    "【Perplexity 検索結果の要約（補助情報）】",
    searchSummaries.length ? searchSummaries.join("\n---\n") : "（未取得）",
    "",
    "制約条件:",
    "- 会計基準本文の全文引用は行わず、要点ベースで扱うこと",
    "- Web検索結果はあくまで補助情報とし、基準リンクとNotebookLM要約を優先すること",
    "- 不足情報がある場合は、結論を急がず、まず「どの事実が必要か」を明確にすること",
    "",
    "出力フォーマット:",
    "1. 追加で確認すべき主要な事実を 3〜7 個の箇条書きで列挙してください。",
    "2. 各項目について、「なぜその事実が会計処理の選択に影響するか」を1〜2文で説明してください。",
    "",
    "回答は日本語で、ユーザーに直接問いかける形で出力してください。"
  ].join("\n");
}

