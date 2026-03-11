import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { TIMEOUT } from "../index.js";

let disconnectTimer = null;

/**
 * ボイスチャンネルに接続する（既存接続があればそれを返す）
 */
export function connectToVoice(guild, voiceChannel) {
	let connection = getVoiceConnection(guild.id);
	if (!connection) {
		connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: guild.id,
			adapterCreator: guild.voiceAdapterCreator,
			selfDeaf: false,
			selfMute: false,
		});
	}
	return connection;
}

/**
 * 自動切断タイマーをセットする
 */
export function setDisconnectTimeout(connection) {
	if (disconnectTimer) clearTimeout(disconnectTimer);
	disconnectTimer = setTimeout(() => {
		if (connection) {
			connection.destroy();
			console.log("Timeout: ボイスチャンネルから退出しました。");
		}
	}, TIMEOUT);
}

/**
 * ボイスチャンネルから退出する
 */
export function disconnectVoice(guildId) {
	const connection = getVoiceConnection(guildId);
	if (connection) {
		connection.destroy();
		if (disconnectTimer) clearTimeout(disconnectTimer);
		return true;
	}
	return false;
}

/**
 * interactionからボイスチャンネルを取得する
 */
export function resolveVoiceChannel(interaction, channelIdOption) {
	const guild = interaction.guild;
	if (!guild) return null;

	if (channelIdOption) {
		return guild.channels.cache.get(channelIdOption) || null;
	}

	return interaction.member.voice?.channel || null;
}
