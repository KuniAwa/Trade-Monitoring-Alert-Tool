# 日経先物トレード日誌（trade-journal）

日経225先物の取引実績を iPhone から記録し、**相場監視アラートツール（market-alert）と同一データ**
（Yahoo Finance の15分足・1時間足・出来高から算出した指標）を使って、AI が改善点や
「より良い売買条件」を分析・コメントする個人用 Web アプリ（PWA）です。

- **別ツール**として独立（`market-alert` は監視・連携元として存続）
- **DB は Neon（PostgreSQL）**。取引ツール専用の Project を新規作成して使う
- AI は現行アラート条件との一致確認に留まらず、**条件以外も含めた改善仮説**を提案
- **容量削減**を前提に設計（後述）

## 主な機能

1. **取引記録（/trades/new）**: 方向・建値・数量・損切り/利確・決済・根拠メモを iPhone から登録。仮想取引（アラート＝擬似エントリー）も記録可。
2. **取引詳細＋AI分析（/trades/[id]）**: エントリー時点の市況（アラートと同一データ由来）と、エントリー後の値動きから算出した結果ラベル（MFE/MAE・1R/2R）を表示し、AI が改善点をコメント。
3. **条件分析（/analysis）**: 実取引＋仮想シグナルを母数に、押し率帯・時間帯・ATRレジーム・トレンド整合・曜日などのバケット別に勝率/平均Rを集計。AI が現行条件以外も含む改善仮説と検証手順を提示。

## データの流れ

```
market-alert (Python Cron, 15分毎)
   └─ 日経の確定足スナップショット（同一データ）を POST /api/ingest
        └─ Neon に保存（数値は丸め・15分足は直近20本に限定）
trade-journal (この Next.js アプリ / PWA)
   ├─ iPhone から取引登録・閲覧
   ├─ 結果ラベルは分析時に Yahoo の前方足から算出（保存しない＝容量削減）
   └─ OpenAI で取引レビュー・条件探索
```

## 容量削減の対策（Neon 無料枠向け）

「保存先 DB の容量を減らす対策」を以下の形で実装しています。

1. **日経のみ保存**（FX は保存しない）。
2. **数値の丸め**（価格は小数1桁、比率は3桁）で1行のサイズを縮小（`src/lib/compaction.ts`）。
3. **15分足の小窓のみ保存**（直近 `MAX_STORED_15M_BARS=20` 本、`[epoch,o,h,l,c,v]` の配列形式）。
4. **結果ラベルは保存せず分析時に算出**（同一データ＝Yahoo の前方足を都度取得）。
5. **保持日数を過ぎた生OHLCの自動 null 化**（`RAW_OHLC_RETENTION_DAYS`、既定14日）。Vercel Cron で毎日 `/api/maintenance/prune` を実行。
6. **同一足・同一ソースの重複は1件に集約**（`/api/ingest` 内で upsert 相当）。
7. 任意で `deleteScanOlderThanDays` を指定すると、古い `scan` 行（取引に未紐付け）を削除して更に削減（`POST /api/maintenance/prune`）。

## セットアップ

### 1. Neon の準備

1. [Neon](https://neon.tech) で **取引ツール専用の Project を新規作成**（山野草アプリとは分離）。
2. 接続文字列を2種類控える:
   - `DATABASE_URL`: **-pooler** 付き（pooled）エンドポイント
   - `DIRECT_URL`: 直結エンドポイント（migrate 用）

### 2. ローカル

```bash
cd trade-journal
npm install
cp .env.example .env   # 値を埋める
npm run prisma:migrate # 初回マイグレーション（DIRECT_URL を使用）
npm run dev
```

`http://localhost:3000` を開く。

### 3. Vercel デプロイ

1. リポジトリを Vercel にインポートし、**Root Directory** を `trade-journal` に設定。
2. 環境変数（Production）を設定: `DATABASE_URL` / `DIRECT_URL` / `OPENAI_API_KEY` / `INGEST_SECRET` / `NIKKEI_SYMBOL` / `RAW_OHLC_RETENTION_DAYS` /（任意）`CRON_SECRET`・`OPENAI_MODEL_*`。
3. `build` で `prisma generate` が走ります。マイグレーション反映は `npm run prisma:deploy`（`DIRECT_URL`）をローカルまたは CI で実行。
4. デプロイ後の URL を控える（例: `https://trade-journal.vercel.app`）。

### 4. market-alert との連携

`market-alert` 側の環境変数に以下を追加し Redeploy:

| 変数 | 値 |
|------|-----|
| `TRADE_JOURNAL_INGEST_URL` | `https://trade-journal.vercel.app/api/ingest` |
| `TRADE_JOURNAL_INGEST_SECRET` | この `trade-journal` の `INGEST_SECRET` と同じ値 |

これで 15分ごとの日経評価時にスナップショットが自動投入されます。

### 5. iPhone で使う

Safari でデプロイ URL を開き、共有メニューから **「ホーム画面に追加」**。アプリのように起動できます（PWA）。

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `DATABASE_URL` | ○ | Neon pooled 接続（実行時クエリ） |
| `DIRECT_URL` | ○ | Neon 直結（migrate） |
| `OPENAI_API_KEY` | - | 未設定でもダミー応答で動作確認可 |
| `INGEST_SECRET` | ○ | `/api/ingest`・`/api/maintenance/prune` の認証 |
| `CRON_SECRET` | - | Vercel Cron（prune）認証 |
| `NIKKEI_SYMBOL` | - | Yahoo 取得シンボル（既定 `NIY=F`→`^N225`） |
| `RAW_OHLC_RETENTION_DAYS` | - | 生OHLC保持日数（既定14） |
| `OPENAI_MODEL_TRADE_REVIEW` | - | 取引レビュー用モデル上書き |
| `OPENAI_MODEL_CONDITION_DISCOVERY` | - | 条件探索用モデル上書き |

## 注意

- 本ツールは取引の振り返り支援を目的とした個人用です。**投資助言ではなく、最終判断は利用者自身**が行います。
- AI の改善仮説は**過学習の可能性がある仮説**です。必ず集計（勝率・平均R）と併せて検証してください。
- サンプル数が少ないうちは統計的な結論は出にくいため、仮想取引も活用して母数を増やすことを推奨します。
