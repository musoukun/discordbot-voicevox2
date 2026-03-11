import { playInChannel } from "../services/voicevox.js";
import { connectToVoice, setDisconnectTimeout, resolveVoiceChannel } from "../services/voice.js";
import { ChannelType, MessageFlags } from "discord.js";

export async function handleVV(interaction) {
	interaction.deferred = true;

	const text = interaction.options.getString("text");
	let speakerName = interaction.options.getString("speaker") || "ずんだもん (ノーマル)";
	if (speakerName === "custom") {
		speakerName = interaction.options.getString("custom_speaker") || "ずんだもん (ノーマル)";
	}

	const channelId = interaction.options.getString("channelid");
	const voiceChannel = resolveVoiceChannel(interaction, channelId);

	if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
		await interaction.editReply({
			content: "ボイスチャンネルに入室してから、もう一度コマンドを実行してください。",
		});
		return;
	}

	const options = {
		speed: interaction.options.getNumber("speed"),
		pitch: interaction.options.getNumber("pitch"),
		intonation: interaction.options.getNumber("intonation"),
		volume: interaction.options.getNumber("volume"),
	};

	console.log("[VV] Connecting to voice channel...");
	const connection = connectToVoice(interaction.guild, voiceChannel);
	console.log(`[VV] Connection state: ${connection.state.status}`);

	await playInChannel(connection, text, speakerName, options);
	console.log("[VV] playInChannel completed");

	setDisconnectTimeout(connection);

	try {
		await interaction.editReply({
			content: `読み上げ開始: 話者=${speakerName}, 速度=${options.speed ?? 1.0}, 音高=${options.pitch ?? 0}, 抑揚=${options.intonation ?? 1.0}, 音量=${options.volume ?? 1.0}`,
		});
		console.log("[VV] editReply succeeded");
	} catch (e) {
		console.log(`[VV] editReply failed: ${e.code || e.message}`);
	}
}
