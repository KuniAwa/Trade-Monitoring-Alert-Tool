const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** 追加質問（対話）用モデル */
export function getOpenAiConversationModel(): string {
  return process.env.OPENAI_MODEL_CONVERSATION?.trim() || DEFAULT_OPENAI_MODEL;
}

/** 回答案生成・フィードバック再生成用モデル */
export function getOpenAiDraftAnswerModel(): string {
  return process.env.OPENAI_MODEL_DRAFT_ANSWER?.trim() || DEFAULT_OPENAI_MODEL;
}

export function isPerplexityConfigured(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY?.trim());
}

/** Agent API preset（Sonar 相当は fast）。https://docs.perplexity.ai/docs/agent-api/presets */
export function getPerplexityAgentPreset(): string {
  return process.env.PERPLEXITY_AGENT_PRESET?.trim() || "fast";
}
