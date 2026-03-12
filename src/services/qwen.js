import axios from "axios";

const KOBOLD_URL = process.env.KOBOLD_URL || "http://localhost:5001";

// ユーザーごとの会話履歴
const chatHistories = {};

function getFormattedDate() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}時${pad(now.getMinutes())}分`;
}

const SYSTEM_PROMPT = `あなたは質問者の質問に日本語でこたえるアシスタントです。
「了解しました」等の前置きを省き、直接結果だけを回答してください。
質問を繰り返す必要はありません。`;

const SYSTEM_PROMPT_VVQ = `あなたは質問者の質問に日本語でこたえるアシスタントです。
「了解しました」等の前置きを省き、直接結果だけを回答してください。
質問を繰り返す必要はありません。

回答が150文字を超える場合は、以下のフォーマットで回答してください：
---要約---
（140文字以内の要約）
---全文---
（全文の回答）

回答が150文字以下の場合はそのまま回答してください。フォーマットは不要です。`;

/**
 * Qwen ChatML形式のプロンプトを構築する
 */
function buildChatMLPrompt(systemPrompt, history, question) {
	const now = getFormattedDate();
	let prompt = `<|im_start|>system\n${systemPrompt}\n現在の時刻: ${now}<|im_end|>\n`;

	for (const msg of history) {
		prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
	}

	prompt += `<|im_start|>user\n${question}<|im_end|>\n`;
	prompt += `<|im_start|>assistant\n`;

	return prompt;
}

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
 * VVQフォーマットのレスポンスから要約と全文を分離する
 * @returns {{ summary: string, full: string }}
 */
export function parseVvqResponse(text) {
	const summaryMatch = text.match(/---要約---\s*([\s\S]*?)\s*---全文---/);
	if (summaryMatch) {
		const summary = summaryMatch[1].trim();
		const full = text.replace(/---要約---[\s\S]*?---全文---\s*/, "").trim();
		return { summary, full };
	}
	// フォーマットなし（150文字以下の場合）→ そのまま使う
	return { summary: text, full: text };
}

/**
 * Qwen (KoboldCpp) でAI応答を生成する（ネイティブAPI使用）
 */
export async function generateQwenResponse(question, userId, { mode = "default" } = {}) {
	if (!chatHistories[userId]) {
		chatHistories[userId] = [];
	}

	const history = chatHistories[userId].slice(-10);
	const systemPrompt = mode === "vvq" ? SYSTEM_PROMPT_VVQ : SYSTEM_PROMPT;
	const prompt = buildChatMLPrompt(systemPrompt, history, question);

	try {
		const { data } = await axios.post(
			`${KOBOLD_URL}/api/v1/generate`,
			{
				prompt,
				max_length: 2000,
				temperature: 0.7,
				banned_tokens: [],
				stop_sequence: ["<|im_end|>", "<|im_start|>"],
				trim_stop: true,
			},
			{ timeout: 180000 }
		);

		const rawText = data.results[0].text;
		const responseText = stripThinkingTags(rawText);

		// 会話履歴を更新
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
