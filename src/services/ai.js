import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

function getFormattedDate() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}時${pad(now.getMinutes())}分`;
}

const SYSTEM_PROMPT = `あなたは質問者の質問に日本語でこたえるアシスタントです。
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
 * AI応答を生成する（毎回独立した質問として処理）
 */
export async function generateAIResponse(question, userId, useSearch = false) {
	let responseText;

	if (useSearch) {
		// Google検索付きモード
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: `${question}\n\n${SEARCH_PROMPT}`,
			config: {
				tools: [{ googleSearch: {} }],
			},
		});
		responseText = response.text;
	} else {
		// 通常モード
		const now = getFormattedDate();
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: question,
			config: {
				systemInstruction: `${SYSTEM_PROMPT}\n現在の時刻: ${now}`,
			},
		});
		responseText = response.text;
	}

	console.log(`AI response for ${userId}: "${String(responseText).substring(0, 80)}..."`);
	return responseText;
}

/**
 * テキストを平易な言葉で140文字以内に要約する
 */
export async function summarizeText(text) {
	const response = await ai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: `以下の文章を、専門家でない人にもわかるように平易な言葉で140文字以内に要約してください。\n\n${text}`,
		config: {
			systemInstruction: "要約だけを出力してください。前置きや説明は不要です。",
		},
	});
	return response.text;
}
