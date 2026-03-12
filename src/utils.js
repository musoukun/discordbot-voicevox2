import { MessageFlags } from "discord.js";

/**
 * deferReply を試行し、失敗時は内部状態を手動設定する。
 *
 * Discord が自動で ephemeral として acknowledge するため、
 * deferReply() は 40060 で失敗することがある。
 * 公開コマンド（secret=false）の場合は followUp で公開メッセージを送る必要がある。
 *
 * 戻り値:
 *   "editReply" — deferReply 成功時、またはsecretコマンド
 *   "followUp"  — deferReply 失敗時の公開コマンド
 */
export async function safeDeferReply(interaction, secret = false) {
	try {
		const options = secret ? { flags: MessageFlags.Ephemeral } : {};
		await interaction.deferReply(options);
		return "editReply";
	} catch (err) {
		console.error("deferReply failed:", err.code, err.message);
		interaction.deferred = true;
		// 失敗時は ephemeral で acknowledge 済み
		// secret なら editReply で ephemeral 更新、公開なら followUp で新規公開メッセージ
		return secret ? "editReply" : "followUp";
	}
}

/**
 * safeDeferReply の結果に応じて返信する。
 *   editReply — deferReply 成功時 or secret コマンド
 *   followUp  — ephemeral acknowledge 済みの公開コマンド
 */
export async function safeReply(interaction, method, content) {
	if (method === "followUp") {
		// ephemeral の自動応答を削除してから公開メッセージを送信
		await interaction.deleteReply().catch(() => {});
		return interaction.followUp({ content });
	}
	return interaction.editReply({ content });
}
