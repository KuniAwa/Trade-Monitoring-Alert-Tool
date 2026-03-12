declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    PERPLEXITY_API_KEY?: string;
    OPENAI_API_KEY?: string;
  }
}

