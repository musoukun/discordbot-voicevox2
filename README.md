# VoiceVox Bot

VOICEVOX音声合成 + AI（Google Gemini / ローカルLLM）を組み合わせたDiscordボットです。
テキスト読み上げ、AI質問への音声回答、テキストのみのAI回答に対応しています。

## 機能

| コマンド | 説明 | AI | 音声 |
|---------|------|:--:|:---:|
| `/vv` | テキストをVOICEVOXで読み上げ | - | o |
| `/vvg` | Gemini 2.5 Flashに質問 + 読み上げ | Gemini | o |
| `/vvq` | Qwen3.5（ローカル）に質問 + 読み上げ | Qwen | o |
| `/q35` | Qwen3.5にテキストのみで質問 | Qwen | - |
| `/lvv` | ボイスチャンネルから退出 | - | - |

- 全コマンドに `s` を付けると自分だけに見える応答になります（例: `/vvs`, `/vvgs`, `/q35s`）
- `/vvg`、`/vvq` は回答が150文字を超える場合、要約を読み上げ・全文をテキスト表示します
- `/vvg` はGoogle検索オプション（`search:True`）で最新情報を補完できます
- 10分間操作がない場合、ボイスチャンネルから自動退出します

## 必要環境

- **Node.js** v22 LTS
- **FFmpeg**（PATHに追加済みであること）
- **VOICEVOX Engine**（音声合成サーバー）
- **KoboldCpp**（ローカルLLM、`/vvq`・`/q35` 使用時のみ）

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、各値を設定します。

```bash
cp .env.example .env
```

```env
# 必須
DISCORD_TOKEN=your_discord_bot_token
DISCORD_APPLICATION_ID=your_application_id
GOOGLE_API_KEY=your_google_api_key
VOICEVOX_URL=http://localhost:50021

# 任意
DISCORD_GUILD_ID=your_guild_id    # 指定するとギルドコマンド（即時反映）、省略するとグローバルコマンド（反映に最大1時間）
KOBOLD_URL=http://localhost:5001  # KoboldCpp のURL（/vvq, /q35 使用時）
```

### 3. 外部サービスの起動

```bash
# VOICEVOX Engine を起動（必須）
# https://voicevox.hiroshiba.jp/ からダウンロード

# KoboldCpp を起動（/vvq, /q35 使用時のみ）
# --chatcompletionsadapter ChatML-NoThink を付けると思考モードが無効になり高速化
koboldcpp model.gguf --chatcompletionsadapter ChatML-NoThink
```

### 4. ボットの起動

```bash
npm start
```

## Discord Bot の設定

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
2. Bot タブでトークンを取得し `.env` に設定
3. OAuth2 > URL Generator で以下の権限を含む招待URLを生成:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Connect`, `Speak`
4. 生成したURLでサーバーに招待

## アーキテクチャ

```
src/
  index.js              # エントリーポイント、インタラクションルーター
  deploy-commands.js    # スラッシュコマンド登録
  utils.js              # 共通ユーティリティ（応答ヘルパー）
  commands/
    vv.js               # /vv  - テキスト読み上げ
    vvg.js              # /vvg - Gemini AI + 読み上げ
    vvq.js              # /vvq - Qwen AI + 読み上げ
    q35.js              # /q35 - Qwen テキスト回答
    lvv.js              # /lvv - VC退出
  services/
    voicevox.js         # VOICEVOX API（音声合成・再生）
    voice.js            # ボイスチャンネル接続管理
    ai.js               # Google Gemini API
    qwen.js             # KoboldCpp（Qwen）API
```

- **ES Modules** (`"type": "module"`)
- **discord.js v14** / **@discordjs/voice v0.19**
- 1ユーザーにつき1コマンドずつ処理（並行実行防止）
- 音声ファイルは `src/voiceTmp/` に一時生成し、再生後に自動削除

## ライセンス

ISC
