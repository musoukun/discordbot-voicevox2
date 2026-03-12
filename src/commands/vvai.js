import { generateAIResponse } from "../services/ai.js";
import { playInChannel } from "../services/voicevox.js";
import { connectToVoice, setDisconnectTimeout, resolveVoiceChannel } from "../services/voice.js";
import { ChannelType } from "discord.js";
import { safeDeferReply, safeReply } from "../utils.js";

export async function handleVVAI(interaction, { secret = false } = {}) {
	const method = await safeDeferReply(interaction, secret);

	const question = interaction.options.getString("question");
	const speakerName = interaction.options.getString("speaker") || "ずんだもん (ノーマル)";
	const channelId = interaction.options.getString("channelid");
	const useSearch = interaction.options.getBoolean("search") || false;

	if (!interaction.guild) {
		await safeReply(interaction, method, "このコマンドはサーバー内でのみ使用できます。");
		return;
	}

	const voiceChannel = resolveVoiceChannel(interaction, channelId);
	if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
		await safeReply(interaction, method, "ボイスチャンネルに入室してから、もう一度コマンドを実行してください。");
		return;
	}

	// AI応答生成
	let responseText;
	try {
		responseText = await generateAIResponse(question, interaction.user.id, useSearch);
	} catch (error) {
		console.error("AI response error:", error);
		await safeReply(interaction, method, "AIの回答生成中にエラーが発生しました。もう一度お試しください。");
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

	const publicContent = `質問: ${question}\n\nAIの回答:\n${responseText}\n\n話者: ${speakerName}${useSearch ? "\n(Google検索で補完)" : ""}`;
	await safeReply(interaction, method, publicContent);
}
