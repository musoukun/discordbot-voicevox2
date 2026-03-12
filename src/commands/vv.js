import { playInChannel } from "../services/voicevox.js";
import { connectToVoice, setDisconnectTimeout, resolveVoiceChannel } from "../services/voice.js";
import { ChannelType } from "discord.js";
import { safeDeferReply, safeReply } from "../utils.js";

export async function handleVV(interaction, { secret = false } = {}) {
	await safeDeferReply(interaction, secret);

	const text = interaction.options.getString("text");
	let speakerName = interaction.options.getString("speaker") || "ずんだもん (ノーマル)";
	if (speakerName === "custom") {
		speakerName = interaction.options.getString("custom_speaker") || "ずんだもん (ノーマル)";
	}

	const channelId = interaction.options.getString("channelid");
	const voiceChannel = resolveVoiceChannel(interaction, channelId);

	if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
		await safeReply(interaction, "ボイスチャンネルに入室してから、もう一度コマンドを実行してください。");
		return;
	}

	const options = {
		speed: interaction.options.getNumber("speed"),
		pitch: interaction.options.getNumber("pitch"),
		intonation: interaction.options.getNumber("intonation"),
		volume: interaction.options.getNumber("volume"),
	};

	const connection = connectToVoice(interaction.guild, voiceChannel);
	await playInChannel(connection, text, speakerName, options);
	setDisconnectTimeout(connection);

	await safeReply(interaction, `読み上げメッセージ: ${text}\n話者: ${speakerName}`);
}
