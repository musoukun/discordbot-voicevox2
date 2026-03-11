import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const apiKey = process.env.GOOGLE_API_KEY;

// ユーザーごとの会話履歴
const chatHistories = {};

function getFormattedDate() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}時${pad(now.getMinutes())}分`;
}

/**
 * AI応答を生成する
 */
export async function generateAIResponse(question, userId, useSearch = false) {
	if (!chatHistories[userId]) {
		chatHistories[userId] = [];
	}

	let response;

	if (useSearch) {
		// Google検索付きモード
		const model = new ChatGoogleGenerativeAI({
			apiKey,
			modelName: "gemini-2.0-flash-exp",
		});

		const searchLimit = 160;
		const result = await model.invoke(
			[
				[
					"human",
					`${question}

以下の指示に従って回答してください：
0. 回答に確信を持てない場合は「わからない」と回答してください。
1. 最新の情報で詳しく答えてください
2. 回答は必ず日本語で提供してください
3. 回答は${searchLimit}文字以内に要約してください
4. 重要なポイントだけを簡潔に伝えてください
5. 「承知しました」等の前置きは省き、直接結果だけを回答してください
6. 質問の繰り返しも不要です`,
				],
			],
			{ tools: [{ googleSearch: {} }] }
		);

		response = result.content;
	} else {
		// 通常の会話モード
		const lengthLimit = 250;
		const systemPrompt = `あなたは質問者の質問に日本語で簡潔にこたえるアシスタントです。
質問内容は要約して${lengthLimit}文字以内で回答してください。
わからない場合は「わかりません」と回答してください。
${lengthLimit}文字以上になりそうな場合は簡潔に要約して回答してください。
「了解しました」等の前置きを省き、直接結果だけを回答してください。
質問を繰り返す必要はありません。
会話履歴:{chat_history}
現在の時刻: {now}
入力内容: {input}`;

		const prompt = ChatPromptTemplate.fromMessages([
			["system", systemPrompt],
			["placeholder", "{chat_history}"],
			["human", "{input}"],
		]);

		const model = new ChatGoogleGenerativeAI({
			apiKey,
			modelName: "gemini-2.0-flash",
		});

		const chain = RunnableSequence.from([
			RunnablePassthrough.assign({
				chat_history: ({ chat_history }) => chat_history.slice(-10),
			}),
			prompt,
			model,
			new StringOutputParser(),
		]);

		response = await chain.invoke({
			chat_history: chatHistories[userId],
			input: question,
			now: getFormattedDate(),
		});
	}

	// 会話履歴を更新
	chatHistories[userId].push(new HumanMessage(question));
	chatHistories[userId].push(new AIMessage(response));

	console.log(`AI response for ${userId}: "${String(response).substring(0, 80)}..."`);
	return response;
}
