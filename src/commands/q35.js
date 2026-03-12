import { generateQwenResponse, getQueuePosition } from "../services/qwen.js";
import { safeDeferReply, safeReply } from "../utils.js";

export async function handleQ35(interaction, { secret = false } = {}) {
	const method = await safeDeferReply(interaction, secret);

	const question = interaction.options.getString("question");

	// 他のリクエストが処理中なら通知
	const queue = getQueuePosition();
	if (queue > 0) {
		await safeReply(interaction, method, `処理中... (待ち: ${queue}件のリクエストが先に処理されています)`).catch(() => {});
	}

	// Qwen AI応答生成
	let responseText;
	try {
		responseText = await generateQwenResponse(question, interaction.user.id);
	} catch (error) {
		console.error("Qwen response error:", error);
		await safeReply(interaction, method, `Qwenエラー: ${error.message}`);
		return;
	}

	if (!responseText) {
		await safeReply(interaction, method, "回答を生成できませんでした。");
		return;
	}

	await safeReply(interaction, method, responseText);
}
