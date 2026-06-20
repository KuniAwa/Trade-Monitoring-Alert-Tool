/**
 * OpenAI に渡すモデルIDを用途別に解決する。環境変数で上書き可能。
 */
export type OpenAiUsageSlot =
  /** 取引1件のレビュー（改善コメント） */
  | "trade_review"
  /** 集計に基づく売買条件の探索・改善仮説 */
  | "condition_discovery";

const DEFAULT_MODEL_BY_SLOT: Record<OpenAiUsageSlot, string> = {
  trade_review: "gpt-4.1-mini",
  condition_discovery: "gpt-5.4"
};

export const OPENAI_MODEL_ENV_KEYS: Record<OpenAiUsageSlot, string> = {
  trade_review: "OPENAI_MODEL_TRADE_REVIEW",
  condition_discovery: "OPENAI_MODEL_CONDITION_DISCOVERY"
};

export function resolveOpenAiModel(slot: OpenAiUsageSlot): string {
  const envKey = OPENAI_MODEL_ENV_KEYS[slot];
  const raw = process.env[envKey];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return DEFAULT_MODEL_BY_SLOT[slot];
}
