import { MessageFlags } from "discord.js";

/**
 * deferReply を試行し、失敗時は内部状態を手動設定する。
 * secret=true の場合は ephemeral（自分のみ表示）になる。
 */
export async function safeDeferReply(interaction, secret = false) {
	try {
		const options = secret ? { flags: MessageFlags.Ephemeral } : {};
		await interaction.deferReply(options);
	} catch {
		interaction.deferred = true;
	}
}
