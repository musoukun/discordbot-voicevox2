import axios from "axios";

const KOBOLD_URL = process.env.KOBOLD_URL || "http://localhost:5001";

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
 * Qwen (KoboldCpp) でAI応答を生成する（毎回独立した質問として処理）
 */
export async function generateQwenResponse(question, userId) {
	const now = getFormattedDate();
	const messages = [
		{ role: "system", content: `${SYSTEM_PROMPT}\n現在の時刻: ${now}` },
		{ role: "user", content: question },
	];

	try {
		const { data } = await axios.post(
			`${KOBOLD_URL}/v1/chat/completions`,
			{
				messages,
				max_tokens: 2000,
				temperature: 0.7,
			},
			{ timeout: 180000 }
		);

		const rawText = data.choices[0].message.content;
		const responseText = stripThinkingTags(rawText);

		console.log(`Qwen response for ${userId}: "${String(responseText).substring(0, 80)}..."`);
		return responseText;
	} catch (error) {
		if (error.code === "ECONNREFUSED") {
			throw new Error("Qwen (KoboldCpp) が起動していません。");
		}
		throw error;
	}
}
