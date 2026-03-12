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
		console.log("[safeDeferReply] reply() succeeded");
		return "editReply";
	} catch (err) {
		console.error("[safeDeferReply] reply() failed:", err.code, err.message);
		if (err.code === 40060) {
			// 既にacknowledgeされている → 現在の応答内容を確認
			interaction.replied = true;
			try {
				const current = await interaction.fetchReply();
				console.log("[safeDeferReply] 40060 caught. Current reply content:", JSON.stringify(current.content), "flags:", current.flags?.bitfield);
			} catch (fetchErr) {
				console.error("[safeDeferReply] fetchReply failed:", fetchErr.message);
			}
			try {
				await interaction.editReply({ content: "処理中..." });
				console.log("[safeDeferReply] editReply() succeeded (40060 recovery)");
				return "editReply";
			} catch (editErr) {
				console.error("[safeDeferReply] editReply() also failed:", editErr.code, editErr.message);
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
