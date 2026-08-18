# JGAAP Support Tool（web-jgaap）

ASBJ（企業会計基準委員会）の会計基準検索システムから保存した **HTML** を正本とする、個人向け日本基準の会計判断支援ツールです。IFRS 用の `web-ifrs` とは別アプリ・別データベースです。

## 機能

- **基準取込**: ASBJ HTML（会計基準 / 適用指針）をアップロードし、項番号・見出し・本文を自動抽出
- **判断ケース**: 日本語でケース作成 → 対話 → 構造化回答案 → 引用検証 → フィードバック → 再生成
- **Perplexity 検索**: 補助情報。回答案の「参考」に要約・URL 付きで記載（規範引用には使わない）
- **Basic 認証**: `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` が両方あるときのみ有効（Vercel 向け）

基準照会機能はありません。

## 起動手順

```bash
cd web-jgaap
cp .env.example .env.local
# OPENAI_API_KEY / PERPLEXITY_API_KEY を必要に応じて設定

npm install
npx prisma migrate dev
npm run dev
```

ブラウザで http://localhost:3001 を開く（IFRS ツールの 3000 番と同時起動できます）。

Windows では `start-dev.bat`、またはデスクトップの「JGAAP-Start」ショートカットでも起動できます。

サンプル HTML（`sample/`）を取り込む場合:

```bash
npx tsx --tsconfig tsconfig.json scripts/ingest-samples.ts
```

## 環境変数

| 変数 | 説明 |
|------|------|
| `DATABASE_URL` | Neon (Postgres) の接続URL（例: `postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require`） |
| `OPENAI_API_KEY` | 対話・回答案生成（未設定時はダミー） |
| `OPENAI_MODEL_CONVERSATION` | 対話（追加質問）用モデル（既定: `gpt-5.6-luna`） |
| `OPENAI_MODEL_DRAFT_ANSWER` | 回答案・再生成用モデル（既定: `gpt-5.6-luna`） |
| `PERPLEXITY_API_KEY` | 補助検索（未設定時はダミー） |
| `PERPLEXITY_AGENT_PRESET` | Agent API preset（既定: `fast` = 旧 Sonar 相当。`low` / `medium` / `high` で深い調査） |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | 両方あるとき Basic 認証。ローカルでは空でよい |

対話と回答案は別モデルにできます。未設定時はどちらも `gpt-5.6-luna` です。回答案だけ精度を上げる場合は `.env.local` に `OPENAI_MODEL_DRAFT_ANSWER=gpt-5.6-terra` を追加してください。

### Perplexity（Agent API）

2026年9月27日までに Sonar Chat Completions（`/chat/completions`）は廃止予定のため、本ツールは **Agent API**（`/v1/agent`）を使用します。

**Perplexity 側で必要なこと**

- 既存の `PERPLEXITY_API_KEY` をそのまま使えます（新しいキー種別は不要）
- [Perplexity API Platform](https://www.perplexity.ai/account/api) で API キーが有効であることを確認
- 従量課金（pay-as-you-go）で Agent API が利用可能（Sonar 時代と同様）
- 検索の深さを変えたい場合のみ `.env.local` に `PERPLEXITY_AGENT_PRESET=low` 等を追加（既定 `fast` で旧 Sonar 相当）

変数を変更したら開発サーバーを再起動してください。

## 手動テスト手順

1. `/standards/new` で `sample/収益認識に関する会計基準.html` を取込
2. 続けて適用指針 HTML を取込
3. 基準詳細で項番号・見出し・レビュー状態を確認
4. `/cases/new` でケースを作成し、両基準をリンク
5. 対話・Perplexity 検索・回答案生成・引用検証を確認

## 次フェーズ（GitHub / Vercel）で行うこと

- Vercel の Root Directory を `web-jgaap` にする
- `DATABASE_URL` を Postgres（Neon）に切り替える（Vercel のビルドで `prisma migrate deploy` が走ります）
- Basic 認証または Vercel Deployment Protection を有効化する
- ASBJ HTML 原本と `.env.local` はリポジトリに含めない（`.gitignore` 済み）

## 著作権

条文は FASF / ASBJ の基準です。再配布・商用利用は公表元の利用条件に従ってください。
