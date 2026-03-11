# ローカルセットアップガイド

## 前提条件

- Node.js v18 以上
- VOICEVOX（読み上げ機能を使う場合）
- Discord Bot のアカウント

---

## 1. Discord Bot の作成

### アプリケーション作成

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. 「New Application」でアプリを作成

### トークン・IDの取得

| 取得する値 | 場所 |
|-----------|------|
| `DISCORD_TOKEN` | **Bot** タブ → 「Reset Token」でトークン取得 |
| `DISCORD_APPLICATION_ID` | **General Information** → Application ID |
| `DISCORD_GUILD_ID` | Discord アプリで開発者モード ON → サーバー名を右クリック → 「IDをコピー」 |

### Bot の設定

1. **Bot** タブで **Privileged Gateway Intents** を有効化：
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`

### サーバーへの招待

1. **OAuth2 > URL Generator** を開く
2. **Scopes** で以下を選択：
   - `bot`
   - `applications.commands`
3. **Bot Permissions** で以下を選択：
   - `Connect`（ボイスチャンネルに接続）
   - `Speak`（ボイスチャンネルで発言）
   - `Use Slash Commands`（スラッシュコマンド使用）
4. 生成されたURLをブラウザで開いて、テスト用サーバーに招待

---

## 2. プロジェクトのセットアップ

```bash
# プロジェクトに移動
cd D:/develop/discordbot_llm

# 依存関係インストール
npm install

# .envファイル作成
cp .env.example .env
```

### .env の編集

```env
DISCORD_TOKEN=ボットのトークン
DISCORD_APPLICATION_ID=アプリケーションID
DISCORD_GUILD_ID=テスト用サーバーのID
GOOGLE_API_KEY=GeminiのAPIキー
VOICEVOX_URL=http://localhost:50021
```

---

## 3. VOICEVOX の起動（読み上げ機能を使う場合）

### 方法A: VOICEVOX アプリを起動

VOICEVOX のデスクトップアプリを起動するだけでOK。自動的に `http://localhost:50021` でAPIサーバーが立ち上がる。

### 方法B: Docker で起動

```bash
docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest
```

---

## 4. ボットの起動

```bash
npm start
```

以下のログが出れば成功：

```
Ready! Logged in as ボット名#1234
VOICEVOX speakers loaded: XX
Slash commands registered.
Bot initialization complete.
```

---

## 5. 動作確認

Discord サーバーで以下のスラッシュコマンドが使えることを確認：

| コマンド | 説明 |
|---------|------|
| `/vv` | テキストを VOICEVOX で読み上げ |
| `/vvai` | AI に質問し、回答を読み上げ |
| `/lvv` | ボイスチャンネルから退出 |

---

## トラブルシューティング

### スラッシュコマンドが表示されない
- `DISCORD_GUILD_ID` が正しいか確認
- Bot がサーバーに招待されているか確認
- 数分待ってみる（Discord のキャッシュの問題）

### VOICEVOX に接続できない
- VOICEVOX が起動しているか確認
- `http://localhost:50021/speakers` にブラウザでアクセスして応答があるか確認
- `.env` の `VOICEVOX_URL` が正しいか確認

### ボイスチャンネルに入れない
- Bot に `Connect` と `Speak` 権限があるか確認
- ボイスチャンネルに自分が入ってからコマンドを実行する
