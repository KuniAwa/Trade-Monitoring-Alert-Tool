# GitHub プッシュ後の次のステップ

GitHub にコードが上がったら、**Vercel にデプロイ**してアラートを動かします。

---

## ステップ 1: Vercel にリポジトリをインポート

1. **https://vercel.com** にアクセスしてログイン（GitHub アカウントで連携可能）
2. 右上 **Add New…** → **Project** をクリック
3. **Import Git Repository** の一覧から **KuniAwa/Trade-Monitoring-Alert-Tool** を選択
4. **Root Directory** を **`market-alert`** に設定する（このリポジトリがモノレポの場合）
5. **Deploy** をクリック
6. ビルドが終わるまで待つ（1〜2分程度）
7. 完了後、**https://trade-monitoring-alert-tool.vercel.app** のような URL が表示される

※ この時点では環境変数がまだないため、Cron を叩いてもエラーになります。次のステップで設定します。

---

## ステップ 2: 環境変数を設定

### 環境変数の画面の開き方

**重要:** まず **プロジェクトを1つ選んで開いた状態** にします（ダッシュボードの一覧ではなく、そのプロジェクトの中に入っている状態）。

1. **https://vercel.com** を開く
2. 画面上部または左の **プロジェクト一覧** から **trade-monitoring-alert-tool**（または作成したプロジェクト名）を **クリックして開く**
3. プロジェクトを開いたら、**上タブ** または **左サイドバー** の **Settings** をクリック
4. Settings の **左サブメニュー** に **Environment Variables** があるのでクリック

※ 見つからない場合:
- **Team の Settings** ではなく、**そのプロジェクトの Settings** を開いているか確認
- 左に **Overview / Deployments / Analytics / Settings** などが並んでいる画面で、**Settings** を開いたあと、左に **General / Domains / Environment Variables / ...** のような一覧が出る

**直接URLで開く方法:**  
次の URL の `あなたのチーム名` と `プロジェクト名` を実際の名前に置き換えてブラウザで開く:
```
https://vercel.com/あなたのチーム名/プロジェクト名/settings/environment-variables
```
例（個人アカウントでプロジェクト名が trade-monitoring-alert-tool の場合）:
```
https://vercel.com/kuni-awa/trade-monitoring-alert-tool/settings/environment-variables
```
（チーム名は Vercel のプロジェクトURLやチームスラッグで確認できます）

---

### 変数の追加手順（1つずつ追加）

1. **Environment Variables** の画面で、**「Add New」** または **「Add」** または **「Key」と「Value」の入力欄** を探す
2. **Key** の欄に変数名を入力（例: `CRON_SECRET`）
3. **Value** の欄に値を入力（あなたの実際の値）
4. **Environment** で **Production** にチェックを入れる（Cron は本番で動かすため。Preview / Development は不要ならオフでOK）
5. **Save** または **Add** をクリックして1つ目を保存
6. 次の変数を追加するため、再度 **Add New** をクリックし、2〜5 を繰り返す

※ 1回の操作で追加できるのは1つ（Key + Value の1セット）です。8個の変数なら、同じ手順を8回繰り返します。

| Key | Value（例） |
|-----|-------------|
| `CRON_SECRET` | 自分で決めた16文字以上のランダム文字列（例: `a1b2c3d4e5f6g7h8i9j0`） |
| `TWELVE_DATA_API_KEY` | [Twelve Data](https://twelvedata.com) で取得した API キー |
| `ALERT_MAIL_FROM` | 送信元メールアドレス（Gmail ならあなたの Gmail アドレス） |
| `ALERT_MAIL_TO` | 通知を受け取りたいメールアドレス |
| `SMTP_HOST` | Gmail なら `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | SMTP のログイン用メールアドレス（Gmail なら Gmail アドレス） |
| `SMTP_PASSWORD` | Gmail なら「アプリパスワード」（2段階認証を有効にしたうえで [Google アカウント](https://myaccount.google.com/apppasswords) で発行） |

4. すべて追加したら **Save** を忘れずに

**CRON_SECRET** は後で手動テストするときに使うので、控えておいてください。

---

## ステップ 3: 再デプロイ（環境変数を反映）

環境変数は「既存のデプロイ」には自動では入りません。反映するために再デプロイします。

1. プロジェクト画面の **Deployments** タブを開く
2. いちばん上（最新）のデプロイの **⋯**（縦三点）をクリック
3. **Redeploy** を選択
4. **Redeploy** を再度クリックして実行
5. 完了するまで待つ

---

## 再デプロイができているかの確認

1. **Deployments タブを開く**  
   プロジェクト画面で **Deployments** をクリック
2. **いちばん上（最新）のデプロイ** を見る  
   - **Status** が **Ready**（緑のチェック）になっていれば、そのデプロイは完了している  
   - **Created** の日時が「いま Redeploy した直後」なら、それが今回の再デプロイ
3. **Redeploy した直後なら**  
   数秒〜1分ほど待つと、新しい行が追加され、Status が **Building** → **Ready** に変わる。**Ready** になれば再デプロイ完了

※ **Ready** のデプロイが「本番（Production）」として使われています。環境変数を変えたあとは、必ず **Redeploy** して新しいデプロイを **Ready** にすると、その環境変数が反映されます。

---

## Deployment Protection をオフにする（手動テストで「Authentication Required」が出る場合）

`/api/cron` にアクセスすると「Authentication Required」の HTML が返る場合は、**Deployment Protection** が有効です。Cron 用には `CRON_SECRET` で認証しているため、Vercel の保護はオフにして問題ありません。

1. プロジェクトの **Settings** を開く
2. 左メニューで **Deployment Protection** をクリック
3. **Protection Level** で **None** を選ぶ（または **Standard Protection** の場合は、本番の「生成URL」も保護されるため **None** に変更）
4. 保存する

これで `https://プロジェクト名-xxxx.vercel.app/api/cron` に、`Authorization: Bearer CRON_SECRET` を付けてアクセスできるようになります。API 側で CRON_SECRET を検証しているため、第三者による不正アクセスは防げます。

---

## ステップ 4: 動作確認（手動テスト）

1. デプロイ完了後、表示されている **本番 URL** を控える（例: `https://trade-monitoring-alert-tool-9xcdw5k92.vercel.app`）
2. ブラウザまたは curl で次の URL にアクセスする（`CRON_SECRET` と URL を実際の値に置き換え）:

   ```
   https://あなたのプロジェクト.vercel.app/api/cron
   ```
   その際、**リクエストにヘッダーを付ける**必要があります。
   - ブラウザ: 通常のアクセスではヘッダーを付けられないため、**PowerShell** で次を実行:
     ```powershell
     $headers = @{ Authorization = "Bearer あなたのCRON_SECRET" }
     Invoke-RestMethod -Uri "https://あなたのプロジェクト.vercel.app/api/cron" -Headers $headers
     ```
   - または [Postman](https://www.postman.com/) 等で GET リクエストに `Authorization: Bearer あなたのCRON_SECRET` を付けて送る

3. 成功すると `{"ok": true, "sent": 0}` のような JSON が返ります（条件が成立していなければ `sent` は 0 のままです）
4. エラーなら `{"ok": false, "error": "..."}` のようにメッセージが返るので、環境変数や Twelve Data のキーを確認してください

### 500 エラーが出たときの確認方法

1. **レスポンス本文を確認する**（PowerShell）:
   ```powershell
   $headers = @{ Authorization = "Bearer あなたのCRON_SECRET" }
   try {
     Invoke-WebRequest -Uri "https://あなたのURL.vercel.app/api/cron" -Headers $headers -UseBasicParsing
   } catch {
     $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
     $reader.ReadToEnd()
   }
   ```
   表示された JSON の `error` に原因が書かれています。
2. **Vercel のログを確認する**: プロジェクト → **Deployments** → 最新のデプロイをクリック → **Functions** または **Logs** で `/api/cron` の実行ログを見る。スタックトレースやエラー内容が表示されます。

よくある原因: `TWELVE_DATA_API_KEY` 未設定・誤り、シンボル取得エラー（例: N225 が利用不可）、ネットワーク／タイムアウトなど。

---

## ステップ 5: Cron の確認（自動実行）

- **Vercel Pro** 以上のプランでは、本番デプロイ後に **15分ごと** に自動で `/api/cron` が呼ばれます
- Vercel の **Settings** → **Cron Jobs** で、スケジュール（`*/15 * * * *`）が登録されているか確認できます

### 15分ごとに実行されているかの確認方法（Vercel Pro）

1. **Cron 一覧を開く**  
   プロジェクトを開く → 左サイドバーの **Settings** → **Cron Jobs**
2. **登録内容の確認**  
   `/api/cron` とスケジュール `*/15 * * * *` が表示されていれば、15分ごとの実行が有効です。
3. **実行ログを見る**  
   同じ **Cron Jobs** の画面で、該当の Cron の **「View Logs」** をクリック  
   → **Runtime Logs** が開き、`requestPath:/api/cron` で絞り込まれた **実行履歴** が表示されます。  
   ここに 15 分間隔でリクエストが並んでいれば、想定どおり実行されています。
4. **別の入口からログを見る**  
   プロジェクトの左サイドバー **「Logs」** を開く → フィルターや一覧から `/api/cron` の呼び出しを探す。  
   時刻が 0, 15, 30, 45 分付近で並んでいれば、15分ごとの実行です。

※ Cron は **本番（Production）** デプロイに対してのみ動きます。タイムゾーンは **UTC** です（日本時間では 0:00, 0:15, 0:30 … は UTC の 15:00, 15:15 … の前日などに対応）。
- 条件が成立したタイミングで、`ALERT_MAIL_TO` のアドレスにメールが届きます

---

## チェックリスト

- [ ] Vercel で GitHub リポジトリをインポートしてデプロイした
- [ ] 環境変数をすべて設定した（Production）
- [ ] 再デプロイ（Redeploy）した
- [ ] 手動で `/api/cron` を叩いて `{"ok": true, ...}` が返ることを確認した
- [ ] （Pro 以上）Cron が15分ごとに動いていることを確認した
