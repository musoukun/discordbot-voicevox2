import { MessageFlags } from "discord.js";

/**
 * interaction に初期応答を送る。
 * deferReply() が 40060 で常に失敗するため、reply() で直接応答する。
 * 失敗時は channel.send にフォールバック。
 */
export async function safeDeferReply(interaction, secret = false) {
	try {
		const options = { content: "考え中..." };
		if (secret) options.flags = MessageFlags.Ephemeral;
		await interaction.reply(options);
		return "editReply";
	} catch (err) {
		console.error("reply failed:", err.code, err.message);
		// reply も失敗した場合は channel.send にフォールバック
		return secret ? "editReply" : "channelSend";
	}
}

/**
 * safeDeferReply の結果に応じて返信する。
 */
export async function safeReply(interaction, method, content) {
	if (method === "channelSend") {
		return interaction.channel.send(content);
	}
	return interaction.editReply({ content });
}
