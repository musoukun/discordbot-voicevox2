import { generateAIResponse } from "../services/ai.js";
import { safeDeferReply, safeReply } from "../utils.js";

export async function handleG25F(interaction, { secret = false } = {}) {
	const method = await safeDeferReply(interaction, secret);

	const question = interaction.options.getString("question");
	const useSearch = interaction.options.getBoolean("search") || false;

	// Gemini AI応答生成
	let responseText;
	try {
		responseText = await generateAIResponse(question, interaction.user.id, useSearch);
	} catch (error) {
		console.error("Gemini response error:", error);
		await safeReply(interaction, method, `Geminiエラー: ${error.message}`);
		return;
	}

	if (!responseText) {
		await safeReply(interaction, method, "回答を生成できませんでした。");
		return;
	}

	await safeReply(interaction, method, responseText);
}
