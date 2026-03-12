import { generateQwenResponse } from "../services/qwen.js";
import { safeDeferReply, safeReply } from "../utils.js";

export async function handleQ35(interaction, { secret = false } = {}) {
	await safeDeferReply(interaction, secret);

	const question = interaction.options.getString("question");

	// Qwen AI応答生成
	let responseText;
	try {
		responseText = await generateQwenResponse(question, interaction.user.id);
	} catch (error) {
		console.error("Qwen response error:", error);
		await safeReply(interaction, `Qwenエラー: ${error.message}`);
		return;
	}

	if (!responseText) {
		await safeReply(interaction, "回答を生成できませんでした。");
		return;
	}

	await safeReply(interaction, responseText);
}
