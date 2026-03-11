import { disconnectVoice } from "../services/voice.js";

export async function handleLVV(interaction) {
	const guild = interaction.guild;
	if (!guild) {
		await interaction.reply({ content: "このコマンドはサーバー内でのみ使用できます。", ephemeral: true });
		return;
	}

	const disconnected = disconnectVoice(guild.id);
	await interaction.reply({
		content: disconnected
			? "ボイスチャンネルから退出しました。"
			: "ボイスチャンネルに接続していません。",
		ephemeral: true,
	});
}
