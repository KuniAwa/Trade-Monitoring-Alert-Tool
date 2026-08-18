declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    OPENAI_API_KEY?: string;
    /** 対話（追加質問）用。未設定時は gpt-5.6-luna */
    OPENAI_MODEL_CONVERSATION?: string;
    /** 回答案・再生成用。未設定時は gpt-5.6-luna */
    OPENAI_MODEL_DRAFT_ANSWER?: string;
    PERPLEXITY_API_KEY?: string;
    /** Agent API preset: fast | low | medium | high | xhigh（既定: fast = 旧 Sonar 相当） */
    PERPLEXITY_AGENT_PRESET?: string;
    BASIC_AUTH_USER?: string;
    BASIC_AUTH_PASSWORD?: string;
  }
}
