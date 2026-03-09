# 相場監視アラートツール（Vercel + Twelve Data）

**USD/JPY・EUR/JPY・AUD/JPY**（およびオプションで日経225）を15分ごとに監視し、**前日高値/安値ブレイク** かつ **15分足20MA・パラボリックSAR** に加え、**1時間足の環境認識** と **押し率50%未満** を満たしたときにメールで通知します。監視時間は `settings.json` で変更可能です。自動売買は行いません。

- 仕様の詳細は [docs/SPEC.md](docs/SPEC.md) を参照してください。

## 前提

- **Vercel Pro** 以上（Cron 利用のため）
- **Twelve Data** の API キー（時系列のみ利用。SMA・パラボリックSAR はアプリ内計算のため無料プランでも可）
- メール送信用の **SMTP** 設定（Gmail / SendGrid / 自社SMTP など）

## Vercel へのデプロイ手順

### 方法A: Vercel ダッシュボードから（Git リポジトリを接続）

1. **Git にプッシュ**  
   このプロジェクトを GitHub / GitLab / Bitbucket のリポジトリにプッシュする。

2. **Vercel でインポート**  
   - [vercel.com](https://vercel.com) にログイン → **Add New…** → **Project**  
   - **Import Git Repository** で該当リポジトリを選択  
   - **Root Directory** がリポジトリルート（このプロジェクトのルート）になっていることを確認  
   - **Deploy** をクリック

3. **環境変数を設定**（下記「環境変数の設定」を参照）後、**Redeploy** で再デプロイする。

### 方法B: Vercel CLI でデプロイ

1. **Node.js** をインストール後、ターミナルで次を実行:
   ```bash
   npm i -g vercel
   ```
2. プロジェクトのルート（`api` と `vercel.json` があるフォルダ）で:
   ```bash
   vercel
   ```
   初回はログインとプロジェクト名の入力が求められます。
3. 本番デプロイ:
   ```bash
   vercel --prod
   ```
4. 環境変数は **Vercel ダッシュボード** で設定するか、`vercel env add` で追加する。

---

## 環境変数の設定

Vercel ダッシュボードの **Project → Settings → Environment Variables** で以下を設定してください。

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `CRON_SECRET` | ○ | 16文字以上のランダム文字列。Cron 呼び出しの認証に使用。 |
| `TWELVE_DATA_API_KEY` | ○ | Twelve Data の API キー。 |
| `ALERT_MAIL_FROM` | ○ | 送信元メールアドレス。 |
| `ALERT_MAIL_TO` | ○ | 通知先メールアドレス。 |
| `SMTP_HOST` | ○ | SMTP サーバー（例: `smtp.gmail.com`）。 |
| `SMTP_PORT` | ○ | ポート（例: `587`）。 |
| `SMTP_USER` | ○ | SMTP 認証ユーザー。 |
| `SMTP_PASSWORD` | ○ | SMTP 認証パスワード。 |
| `NIKKEI_SYMBOL` | - | 日経225用のシンボル。**Twelve Data では N225 は無効**なため、未設定なら日経は監視せず USD/JPY のみ。有効なシンボルが分かれば設定可。 |

**CRON_SECRET** の生成例:

```bash
openssl rand -hex 32
```

※ 環境変数は **Production / Preview / Development** のうち、Cron を動かしたい環境（通常は Production）に設定してください。設定後は **Redeploy** が必要です。

Cron は **本番デプロイ** でのみ実行されます。15分ごとに `GET /api/cron` が呼ばれ、`Authorization: Bearer <CRON_SECRET>` が付与されます。

## 動作確認

- 本番: 15分ごとに Vercel が自動で `/api/cron` を呼び出します。
- 手動テスト（ローカル）:
  - `.env` に上記の環境変数を設定し、`Authorization: Bearer <CRON_SECRET>` を付けて `GET /api/cron` を叩く。
- Vercel 上で手動実行する場合は、同じ URL に `Authorization: Bearer <CRON_SECRET>` を付けてリクエストしてください。

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-project.vercel.app/api/cron"
```

成功時は `{"ok": true, "sent": 0}` のような JSON が返ります。条件が成立していると `sent` が 1 以上になります。

## 監視時間（settings.json）

ルートの **`settings.json`** で、監視を行う時間帯（日本時間）を指定できます。この時間外は条件判定をスキップします。

```json
{
  "monitor": {
    "start_jst": "09:00",
    "end_jst": "23:59"
  }
}
```

- `start_jst` … 監視開始時刻（JST、`"HH:MM"`）
- `end_jst` … 監視終了時刻（JST、`"HH:MM"`）  
  ※ 例: 9時～翌2時なら `"start_jst": "09:00"`, `"end_jst": "02:00"`（翌日跨ぎ対応）

## ファイル構成

| ファイル | 説明 |
|----------|------|
| `api/cron.py` | Cron エンドポイント。Twelve Data 取得・条件判定・メール送信。 |
| `settings.json` | 監視時間（`monitor.start_jst` / `end_jst`）の設定。 |
| `vercel.json` | Cron スケジュール `*/15 * * * *`。 |
| `requirements.txt` | Python 依存（`requests`）。 |
| `docs/SPEC.md` | 仕様書。 |

## 注意事項

- **監視対象**: USD/JPY, EUR/JPY, AUD/JPY（＋ NIKKEI_SYMBOL 設定時は日経225）。**1時間足**で環境認識（20MAトレンド）、**押し率**は33%以内を理想・50%以上は通知対象外です。
- **Twelve Data**: 日足・15分足・1時間足を取得。SMA・SAR はアプリ内計算。1回の Cron は銘柄数 × 3 リクエスト（日足・15分・1h）。
- **日経225**: Twelve Data では `N225` は無効（404）です。`NIKKEI_SYMBOL` を**未設定のまま**にすると USD/JPY のみ監視します。日経を監視したい場合は [Twelve Data のシンボル検索](https://twelvedata.com/docs#symbol-search) で有効なシンボルを確認し、設定してください。
- 重複通知の防止は「同一 Cron 実行内で同一銘柄・同一方向は1回まで」です。日をまたぐ重複を防ぐには Vercel KV 等の永続ストアの利用を検討してください（仕様書に記載）。

## ライセンス

MIT またはご希望のライセンスを適用してください。
