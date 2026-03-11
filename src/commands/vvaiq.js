import { generateLocalAIResponse } from "../services/local-ai.js";
import { playInChannel } from "../services/voicevox.js";
import { connectToVoice, setDisconnectTimeout, resolveVoiceChannel } from "../services/voice.js";
import { ChannelType } from "discord.js";
import { safeDeferReply, safeReply } from "../utils.js";

export async function handleVVAIQ(interaction, { secret = false } = {}) {
	const method = await safeDeferReply(interaction, secret);

	const question = interaction.options.getString("question");
	const speakerName = interaction.options.getString("speaker") || "ずんだもん (ノーマル)";
	const channelId = interaction.options.getString("channelid");

	if (!interaction.guild) {
		await safeReply(interaction, method, "このコマンドはサーバー内でのみ使用できます。");
		return;
	}

	const voiceChannel = resolveVoiceChannel(interaction, channelId);
	if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
		await safeReply(interaction, method, "ボイスチャンネルに入室してから、もう一度コマンドを実行してください。");
		return;
	}

	// ローカルAI応答生成
	let responseText;
	try {
		responseText = await generateLocalAIResponse(question, interaction.user.id);
	} catch (error) {
		console.error("Local AI response error:", error);
		await safeReply(interaction, method, `ローカルAIエラー: ${error.message}`);
		return;
	}

	// 音声再生
	try {
		const connection = connectToVoice(interaction.guild, voiceChannel);
		await playInChannel(connection, responseText, speakerName);
		setDisconnectTimeout(connection);
	} catch (error) {
		console.error("Voice playback error:", error);
		await safeReply(interaction, method, `質問: ${question}\n\nAIの回答:\n${responseText}\n\n⚠ 音声再生中にエラーが発生しました。`);
		return;
	}

	await safeReply(interaction, method,
		`質問: ${question}\n\nAIの回答 (ローカル Qwen):\n${responseText}\n\n話者: ${speakerName}`
	);
}
