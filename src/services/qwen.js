import axios from "axios";

const KOBOLD_URL = process.env.KOBOLD_URL || "http://localhost:5001";

// ユーザーごとの会話履歴
const chatHistories = {};

function getFormattedDate() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}時${pad(now.getMinutes())}分`;
}

const SYSTEM_PROMPT = `あなたは質問者の質問に日本語で簡潔にこたえるアシスタントです。
質問内容は要約して250文字以内で回答してください。
わからない場合は「わかりません」と回答してください。
250文字以上になりそうな場合は簡潔に要約して回答してください。
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
 * Qwen (KoboldCpp) でAI応答を生成する
 */
export async function generateQwenResponse(question, userId) {
	if (!chatHistories[userId]) {
		chatHistories[userId] = [];
	}

	const history = chatHistories[userId].slice(-10);
	const now = getFormattedDate();

	const messages = [
		{ role: "system", content: `${SYSTEM_PROMPT}\n現在の時刻: ${now}` },
		...history,
		{ role: "user", content: `${question} /no_think` },
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

		// 会話履歴を更新（思考タグ除去済みのテキストを保存）
		chatHistories[userId].push({ role: "user", content: question });
		chatHistories[userId].push({ role: "assistant", content: responseText });

		console.log(`Qwen response for ${userId}: "${String(responseText).substring(0, 80)}..."`);
		return responseText;
	} catch (error) {
		if (error.code === "ECONNREFUSED") {
			throw new Error("Qwen (KoboldCpp) が起動していません。");
		}
		throw error;
	}
}
