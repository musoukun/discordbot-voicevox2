import { Client, GatewayIntentBits, MessageFlags } from "discord.js";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import { deployCommands } from "./deploy-commands.js";
import { handleVV } from "./commands/vv.js";
import { handleVVAI } from "./commands/vvai.js";
import { handleLVV } from "./commands/lvv.js";
import { handleVVQ } from "./commands/vvq.js";
import { handleQ35 } from "./commands/q35.js";
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

// デバッグ: interactionCreateリスナー数とrawイベント監視
const seenInteractions = new Set();
client.on("raw", (packet) => {
	if (packet.t === "INTERACTION_CREATE") {
		console.log(`[RAW] INTERACTION_CREATE id=${packet.d.id} type=${packet.d.type} name=${packet.d.data?.name}`);
	}
});

client.on("interactionCreate", async (interaction) => {
	const listenerCount = client.listenerCount("interactionCreate");
	console.log(`[EVENT] interactionCreate id=${interaction.id} type=${interaction.type} command=${interaction.commandName || "N/A"} listeners=${listenerCount}`);
	if (seenInteractions.has(interaction.id)) {
		console.log(`[EVENT] ★ DUPLICATE interaction id=${interaction.id} ★`);
		return;
	}
	seenInteractions.add(interaction.id);
	// 古いIDを掃除（メモリリーク防止）
	if (seenInteractions.size > 100) seenInteractions.clear();
	if (!interaction.isChatInputCommand()) return;

	const userId = interaction.user.id;

	// 同一ユーザーの並行実行をブロック
	if (interactionQueue.has(userId)) {
		await interaction.reply({
			content: "前回のコマンドの処理が完了するまでお待ちください。",
			flags: MessageFlags.Ephemeral,
		}).catch(() => {});
		return;
	}

	interactionQueue.add(userId);

	// "s" 付きコマンドは自分のみ表示
	const name = interaction.commandName;
	const secret = name.endsWith("s") && name !== "lvv";
	const baseName = secret ? name.slice(0, -1) : name;

	console.log(`[DEBUG] commandName="${name}", baseName="${baseName}", secret=${secret}, replied=${interaction.replied}, deferred=${interaction.deferred}`);

	try {
		switch (baseName) {
			case "vv":
				await handleVV(interaction, { secret });
				break;
			case "vvai":
				await handleVVAI(interaction, { secret });
				break;
			case "vvq":
				await handleVVQ(interaction, { secret });
				break;
			case "q35":
				await handleQ35(interaction, { secret });
				break;
			case "lvv":
				await handleLVV(interaction);
				break;
			default:
				console.log(`[DEBUG] ★★★ default到達! name="${name}", baseName="${baseName}" ★★★`);
				await interaction.reply({
					content: "SENTINEL: このメッセージが見えたらdefaultケースです",
					flags: MessageFlags.Ephemeral,
				}).catch(() => {});
		}
	} catch (error) {
		console.error(`Error executing /${name}:`, error);
		try {
			await interaction.editReply({ content: "コマンドの実行中にエラーが発生しました。" });
		} catch {
			await interaction.reply({
				content: "コマンドの実行中にエラーが発生しました。",
				flags: MessageFlags.Ephemeral,
			}).catch(console.error);
		}
	} finally {
		interactionQueue.delete(userId);
	}
});

client.login(process.env.DISCORD_TOKEN);
