import { MessageFlags } from "discord.js";

/**
 * deferReply を試行し、失敗時は内部状態を手動設定する。
 * secret=true の場合は ephemeral（自分のみ表示）になる。
 *
 * 40060 (already acknowledged) の場合、deferReply は実際には成功しているため
 * editReply でそのまま更新できる。followUp への切り替えは不要。
 */
export async function safeDeferReply(interaction, secret = false) {
	try {
		const options = secret ? { flags: MessageFlags.Ephemeral } : {};
		await interaction.deferReply(options);
	} catch (err) {
		console.error("deferReply failed:", err.code, err.message);
		interaction.deferred = true;
	}
}

/**
 * deferReply 後の返信。常に editReply を使用する。
 */
export async function safeReply(interaction, content) {
	return interaction.editReply({ content });
}
