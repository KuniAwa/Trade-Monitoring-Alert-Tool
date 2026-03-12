# Cursor 再インストール前のバックアップ手順

## 1. バックアップ用フォルダを作成

デスクトップやドキュメントなど、わかりやすい場所にフォルダを作成します。
例: `C:\Users\kunik\OneDrive\ドキュメント\Cursor_backup_YYYYMMDD`

---

## 2. バックアップするフォルダ・ファイル

**Cursor を完全に終了してから**、以下の場所をコピーします。

### 必須（設定・キーバインド・拡張機能）

| 内容 | パス（%USERPROFILE% は C:\Users\kunik など） |
|------|---------------------------------------------|
| ユーザー設定全体 | `%APPDATA%\Cursor\User` → フォルダごとコピー |
| 設定ファイル | `%APPDATA%\Cursor\User\settings.json` |
| キーボードショートカット | `%APPDATA%\Cursor\User\keybindings.json` |
| スニペット | `%APPDATA%\Cursor\User\snippets` フォルダ |
| 拡張機能 | `%USERPROFILE%\.cursor\extensions` フォルダ |

### あると便利（チャット履歴・ワークスペース情報）

| 内容 | パス |
|------|------|
| ワークスペースストレージ（チャット履歴等） | `%APPDATA%\Cursor\User\workspaceStorage` フォルダ |
| グローバルストレージ | `%APPDATA%\Cursor\User\globalStorage` フォルダ |

### フルバックアップしたい場合

次のフォルダ全体をコピーすると、ほぼすべての設定が含まれます。

- `%APPDATA%\Cursor` フォルダ全体
- `%USERPROFILE%\.cursor` フォルダ全体（存在する場合）

---

## 3. パスの展開例（あなたの環境）

- `%APPDATA%` → `C:\Users\kunik\AppData\Roaming`
- `%USERPROFILE%` → `C:\Users\kunik`

**コピー元の例：**
- `C:\Users\kunik\AppData\Roaming\Cursor\User`
- `C:\Users\kunik\.cursor\extensions`（.cursor がある場合）

---

## 4. 再インストール後の復元

1. 新しい Cursor をインストールして一度起動する
2. Cursor を終了する
3. バックアップした `User` フォルダの内容を、新しい `%APPDATA%\Cursor\User` に上書きまたはマージ
4. 拡張機能は `%USERPROFILE%\.cursor\extensions` にコピー（または Cursor の拡張機能タブから再インストール）
5. Cursor を起動して設定が反映されているか確認

---

## 5. 注意事項

- バックアップ・復元時は Cursor を終了した状態で行う
- `workspaceStorage` は容量が大きい場合がある。不要ならバックアップしなくてもよい
- 復元時に「ファイルが使われている」と出る場合は、Cursor が完全に終了しているかタスクマネージャーで確認する
