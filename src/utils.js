import { MessageFlags } from "discord.js";

/**
 * interaction に初期応答を送る。
 * reply() が 40060 で失敗した場合、既にacknowledgeされているので editReply で上書きする。
 */
export async function safeDeferReply(interaction, secret = false) {
	try {
		const options = { content: "処理中..." };
		if (secret) options.flags = MessageFlags.Ephemeral;
		await interaction.reply(options);
		return "editReply";
	} catch (err) {
		if (err.code === 40060) {
			// 既にacknowledgeされている → editReplyで上書き
			interaction.replied = true;
			try {
				await interaction.editReply({ content: "処理中..." });
				return "editReply";
			} catch {
				// editReplyも失敗
			}
		}
		// 最終フォールバック
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
