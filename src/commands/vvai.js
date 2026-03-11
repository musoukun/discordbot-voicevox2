import { generateAIResponse } from "../services/ai.js";
import { playInChannel } from "../services/voicevox.js";
import { connectToVoice, setDisconnectTimeout, resolveVoiceChannel } from "../services/voice.js";
import { ChannelType, MessageFlags } from "discord.js";

export async function handleVVAI(interaction) {
	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	} catch {
		// already acknowledged - continue with editReply
	}

	const question = interaction.options.getString("question");
	const speakerName = interaction.options.getString("speaker") || "ずんだもん (ノーマル)";
	const channelId = interaction.options.getString("channelid");
	const useSearch = interaction.options.getBoolean("search") || false;

	if (!interaction.guild) {
		await interaction.editReply({ content: "このコマンドはサーバー内でのみ使用できます。" });
		return;
	}

	const voiceChannel = resolveVoiceChannel(interaction, channelId);
	if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
		await interaction.editReply({
			content: "ボイスチャンネルに入室してから、もう一度コマンドを実行してください。",
		});
		return;
	}

	// AI応答生成
	let responseText;
	try {
		responseText = await generateAIResponse(question, interaction.user.id, useSearch);
	} catch (error) {
		console.error("AI response error:", error);
		await interaction.editReply({
			content: "AIの回答生成中にエラーが発生しました。もう一度お試しください。",
		});
		return;
	}

	// 音声再生
	try {
		const connection = connectToVoice(interaction.guild, voiceChannel);
		await playInChannel(connection, responseText, speakerName);
		setDisconnectTimeout(connection);
	} catch (error) {
		console.error("Voice playback error:", error);
		await interaction.editReply({
			content: `質問: ${question}\n\nAIの回答:\n${responseText}\n\n⚠ 音声再生中にエラーが発生しました。`,
		});
		return;
	}

	await interaction.editReply({
		content: `質問: ${question}\n\nAIの回答:\n${responseText}\n\n話者: ${speakerName}${useSearch ? "\n(Google検索で補完)" : ""}`,
	});
}
