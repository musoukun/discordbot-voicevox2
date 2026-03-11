import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// ユーザーごとの会話履歴（Gemini API形式: { role, parts }）
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

const SEARCH_PROMPT = `以下の指示に従って回答してください：
0. 回答に確信を持てない場合は「わからない」と回答してください。
1. 最新の情報で詳しく答えてください
2. 回答は必ず日本語で提供してください
3. 回答は160文字以内に要約してください
4. 重要なポイントだけを簡潔に伝えてください
5. 「承知しました」等の前置きは省き、直接結果だけを回答してください
6. 質問の繰り返しも不要です`;

/**
 * AI応答を生成する
 */
export async function generateAIResponse(question, userId, useSearch = false) {
	if (!chatHistories[userId]) {
		chatHistories[userId] = [];
	}

	const history = chatHistories[userId].slice(-10);
	let responseText;

	if (useSearch) {
		// Google検索付きモード
		const response = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: `${question}\n\n${SEARCH_PROMPT}`,
			config: {
				tools: [{ googleSearch: {} }],
			},
		});
		responseText = response.text;
	} else {
		// 通常の会話モード（会話履歴付き）
		const now = getFormattedDate();
		const systemInstruction = `${SYSTEM_PROMPT}\n現在の時刻: ${now}`;

		const response = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: [
				...history,
				{ role: "user", parts: [{ text: question }] },
			],
			config: {
				systemInstruction,
			},
		});
		responseText = response.text;
	}

	// 会話履歴を更新
	chatHistories[userId].push({ role: "user", parts: [{ text: question }] });
	chatHistories[userId].push({ role: "model", parts: [{ text: responseText }] });

	console.log(`AI response for ${userId}: "${String(responseText).substring(0, 80)}..."`);
	return responseText;
}
