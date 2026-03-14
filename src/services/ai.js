import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// ユーザーごとの会話履歴（直近5往復まで保持）
const MAX_HISTORY = 5;
const chatHistories = new Map();

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
 * AI応答を生成する（ユーザーごとに直近5往復の会話履歴を保持）
 */
export async function generateAIResponse(question, userId, useSearch = false) {
	// ユーザーの会話履歴を取得（なければ初期化）
	if (!chatHistories.has(userId)) {
		chatHistories.set(userId, []);
	}
	const history = chatHistories.get(userId);

	let responseText;

	if (useSearch) {
		// Google検索付きモード（履歴なし：検索は毎回独立）
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: `${question}\n\n${SEARCH_PROMPT}`,
			config: {
				tools: [{ googleSearch: {} }],
			},
		});
		responseText = response.text;
	} else {
		// 通常モード（会話履歴付き）
		const now = getFormattedDate();
		const contents = [
			...history,
			{ role: "user", parts: [{ text: question }] },
		];
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents,
			config: {
				systemInstruction: `${SYSTEM_PROMPT}\n現在の時刻: ${now}`,
			},
		});
		responseText = response.text;
	}

	// 会話履歴に追加（直近MAX_HISTORY往復まで保持）
	history.push(
		{ role: "user", parts: [{ text: question }] },
		{ role: "model", parts: [{ text: responseText }] }
	);
	while (history.length > MAX_HISTORY * 2) {
		history.splice(0, 2);
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
