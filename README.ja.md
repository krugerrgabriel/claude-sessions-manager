<h1 align="center">🔖 Claude Sessions Manager</h1>

<p align="center">
  <strong><a href="https://claude.com/claude-code">Claude Code</a> の毎日の出発点。</strong><br>
  どの会話でも中断したところから再開 — プロジェクトの再説明も、失われたコンテキストもありません。
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> ·
  <a href="README.pt-BR.md">🇧🇷 Português</a> ·
  <a href="README.es.md">🇪🇸 Español</a> ·
  <strong>🇯🇵 日本語</strong> ·
  <a href="README.zh-CN.md">🇨🇳 简体中文</a> ·
  <a href="README.ko.md">🇰🇷 한국어</a> ·
  <a href="README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="Apache" src="https://img.shields.io/badge/Apache-2.4%2B-D22128?logo=apache&logoColor=white">
  <img alt="mod_wsgi" src="https://img.shields.io/badge/mod__wsgi-required-0066cc">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla-JS%20%7C%20CSS%20%7C%20HTML-F7DF1E?logo=javascript&logoColor=black">
  <img alt="Zero deps" src="https://img.shields.io/badge/deps-zero-success">
</p>

---

## 💡 なぜ使うのか

どのプロジェクトにも隠れたコストがあります — **コンテキストの再加熱**。Claude を開くたびに時間を失います:

- 🔁 アーキテクチャを再説明する
- 📍 どこで中断したかを示す
- 📂 重要なファイルを指し示す
- 🧠 進行中だった作業を再調整する

これだけで**生産を始めるまでに 15〜30 分**。そしてターミナルを閉じると、Claude が積み上げたばかりのコンテキストは消えてしまいます。

✨ **良い知らせ:** Claude Code はすでに各会話を保存しており、再開できます。

😩 **問題:** 自動生成された数十のコードの中から正しい会話を見つけること。

それを解決するのがこのプロジェクトです。4 ステップで:

1. 🏁 ダッシュボードを開く
2. 🎯 正しい会話を見つける
3. 📋 クリック — コマンドがすでにクリップボードに
4. 💻 ターミナルに貼り付けて、中断したところから続ける

> **再開は数秒。やり直しは数時間。**

---

## ✨ 機能

| | |
|---|---|
| 🔁 **1 クリックで再開** | 会話をクリック → 再開コマンドが瞬時にクリップボードへ |
| 🏷️ **名前とメモ** | 各会話に人間向けの名前を付け、どこで止めたかをメモ |
| ⭐ **お気に入り** | 毎日使う会話を目立たせる |
| 🗑️ **安全なゴミ箱** | 古い会話を恐れずアーカイブ — 完全削除には二重確認が必要 |
| 🔍 **瞬時の検索** | 名前、メモ、プロジェクト、ブランチ、または会話で話された内容で絞り込み |
| 📁 **プロジェクトでグループ化** | 会話を所属プロジェクトごとに整理、サイドバーにカウンター付き |
| 📊 **有用な情報** | 消費されたコンテキスト、サイズ、ブランチ、最終アクティビティ — すべてカードに表示 |
| 🌡️ **飽和警告** | コンテキスト枠を埋めそうな会話は黄色と赤で強調 |
| ⌨️ **キーボードショートカット** | `/` 検索、`Esc` 閉じる、`Enter` 再開 — キーボードから手を離さずに |
| 🌗 **柔らかいダークテーマ** | 長時間の画面作業を考えた設計、Claude にインスパイアされたテラコッタ色のアクセント |
| ♿ **アクセシブル** | キーボード操作、適切なコントラスト、システムの「視差効果を減らす」設定を尊重 |

---

## 📦 インストール

### 1️⃣ リポジトリをクローン

```bash
git clone https://github.com/krugerrgabriel/claude-sessions-manager.git
cd claude-sessions-manager
```

### 2️⃣ インストーラを実行

```bash
sudo ./install.sh
```

インストーラがすべて処理します — 不足分をインストールし、ファイルをコピーし、権限を調整し、Web サーバーを設定します。数秒で完了します。

### 3️⃣ ブラウザで開く

好きな方法を選んでください:

🖥️ **URL で直接:** http://localhost/claude-sessions/

⌨️ **またはターミナルから:**

```bash
claude-sessions
```

または

```bash
claude-sessions-manager
```

インストーラがそのコマンドを自動的に作成します — デフォルトブラウザでダッシュボードを開きます。

以上です。🎉

> 💡 **唯一の前提条件:** `apt` と `sudo` が使える Linux (Ubuntu、Debian、Mint、Pop!_OS など)。

---

## ⚙️ 高度な設定

必要な場合のみ使用してください — すべてデフォルトで動作します。

<details>
<summary><strong>別のパスや URL にインストール</strong></summary>

```bash
sudo INSTALL_DIR=/opt/claude-sessions-manager URL_PATH=/dashboard ./install.sh
```
その後 **http://localhost/dashboard/** を開きます。
</details>

<details>
<summary><strong>別のセッションフォルダを使用</strong></summary>

```bash
sudo PROJECTS_DIR=/alternative/path/.claude/projects ./install.sh
```
</details>

<details>
<summary><strong>アンインストール</strong></summary>

```bash
sudo ./uninstall.sh           # メモ (名前、お気に入り、説明) を保持
sudo ./uninstall.sh --purge   # メモも含めてすべて削除
```
</details>

---

## ⌨️ ショートカット

| キー | アクション |
|---|---|
| `/` | 検索にフォーカス |
| `Esc` | モーダルを閉じる、検索をクリア、モバイルメニューを閉じる |
| `Enter` / `Space` | フォーカス中の会話を再開 |
| `Ctrl+Enter` | 編集を保存 (モーダル内) |

---

## 🏗️ 内部の仕組み

```
┌─────────────────────────────────────────────────────────────────┐
│                        ブラウザ (あなた)                         │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTML/CSS/JS                      │ fetch /api/*
                ▼                                  ▼
┌────────────────────────┐          ┌────────────────────────────┐
│   Apache2 (静的)       │          │  mod_wsgi → app.wsgi (py)  │
└────────────────────────┘          └──────────────┬─────────────┘
                                                   │ 読み書き
                                                   ▼
            ┌─────────────────────────────────────────────────────┐
            │  ~/.claude/projects/*/*.jsonl  (あなたのセッション)  │
            │  data/metadata.json            (あなたのメモ)        │
            │  cache/sessions.json           (内部キャッシュ)      │
            └─────────────────────────────────────────────────────┘
```

### スタック

| レイヤー | 技術 | 理由 |
|---|---|---|
| **フロントエンド** | HTML + CSS + バニラ JS | ビルドステップなし、100ms 未満でロード |
| **バックエンド** | Python 3 (stdlib) | `pip install` なし、`venv` なし |
| **統合** | mod_wsgi | モダン Apache に同梱、あなたのユーザーとして実行 |
| **永続化** | ローカル JSON | 手動で編集可能なファイルに保存 |
| **フォント** | Inter + JetBrains Mono | 情報密度の高い画面で優れた可読性 |

### リポジトリ構造

```
claude-sessions-manager/
├── index.html       ← UI と SVG アイコン
├── style.css        ← デザインシステム (ダークテーマ)
├── app.js           ← レンダリングと API のロジック
├── app.wsgi         ← Python バックエンド
├── install.sh       ← インストーラ
├── uninstall.sh     ← アンインストーラ
├── README.md        ← あなたは今ここ
├── .gitignore       ← 生成されたデータを無視
├── data/            ← (生成) あなたのメモ
└── cache/           ← (生成) 内部キャッシュ
```

---

## 🔒 セキュリティ

- バックエンドは **あなたとして** 実行されます (`www-data` ではなく) — グローバルな `chmod` なしでセッションを読みます。
- API は UUID 形式の ID のみを受け付けます (パストラバーサルなし)。
- 永続的な削除にはフロントエンドで二重確認が必要です。
- デフォルトで **http://localhost** のみで提供 — 認証なしで **インターネットに公開しないでください**。

---

## 🛠️ 開発

ビルドステップなし。編集してページを再読み込みするだけです。

```bash
# バックエンドを変更した後、mod_wsgi を強制的に再読み込み
sudo touch /var/www/html/claude-sessions/app.wsgi

# ログを追う
sudo tail -f /var/log/apache2/error.log

# 内部キャッシュをクリア (パースロジックを変更した後)
rm -f /var/www/html/claude-sessions/cache/sessions.json
```

---

## 🐛 トラブルシューティング

<details>
<summary><strong>「セッションの読み込みに失敗しました」</strong></summary>

```bash
sudo tail -20 /var/log/apache2/error.log
```

よくある原因:
- `~/.claude/projects/` がまだ存在しない — Claude Code を一度は実行してください
- `mod_wsgi` が有効になっていない: `sudo a2enmod wsgi && sudo systemctl reload apache2`
</details>

<details>
<summary><strong>完全削除で「Permission denied」</strong></summary>

バックエンドはファイルの所有者として実行する必要があります。確認:
```bash
grep WSGIDaemonProcess /etc/apache2/conf-available/claude-sessions.conf
```
行には `user=YOUR_USERNAME` が含まれている必要があります。
</details>

<details>
<summary><strong>一部のセッションが表示されない</strong></summary>

メイン (再開可能) なセッションのみがリスト表示されます。サブエージェントの内部会話は意図的に無視されます。
</details>

<details>
<summary><strong>バックエンドを変更したが UI が更新されない</strong></summary>

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
sudo systemctl reload apache2
```
ブラウザ: **Ctrl+Shift+R** でブラウザキャッシュを破棄します。
</details>

---

## 🤝 コントリビュート

PR を歓迎します。送信前に:

- **依存関係ゼロ** を維持 (`pip` なし、`npm` なし)
- `style.css` のデザインシステムに従う (セマンティックな CSS 変数)
- 新しいアイコン: `index.html` の SVG スプライトに `<symbol>` を追加 (Lucide スタイル、stroke 2、24×24)

---

## 📜 ライセンス

MIT — 好きなように。

---

<p align="center">
  <code>vim</code> とコーヒーで作られました。
</p>
