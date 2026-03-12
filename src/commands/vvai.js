import { generateAIResponse, summarizeText } from "../services/ai.js";
import { playInChannel } from "../services/voicevox.js";
import { connectToVoice, setDisconnectTimeout, resolveVoiceChannel } from "../services/voice.js";
import { ChannelType } from "discord.js";
import { safeDeferReply, safeReply } from "../utils.js";

const SUMMARY_CHAR_LIMIT = 150;

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

	// AI応答生成（全文）
	let responseText;
	try {
		responseText = await generateAIResponse(question, interaction.user.id, useSearch);
	} catch (error) {
		console.error("AI response error:", error);
		await safeReply(interaction, method, "AIの回答生成中にエラーが発生しました。もう一度お試しください。");
		return;
	}

	// 読み上げテキストを決定（長い場合は要約を生成）
	let voiceText = responseText;
	let summaryText = null;
	if (responseText.length > SUMMARY_CHAR_LIMIT) {
		try {
			summaryText = await summarizeText(responseText);
			voiceText = summaryText;
		} catch (error) {
			console.error("Summary generation error:", error);
			// 要約失敗時は先頭140文字を使う
			voiceText = responseText.substring(0, 140);
		}
	}

	// 音声再生（要約 or 全文を読み上げ）
	try {
		const connection = connectToVoice(interaction.guild, voiceChannel);
		await playInChannel(connection, voiceText, speakerName);
		setDisconnectTimeout(connection);
	} catch (error) {
		console.error("Voice playback error:", error);
		await safeReply(interaction, method, `質問: ${question}\n\nAIの回答:\n${responseText}\n\n⚠ 音声再生中にエラーが発生しました。`);
		return;
	}

	// 表示内容を構築
	let publicContent = `質問: ${question}\n\nAIの回答:\n${responseText}`;
	if (summaryText) {
		publicContent += `\n\n📝 読み上げ要約:\n${summaryText}`;
	}
	publicContent += `\n\n話者: ${speakerName}${useSearch ? "\n(Google検索で補完)" : ""}`;
	await safeReply(interaction, method, publicContent);
}
