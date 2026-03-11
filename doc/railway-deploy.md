# Railway デプロイガイド

## 構成概要

Railway 上に **2つのサービス** を立てる構成：

```
Railway プロジェクト
├── サービス1: discord-bot      ← このリポジトリのコード
└── サービス2: voicevox-engine  ← VOICEVOX Engine (CPU版Docker)
```

---

## 1. Railway アカウント準備

1. [Railway](https://railway.app/) にログイン
2. 新しいプロジェクトを作成

---

## 2. Discord Bot サービスのデプロイ

### GitHub リポジトリからデプロイ

1. プロジェクト内で「New Service」→「GitHub Repo」を選択
2. リポジトリ `musoukun/discordbot-voicevox2` を選択
3. Railway が自動で Dockerfile を検出してビルドする

### 環境変数の設定

サービスの **Variables** タブで以下を設定：

| 変数名 | 値 |
|--------|-----|
| `DISCORD_TOKEN` | Discord Bot のトークン |
| `DISCORD_APPLICATION_ID` | アプリケーション ID |
| `DISCORD_GUILD_ID` | サーバー ID |
| `GOOGLE_API_KEY` | Gemini API キー |
| `VOICEVOX_URL` | `http://voicevox-engine.railway.internal:50021`（※後述） |

---

## 3. VOICEVOX Engine サービスのデプロイ

### Docker イメージからデプロイ

1. 同じプロジェクト内で「New Service」→「Docker Image」を選択
2. イメージ名に以下を入力：
   ```
   voicevox/voicevox_engine:cpu-latest
   ```
3. サービス名を `voicevox-engine` に変更

### 設定

- **Port**: `50021` を指定（Settings > Networking > Port）
- メモリが足りない場合は Settings で制限を上げる（推奨: 1.5GB 以上）

### 内部通信の設定

Railway のプロジェクト内サービス同士は **内部ネットワーク** で通信できる。

Discord Bot 側の `VOICEVOX_URL` を以下の形式にする：

```
http://voicevox-engine.railway.internal:50021
```

> `voicevox-engine` の部分はサービス名に合わせて変更してください。
> 正確なホスト名は VOICEVOX サービスの **Settings > Networking > Private Networking** で確認できます。

---

## 4. デプロイの確認

### ログの確認

各サービスの **Deployments** タブでログを確認：

**Discord Bot のログ:**
```
Ready! Logged in as ボット名#1234
VOICEVOX speakers loaded: XX
Bot initialization complete.
```

**VOICEVOX Engine のログ:**
```
INFO:     Uvicorn running on http://0.0.0.0:50021
```

### Discord で動作確認

サーバーで `/vv text:テスト` を実行して、ボイスチャンネルで読み上げられれば成功。

---

## 料金の目安

| サービス | メモリ | CPU | 月額目安 |
|---------|--------|-----|---------|
| Discord Bot | 512MB | 0.5 vCPU | ~$3 |
| VOICEVOX Engine | 1.5GB | 1 vCPU | ~$5-7 |
| **合計** | | | **~$8-10** |

> Railway は従量課金制。実際の料金はリソース使用量による。
> [Railway Pricing](https://railway.app/pricing) で最新の料金を確認してください。

---

## トラブルシューティング

### VOICEVOX に接続できない

- VOICEVOX サービスが Running 状態か確認
- 内部 URL が正しいか確認（Settings > Networking）
- Bot のログに `Failed to fetch VOICEVOX speakers` が出ていないか確認

### メモリ不足で VOICEVOX が落ちる

- VOICEVOX Engine の CPU スレッド数を制限する：
  サービスの起動コマンドを変更（Settings > Deploy > Start Command）：
  ```
  gosu user /opt/python/bin/python3 run.py --host 0.0.0.0 --cpu_num_threads 2
  ```

### ボイスチャンネルでの読み上げが途切れる

- Bot サービスのリソースを増やす
- ネットワーク遅延の問題の可能性あり（Railway のリージョンを確認）

---

## 更新方法

GitHub にプッシュすると Railway が自動でリビルド・リデプロイする。

```bash
git add .
git commit -m "変更内容"
git push origin main
```
