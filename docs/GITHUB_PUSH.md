# このプロジェクトを GitHub にプッシュする方法

## 前提

- **Git** がインストールされていること（未導入の場合は下記「Git が認識されない場合」を参照）
- **GitHub アカウント** があること

---

## Git が認識されない場合（「用語 'git' は認識されません」と出る）

PowerShell で `git` と打ってエラーになる場合は、**Git をインストールする**か、**PATH を通す**必要があります。

### 方法 1: Git for Windows をインストール（推奨）

1. **Git for Windows** をダウンロードする:  
   https://git-scm.com/download/win  
   （「Click here to download」など、64bit 用のインストーラーを選ぶ）
2. ダウンロードした **.exe** を実行する。
3. 基本的には **Next** のまま進めてよい。  
   **「Adjusting your PATH environment」** の画面では、  
   **「Git from the command line and also from 3rd-party software」** を選ぶ（これで PATH に追加されます）。
4. インストールが終わったら、**PowerShell を一度閉じて、あらためて開き直す**。
5. 次のコマンドでバージョンが表示されれば OK です:
   ```powershell
   git --version
   ```
   例: `git version 2.43.0.windows.1`

### 方法 2: すでにインストール済みなのに認識されない場合

- **PC を再起動**してから、もう一度 PowerShell で `git --version` を試す。
- それでもダメな場合は、Git のインストール先（例: `C:\Program Files\Git\cmd`）を環境変数 **Path** に手動で追加する（「環境変数を編集」で Path に `C:\Program Files\Git\cmd` を追加）。

---

## 手順 1: GitHub で新しいリポジトリを作る

1. [GitHub](https://github.com) にログインする
2. 右上の **+** → **New repository** をクリック
3. 次のように設定する:
   - **Repository name**: 例）`market-alert-vercel` や `cursor-market-alert`
   - **Description**: 任意（例：「相場監視アラート（Vercel + Twelve Data）」）
   - **Public** を選択
   - **Add a README file** は **付けない**（ローカルに既に README があるため）
   - **Create repository** をクリック
4. 作成後、表示される **リポジトリの URL** を控える  
   例: `https://github.com/あなたのユーザー名/market-alert-vercel.git`

---

## 手順 2: ローカルで Git を初期化してプッシュする

### 2-1. ターミナルを開く

- **PowerShell** または **コマンドプロンプト** を開く
- このプロジェクトのフォルダに移動する:
  ```powershell
  cd "c:\Users\kunik\OneDrive\ドキュメント\Apps\Cursor"
  ```
  （パスは実際の場所に合わせて変更してください）

### 2-2. Git リポジトリを初期化（まだの場合）

まだこのフォルダが Git 管理下でない場合:

```powershell
git init
```

### 2-3. .gitignore を作る（推奨）

プッシュしたくないファイルを除外するため、プロジェクト直下に `.gitignore` を作成します。

**`.gitignore` の内容例:**

```
# 環境変数（秘密情報を含むため絶対にプッシュしない）
.env
.env.local
.env.*.local

# Python
__pycache__/
*.py[cod]
.venv/
venv/
*.egg-info/

# Vercel
.vercel/

# その他
.DS_Store
*.log
```

### 2-4. ファイルを追加してコミット

```powershell
git add api/
git add vercel.json
git add requirements.txt
git add README.md
git add docs/
git add .vercelignore
git add .gitignore
git status
```

`git status` で、意図したファイルだけが追加されているか確認します。

問題なければコミット:

```powershell
git commit -m "Initial commit: 相場監視アラート（Vercel + Twelve Data）"
```

### 2-5. GitHub のリポジトリを「リモート」として登録

次の `リポジトリのURL` は、手順 1 で控えた URL に置き換えてください。

```powershell
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
```

例:

```powershell
git remote add origin https://github.com/kunik/market-alert-vercel.git
```

すでに `origin` がある場合は、先に削除してから追加:

```powershell
git remote remove origin
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
```

### 2-6. ブランチ名を main にしてプッシュ

GitHub の標準ブランチは `main` です。

```powershell
git branch -M main
git push -u origin main
```

ログインを求められたら、GitHub の **ユーザー名** と **パスワード** を入力します。  
パスワードは通常のログイン用ではなく、**Personal Access Token (PAT)** を使う必要があります（下記「認証でエラーになる場合」を参照）。

---

## 認証でエラーになる場合

GitHub はパスワードでのプッシュを廃止しているため、**Personal Access Token (PAT)** を使います。

### Personal Access Token の作成

1. GitHub で **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)** をクリック
3. **Note**: 例）`vercel-market-alert`
4. **Expiration**: 任意（例: 90 days または No expiration）
5. **repo** にチェックを入れる
6. **Generate token** をクリックし、表示されたトークンを **必ずコピーして安全な場所に保存**
7. プッシュ時、**パスワードの代わりにこのトークンを入力**する

---

## まとめ（コマンド一覧）

リポジトリを既に作成済みで、ローカルもまだ Git 管理下にない場合の流れ:

```powershell
cd "c:\Users\kunik\OneDrive\ドキュメント\Apps\Cursor"
git init
git add api/ vercel.json requirements.txt README.md docs/ .vercelignore .gitignore
git commit -m "Initial commit: 相場監視アラート（Vercel + Twelve Data）"
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
git branch -M main
git push -u origin main
```

---

## 2回目以降の更新をプッシュする場合

コードを直したあと:

```powershell
git add .
git status
git commit -m "変更内容のメッセージ"
git push
```
