import { disconnectVoice } from "../services/voice.js";
import { MessageFlags } from "discord.js";

export async function handleLVV(interaction) {
	const guild = interaction.guild;
	if (!guild) {
		await interaction.reply({ content: "このコマンドはサーバー内でのみ使用できます。", flags: MessageFlags.Ephemeral });
		return;
	}

	const disconnected = disconnectVoice(guild.id);
	await interaction.reply({
		content: disconnected
			? "ボイスチャンネルから退出しました。"
			: "ボイスチャンネルに接続していません。",
		flags: MessageFlags.Ephemeral,
	});
}
