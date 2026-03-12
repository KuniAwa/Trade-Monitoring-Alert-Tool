## 会計判断支援Webアプリ（MVP）

日本基準とIFRSに関する会計論点について、
「会計基準リンク」「NotebookLM要約」「Perplexity検索結果」「ユーザーとの反復Q&A」
をもとに、会計処理の選択肢と推奨案を提示する **個人用MVPツール** です。

この `web` ディレクトリは Next.js(App Router) + TypeScript + Tailwind CSS + Prisma + SQLite を利用したフロントエンド/バックエンド一体型アプリです。

---

## ディレクトリ構成（MVP時点）

- `app/`
  - `layout.tsx` … 共通レイアウト・サイドバー・免責文言
  - `page.tsx` … `/` ダッシュボード（最近のケース + 新規作成ボタン）
  - `cases/new/page.tsx` … 新規ケース作成
  - `cases/[id]/page.tsx` … ケース詳細（Q&A / 検索 / 回答案 / フィードバック）
  - `history/page.tsx` … 過去ケース一覧
  - `settings/page.tsx` … 利用方法・注意事項・免責
  - `api/perplexity/search/route.ts` … Perplexity検索API（将来のクライアント直呼び出し用）
- `prisma/schema.prisma` … DBスキーマ
- `src/lib/`
  - `prisma.ts` … Prismaクライアント
  - `types.ts` … 回答案などの型定義
  - `aiClient.ts` … OpenAI API 呼び出しラッパー
  - `perplexity.ts` … Perplexity API 呼び出しラッパー
- `prompts/`
  - `followupQuestions.ts` … プロンプトモード1: 追加質問生成
  - `draftAnswer.ts` … プロンプトモード2: 回答案生成
  - `refineWithFeedback.ts` … プロンプトモード3: フィードバック反映再生成
- `src/styles/globals.css` … Tailwind + 共通スタイル
- `.env.example` … 必要な環境変数の例

---

## 実装済み機能（MVP）

- **ケース管理**
  - 新規ケース作成（ケース名、論点ラベル、会計基準区分、日本基準/IFRS/両方、取引概要、最初の質問）
  - 会計基準リンクの複数入力（1行1URL）
  - NotebookLM要約の貼り付け・保存
  - ケース一覧（ダッシュボードの最近のケース / `/history` の全件一覧）
  - ケース詳細の表示（基本情報・基準リンク・NotebookLM要約）

- **Perplexity検索連携**
  - ケース詳細画面から検索クエリを入力し、Perplexity API を実行
  - `title / snippet / url / source` を `SearchResult` としてDB保存
  - 失敗時・APIキー未設定時も、説明付きのダミー結果を返してアプリが止まらない設計

- **対話（追加質問モード）**
  - ユーザー回答を `ConversationTurn` として保存
  - 取引概要 / 最初の質問 / NotebookLM要約 / 会計基準リンク / 検索結果 / 既存対話履歴をもとに、
    プロンプトモード1（追加質問生成）でAIを呼び出し
  - AIからの追加質問を `ConversationTurn` として保存し、タイムライン形式で表示

- **回答案生成**
  - ケース詳細画面で「回答案を生成」ボタンを押すと、
    プロンプトモード2（回答案生成）でAIを呼び出し
  - 結果を `DraftAnswer` として保存し、最新1件を画面右ペインに表示
  - 回答案は「論点 / 追加確認した事実 / 選択肢A/B/C / 推奨案 / 仕訳例 / 参照情報 / 不確実性・残論点」の形式で作成されるようプロンプトを設計

- **フィードバック保存**
  - 回答案に対して「妥当 / 不足 / 誤り / 要再検討」の評価とコメントを保存
  - 最新の `DraftAnswer` に紐づく `Feedback` としてDB保存
  - プロンプトモード3（フィードバック反映再生成）の設計済み（将来、改訂版回答案生成に利用可能）

---

## ローカル起動手順

※ Node.js と npm がインストールされている前提です。

1. 依存関係インストール

   ```bash
   cd web
   npm install
   ```

2. 環境変数設定

   ```bash
   cd web
   cp .env.example .env.local
   # 必要に応じて PERPLEXITY_API_KEY / OPENAI_API_KEY を編集
   ```

3. Prisma セットアップ（初回のみ）

   ```bash
   cd web
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. 開発サーバ起動

   ```bash
   cd web
   npm run dev
   ```

5. ブラウザで `http://localhost:3000` を開く

---

## GitHub への push 手順（例）

1. まだGitリポジトリでなければ初期化（既にGit管理済みなら不要）

   ```bash
   git init
   git add .
   git commit -m "init accounting advisor mvp"
   ```

2. GitHub リポジトリを作成し、リモートを追加

   ```bash
   git remote add origin https://github.com/your-account/your-repo.git
   git push -u origin main
   ```

※ `.env.local` や `node_modules` は `.gitignore` によりコミットされません。

---

## Vercel デプロイ手順（想定）

1. GitHub 上のリポジトリを Vercel にインポート
   - Project Root: リポジトリルート
   - Framework Preset: Next.js
   - Root Directory に `web` を指定（必要に応じて）

2. Environment Variables を設定
   - `DATABASE_URL` … 開発と同様に `file:./dev.db` も可（小規模な個人利用想定）
     - 将来は Supabase / Vercel Postgres に変更予定
   - `PERPLEXITY_API_KEY` … 任意（未設定でも動くが、検索はダミー）
   - `OPENAI_API_KEY` … 任意（未設定でも動くが、AI応答はダミー）

3. `Build Command` / `Output Directory`
   - Build Command: `npm run build`
   - Output Directory: `.next`（Next.js デフォルト）

4. Deploy を実行

---

## 今後の拡張ポイント

- **認証 / マルチユーザー対応**
  - 現在は個人用前提（認証なし）。将来はユーザーごとに Case を紐づける設計に拡張可能。

- **回答案の構造化**
  - 現状は Markdownベースで `DraftAnswer.structuredAnswerJson` に保存。
  - 将来、JSON構造で保存し、画面側で「選択肢A/B/C」「仕訳例」を部品として再利用可能にする。

- **フィードバック反映再生成（モード3）のUI実装**
  - 既にプロンプトとAIクライアント側のモード定義あり。
  - フィードバック保存後に「フィードバックを反映して再生成」ボタンを追加し、改訂版回答案を生成・比較表示する。

- **NotebookLM API 連携**
  - 今回は手動貼り付け。将来、NotebookLM API または他の要約サービスへの差し替えを `interface` ベースで行う。

- **DBの本番向け移行**
  - SQLite から Supabase や Vercel Postgres へ `provider` の切り替え + migration。

