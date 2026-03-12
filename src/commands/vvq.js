import { generateQwenResponse } from "../services/qwen.js";
import { playInChannel } from "../services/voicevox.js";
import { connectToVoice, setDisconnectTimeout, resolveVoiceChannel } from "../services/voice.js";
import { ChannelType } from "discord.js";
import { safeDeferReply, safeReply } from "../utils.js";

const SUMMARY_CHAR_LIMIT = 150;

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

	// Qwen AI応答生成（全文）
	let responseText;
	try {
		responseText = await generateQwenResponse(question, interaction.user.id);
	} catch (error) {
		console.error("Qwen response error:", error);
		await safeReply(interaction, method, `Qwenエラー: ${error.message}`);
		return;
	}

	// 読み上げテキストを決定（長い場合は要約を生成）
	let voiceText = responseText;
	let summaryText = null;
	if (responseText.length > SUMMARY_CHAR_LIMIT) {
		try {
			summaryText = await generateQwenResponse(
				`以下の文章を、専門家でない人にもわかるように平易な言葉で140文字以内に要約してください。\n\n${responseText}`,
				interaction.user.id
			);
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
	let publicContent = `質問: ${question}\n\nAIの回答 (Qwen3.5):\n${responseText}`;
	if (summaryText) {
		publicContent += `\n\n📝 読み上げ要約:\n${summaryText}`;
	}
	publicContent += `\n\n話者: ${speakerName}`;
	await safeReply(interaction, method, publicContent);
}
