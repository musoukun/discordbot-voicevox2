import { MessageFlags } from "discord.js";

/**
 * deferReply を試行し、失敗時は内部状態を手動設定する。
 *
 * この環境では deferReply() が 40060 で常に失敗する。
 * 失敗時は ephemeral メッセージを「考え中...」に即座に書き換え、
 * 公開コマンドでは channel.send() で直接メッセージを送る。
 */
export async function safeDeferReply(interaction, secret = false) {
	try {
		const options = secret ? { flags: MessageFlags.Ephemeral } : {};
		await interaction.deferReply(options);
		return "editReply";
	} catch (err) {
		console.error("deferReply failed:", err.code, err.message);
		interaction.deferred = true;
		// ephemeral の内容を即座に書き換え
		await interaction.editReply({ content: "考え中..." }).catch(() => {});
		return secret ? "editReply" : "channelSend";
	}
}

/**
 * safeDeferReply の結果に応じて返信する。
 */
export async function safeReply(interaction, method, content) {
	if (method === "channelSend") {
		// ephemeral を削除して公開メッセージを送信
		await interaction.deleteReply().catch(() => {});
		return interaction.channel.send(content);
	}
	return interaction.editReply({ content });
}
