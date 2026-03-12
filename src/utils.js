import { MessageFlags } from "discord.js";

/**
 * deferReply を試行し、失敗時は内部状態を手動設定する。
 *
 * この環境では deferReply() が 40060 で常に失敗し、
 * Discord が ephemeral として自動 acknowledge するため、
 * 公開コマンドでは channel.send() で直接メッセージを送る。
 *
 * 戻り値:
 *   "editReply"  — deferReply 成功時、またはsecretコマンド
 *   "channelSend" — deferReply 失敗時の公開コマンド（channel.send で公開送信）
 */
export async function safeDeferReply(interaction, secret = false) {
	try {
		const options = secret ? { flags: MessageFlags.Ephemeral } : {};
		await interaction.deferReply(options);
		return "editReply";
	} catch (err) {
		console.error("deferReply failed:", err.code, err.message);
		interaction.deferred = true;
		// secret なら editReply で ephemeral 更新
		// 公開コマンドなら channel.send で直接送信（ephemeral 回避）
		return secret ? "editReply" : "channelSend";
	}
}

/**
 * safeDeferReply の結果に応じて返信する。
 */
export async function safeReply(interaction, method, content) {
	if (method === "channelSend") {
		// ephemeral の自動応答を削除
		await interaction.deleteReply().catch(() => {});
		// チャンネルに直接公開メッセージを送信
		return interaction.channel.send(content);
	}
	return interaction.editReply({ content });
}
