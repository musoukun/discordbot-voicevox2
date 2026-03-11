import axios from "axios";
import { join } from "path";
import { writeFileSync, unlinkSync, statSync } from "fs";
import {
	createAudioPlayer,
	createAudioResource,
	NoSubscriberBehavior,
	AudioPlayerStatus,
	VoiceConnectionStatus,
	entersState,
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
	console.log(`[VOICEVOX] Generating audio: text="${text.substring(0, 30)}...", speaker=${speakerId}`);

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

	const fileSize = statSync(tempFilePath).size;
	console.log(`[VOICEVOX] Audio file created: ${tempFilePath} (${fileSize} bytes)`);

	const resource = createAudioResource(tempFilePath);
	console.log(`[VOICEVOX] Audio resource created, readable=${resource.readable}`);

	return { tempFilePath, resource };
}

export function findSpeaker(name) {
	return speakers.find((s) => s.name === name);
}

export function createPlayer() {
	return createAudioPlayer({
		behaviors: { noSubscriber: NoSubscriberBehavior.Play },
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

	// 接続状態を確認・待機
	console.log(`[Voice] Connection status: ${connection.state.status}`);
	if (connection.state.status !== VoiceConnectionStatus.Ready) {
		console.log("[Voice] Waiting for connection to be ready...");
		try {
			await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
			console.log("[Voice] Connection is now ready.");
		} catch {
			throw new Error("ボイスチャンネルへの接続がタイムアウトしました。");
		}
	}

	const player = createPlayer();
	const subscription = connection.subscribe(player);
	console.log(`[Voice] Player subscribed: ${!!subscription}`);

	const { tempFilePath, resource } = await generateAudio(
		text,
		speaker.id,
		options
	);

	// プレイヤーの状態変化を監視
	player.on("stateChange", (oldState, newState) => {
		console.log(`[Player] State: ${oldState.status} -> ${newState.status}`);
	});

	player.on("error", (error) => {
		console.error("[Player] Error:", error.message);
		console.error("[Player] Resource:", error.resource?.metadata);
	});

	player.play(resource);
	console.log(`[Player] play() called, status: ${player.state.status}`);

	// 再生完了後に一時ファイル削除
	player.on(AudioPlayerStatus.Idle, () => {
		console.log("[Player] Playback finished, cleaning up temp file.");
		try {
			unlinkSync(tempFilePath);
		} catch (err) {
			console.error(`Error deleting temp file: ${err.message}`);
		}
	});

	return player;
}
