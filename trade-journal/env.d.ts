declare namespace NodeJS {
  interface ProcessEnv {
    /** Neon 接続文字列（pooled / -pooler エンドポイント）。実行時クエリ用 */
    DATABASE_URL: string;
    /** Neon 直結エンドポイント。Prisma migrate 用 */
    DIRECT_URL?: string;
    /** OpenAI APIキー（取引レビュー・条件探索） */
    OPENAI_API_KEY?: string;
    /** market-alert からのスナップショット投入を認証する共有シークレット */
    INGEST_SECRET?: string;
    /** Vercel Cron（prune）認証用シークレット */
    CRON_SECRET?: string;
    /** 既定 gpt-4.1-mini（取引1件レビュー） */
    OPENAI_MODEL_TRADE_REVIEW?: string;
    /** 既定 gpt-5.4（条件探索・改善仮説） */
    OPENAI_MODEL_CONDITION_DISCOVERY?: string;
    /** 分析時に Yahoo から日経データを取得するシンボル（既定 NIY=F→^N225 を順に試行） */
    NIKKEI_SYMBOL?: string;
    /** 生OHLC窓を保持する日数。これを過ぎたら prune で null 化（既定 14） */
    RAW_OHLC_RETENTION_DAYS?: string;
  }
}
