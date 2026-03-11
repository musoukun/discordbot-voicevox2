import { Client, GatewayIntentBits, Collection } from "discord.js";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import { deployCommands } from "./deploy-commands.js";
import { vvCommand, handleVV } from "./commands/vv.js";
import { vvaiCommand, handleVVAI } from "./commands/vvai.js";
import { lvvCommand, handleLVV } from "./commands/lvv.js";
import { fetchVoicevoxSpeakers, getSpeakers } from "./services/voicevox.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 定数
export const TIMEOUT = 10 * 60 * 1000; // 10分
export const voiceTmpPath = join(__dirname, "voiceTmp");

// インタラクションキュー（同一ユーザーの並行コマンド防止）
const interactionQueue = new Set();

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once("ready", async () => {
	console.log(`Ready! Logged in as ${client.user.tag}`);

	// voiceTmpディレクトリ作成
	if (!existsSync(voiceTmpPath)) {
		mkdirSync(voiceTmpPath, { recursive: true });
	}

	// VOICEVOXスピーカー一覧の取得
	await fetchVoicevoxSpeakers();

	// スラッシュコマンド登録
	const speakers = getSpeakers();
	await deployCommands(speakers);

	console.log("Bot initialization complete.");
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	const userId = interaction.user.id;

	// 同一ユーザーの並行実行をブロック
	if (interactionQueue.has(userId)) {
		await interaction.reply({
			content: "前回のコマンドの処理が完了するまでお待ちください。",
			ephemeral: true,
		});
		return;
	}

	interactionQueue.add(userId);

	try {
		switch (interaction.commandName) {
			case "vv":
				await handleVV(interaction);
				break;
			case "vvai":
				await handleVVAI(interaction);
				break;
			case "lvv":
				await handleLVV(interaction);
				break;
			default:
				await interaction.reply({
					content: "不明なコマンドです。",
					ephemeral: true,
				});
		}
	} catch (error) {
		console.error(`Error executing /${interaction.commandName}:`, error);
		const reply = interaction.deferred || interaction.replied
			? interaction.editReply.bind(interaction)
			: interaction.reply.bind(interaction);
		await reply({
			content: "コマンドの実行中にエラーが発生しました。",
			ephemeral: true,
		}).catch(console.error);
	} finally {
		interactionQueue.delete(userId);
	}
});

client.login(process.env.DISCORD_TOKEN);
