import axios from "axios";
import { join } from "path";
import { writeFileSync, unlinkSync } from "fs";
import {
	createAudioPlayer,
	createAudioResource,
	NoSubscriberBehavior,
	AudioPlayerStatus,
} from "@discordjs/voice";
import { voiceTmpPath } from "../index.js";

const VOICEVOX_URL = process.env.VOICEVOX_URL || "http://localhost:50021";

// スピーカー一覧
let speakers = [];

export function getSpeakers() {
	return speakers;
}

export async function fetchVoicevoxSpeakers() {
	try {
		const { data } = await axios.get(`${VOICEVOX_URL}/speakers`);
		speakers = data.flatMap((speaker) =>
			speaker.styles.map((style) => ({
				name: `${speaker.name} (${style.name})`,
				id: style.id,
			}))
		);
		console.log(`VOICEVOX speakers loaded: ${speakers.length}`);
	} catch (error) {
		console.error("Failed to fetch VOICEVOX speakers:", error.message);
		console.log("VOICEVOX server may not be running. TTS will be unavailable.");
	}
}

export async function generateAudio(text, speakerId, options = {}) {
	// 音声クエリ生成
	const { data: query } = await axios.post(
		`${VOICEVOX_URL}/audio_query`,
		null,
		{ params: { text, speaker: speakerId } }
	);

	// パラメータ設定
	query.speedScale = options.speed ?? 1.0;
	query.pitchScale = options.pitch ?? 0;
	query.intonationScale = options.intonation ?? 1.0;
	query.volumeScale = options.volume ?? 1.0;

	// 音声合成
	const { data: audioData } = await axios.post(
		`${VOICEVOX_URL}/synthesis`,
		query,
		{ params: { speaker: speakerId }, responseType: "arraybuffer" }
	);

	const tempFilePath = join(voiceTmpPath, `audio_${Date.now()}.wav`);
	writeFileSync(tempFilePath, Buffer.from(audioData));

	return { tempFilePath, resource: createAudioResource(tempFilePath) };
}

export function findSpeaker(name) {
	return speakers.find((s) => s.name === name);
}

export function createPlayer() {
	return createAudioPlayer({
		behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
	});
}

/**
 * 音声を再生し、再生完了後に一時ファイルを削除する
 */
export async function playInChannel(connection, text, speakerName, options = {}) {
	const speaker = findSpeaker(speakerName);
	if (!speaker) {
		throw new Error(`話者「${speakerName}」が見つかりません。`);
	}

	const player = createPlayer();
	connection.subscribe(player);

	const { tempFilePath, resource } = await generateAudio(
		text,
		speaker.id,
		options
	);

	player.play(resource);

	// 再生完了後に一時ファイル削除
	player.on(AudioPlayerStatus.Idle, () => {
		try {
			unlinkSync(tempFilePath);
		} catch (err) {
			console.error(`Error deleting temp file: ${err.message}`);
		}
	});

	player.on("error", (error) => {
		console.error("Audio player error:", error);
	});

	return player;
}
