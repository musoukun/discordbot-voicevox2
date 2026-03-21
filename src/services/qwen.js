import axios from "axios";

const KOBOLD_URL = process.env.KOBOLD_URL || "http://localhost:5001";

// 処理中リクエストの追跡
let activeRequests = 0;

// ユーザーごとの会話履歴（直近5往復まで保持）
const MAX_HISTORY = 5;
const chatHistories = new Map();

/**
 * 現在の待ち状況を返す（0なら待ちなし）
 */
export function getQueuePosition() {
	return activeRequests;
}

function getFormattedDate() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}時${pad(now.getMinutes())}分`;
}

const SYSTEM_PROMPT = `あなたは質問者の質問に日本語でこたえるアシスタントです。
「了解しました」等の前置きを省き、直接結果だけを回答してください。
質問を繰り返す必要はありません。`;

/**
 * <think>...</think> タグを除去してGenerateされた回答のみを返す
 */
function stripThinkingTags(text) {
	// 閉じタグありの場合: <think>...</think> を除去
	let result = text.replace(/<think>[\s\S]*?<\/think>/g, "");
	// 閉じタグなしの場合: <think>以降をすべて除去
	result = result.replace(/<think>[\s\S]*/g, "");
	return result.trim();
}

/**
 * Qwen (KoboldCpp) でAI応答を生成する（ユーザーごとに直近5往復の会話履歴を保持）
 */
export async function generateQwenResponse(question, userId) {
	const now = getFormattedDate();

	// ユーザーの会話履歴を取得（なければ初期化）
	if (!chatHistories.has(userId)) {
		chatHistories.set(userId, []);
	}
	const history = chatHistories.get(userId);

	const messages = [
		{ role: "system", content: `${SYSTEM_PROMPT}\n現在の時刻: ${now}` },
		...history,
		{ role: "user", content: question + "\n/no_think" },
	];

	activeRequests++;
	try {
		const { data } = await axios.post(
			`${KOBOLD_URL}/v1/chat/completions`,
			{
				messages,
				max_tokens: 2000,
				temperature: 0.7,
				chat_template_kwargs: { enable_thinking: false },
			},
			{ timeout: 180000 }
		);

		const rawText = data.choices[0].message.content;
		const responseText = stripThinkingTags(rawText);

		// 会話履歴に追加（直近MAX_HISTORY往復まで保持）
		history.push(
			{ role: "user", content: question },
			{ role: "assistant", content: responseText }
		);
		// 古い履歴を削除（1往復 = 2メッセージ）
		while (history.length > MAX_HISTORY * 2) {
			history.splice(0, 2);
		}

		console.log(`Qwen response for ${userId}: "${String(responseText).substring(0, 80)}..."`);
		return responseText;
	} catch (error) {
		if (error.code === "ECONNREFUSED") {
			throw new Error("Qwen (KoboldCpp) が起動していません。");
		}
		throw error;
	} finally {
		activeRequests--;
	}
}
