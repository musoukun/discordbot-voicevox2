import { MessageFlags } from "discord.js";

/**
 * deferReply を試行し、失敗時は内部状態を手動設定する。
 * secret=true の場合は ephemeral（自分のみ表示）になる。
 *
 * 公開モード（secret=false）の場合、deferReply失敗時は
 * followUp で公開メッセージを送れるように replyMethod を返す。
 */
export async function safeDeferReply(interaction, secret = false) {
	try {
		const options = secret ? { flags: MessageFlags.Ephemeral } : {};
		await interaction.deferReply(options);
		return "editReply";
	} catch {
		interaction.deferred = true;
		// auto-acknowledge が ephemeral の場合、公開コマンドは followUp を使う
		return secret ? "editReply" : "followUp";
	}
}

/**
 * safeDeferReply の結果に応じて返信する。
 * method="editReply" なら editReply、"followUp" なら followUp を使う。
 */
export async function safeReply(interaction, method, content) {
	if (method === "followUp") {
		// editReply で ephemeral な応答を消す
		await interaction.editReply({ content: "⠀" }).catch(() => {});
		return interaction.followUp({ content });
	}
	return interaction.editReply({ content });
}
