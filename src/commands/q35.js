import { generateQwenResponse } from "../services/qwen.js";
import { safeDeferReply, safeReply } from "../utils.js";

export async function handleQ35(interaction, { secret = false } = {}) {
	const method = await safeDeferReply(interaction, secret);

	const question = interaction.options.getString("question");

	// Qwen AI応答生成
	let responseText;
	try {
		responseText = await generateQwenResponse(question, interaction.user.id);
	} catch (error) {
		console.error("Qwen response error:", error);
		await safeReply(interaction, method, `Qwenエラー: ${error.message}`);
		return;
	}

	await safeReply(interaction, method, responseText);
}
