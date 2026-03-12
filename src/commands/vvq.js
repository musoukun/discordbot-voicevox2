import { generateQwenResponse } from "../services/qwen.js";
import { playInChannel } from "../services/voicevox.js";
import { connectToVoice, setDisconnectTimeout, resolveVoiceChannel } from "../services/voice.js";
import { ChannelType } from "discord.js";
import { safeDeferReply, safeReply } from "../utils.js";

export async function handleVVQ(interaction, { secret = false } = {}) {
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

	// Qwen AI応答生成
	let responseText;
	try {
		responseText = await generateQwenResponse(question, interaction.user.id);
	} catch (error) {
		console.error("Qwen response error:", error);
		await safeReply(interaction, method, `Qwenエラー: ${error.message}`);
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

	const publicContent = `質問: ${question}\n\nAIの回答 (Qwen3.5):\n${responseText}\n\n話者: ${speakerName}`;
	const statusInfo = `読み上げ開始: 話者=${speakerName} (Qwen3.5)`;
	await safeReply(interaction, method, publicContent, { ephemeralContent: statusInfo });
}
