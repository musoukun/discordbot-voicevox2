import axios from "axios";

const COMFYUI_URL = process.env.COMFYUI_URL || "http://localhost:8188";

// 処理中リクエストの追跡
let activeRequests = 0;

// ユーザーごとの会話履歴（直近5往復まで保持）
const MAX_HISTORY = 5;
const chatHistories = new Map();

/**
 * 現在の待ち状況を返す（0なら待ちなし）
 */
export function getQueuePosition() {
	return activeRequests;
}

function getFormattedDate() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}時${pad(now.getMinutes())}分`;
}

const SYSTEM_PROMPT = `あなたは質問者の質問に日本語でこたえるアシスタントです。
「了解しました」等の前置きを省き、直接結果だけを回答してください。
質問を繰り返す必要はありません。`;

const MODEL_PATH = process.env.COMFYUI_MODEL_PATH ||
	"C:\\Users\\waros\\Downloads\\StabilityMatrix-win-x64\\Data\\Packages\\ComfyUI\\models\\LLM\\GGUF\\Qwen3.5-4B-Uncensored-HauhauCS-Aggressive-Q6_K.gguf";

/**
 * ComfyUI APIワークフローを構築する
 */
function buildWorkflow(userPrompt, historyText) {
	const fullUserPrompt = historyText
		? `${historyText}\n\n現在の質問: ${userPrompt}\n/no_think`
		: `${userPrompt}\n/no_think`;

	return {
		"6": {
			class_type: "GGUFLoader",
			inputs: {
				model_path: MODEL_PATH,
				max_ctx: 2048,
				gpu_layers: 31,
				n_threads: 4,
				is_locked: true,
			},
		},
		"7": {
			class_type: "LLM_local",
			inputs: {
				model: ["6", 0],
				system_prompt: "",
				user_prompt: fullUserPrompt,
				model_type: "LLM-GGUF",
				temperature: 0.7,
				max_length: 2000,
				is_memory: "disable",
				is_locked: "disable",
				main_brain: "enable",
				conversation_rounds: 1,
				historical_record: "",
				is_enable: true,
				is_enable_system_role: "enable",
			},
		},
		"9": {
			class_type: "show_text_party",
			inputs: {
				text: ["7", 0],
			},
		},
	};
}

/**
 * ComfyUIにプロンプトをキューイングする
 */
async function queuePrompt(workflow) {
	let data;
	try {
		const resp = await axios.post(
			`${COMFYUI_URL}/prompt`,
			{ prompt: workflow },
			{ timeout: 10000 }
		);
		data = resp.data;
	} catch (error) {
		if (error.response?.data) {
			const errData = error.response.data;
			console.error("ComfyUI API error:", JSON.stringify(errData, null, 2));
			const nodeErrors = errData.node_errors || {};
			const msgs = Object.entries(nodeErrors)
				.map(([nid, err]) => `Node ${nid}: ${err.errors?.map((e) => e.details || e.message).join("; ")}`)
				.join(", ");
			throw new Error(`ComfyUI error: ${msgs || errData.error?.message || JSON.stringify(errData)}`);
		}
		throw error;
	}
	return data.prompt_id;
}

/**
 * ComfyUI historyをポーリングして完了を待つ
 */
async function pollHistory(promptId, timeout = 300000) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const { data: history } = await axios.get(
			`${COMFYUI_URL}/history/${promptId}`,
			{ timeout: 10000 }
		);
		if (history[promptId]) {
			const entry = history[promptId];
			const status = entry.status || {};
			if (status.completed) {
				return entry;
			}
			if (status.status_str === "error") {
				throw new Error(`ComfyUI execution error: ${JSON.stringify(status)}`);
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
	throw new Error(`ComfyUI timeout: ${promptId}`);
}

/**
 * historyからテキスト出力を抽出する
 */
function extractText(historyEntry) {
	const outputs = historyEntry.outputs || {};
	for (const [, out] of Object.entries(outputs)) {
		// show_text_party は text フィールドに結果を格納
		if (out.text) {
			if (Array.isArray(out.text)) {
				return out.text.join("");
			}
			return String(out.text);
		}
		// ui.text パターン
		if (out.ui?.text) {
			if (Array.isArray(out.ui.text)) {
				return out.ui.text.join("");
			}
			return String(out.ui.text);
		}
	}
	throw new Error("ComfyUIの出力からテキストを取得できませんでした。");
}

/**
 * <think>...</think> タグを除去してGenerateされた回答のみを返す
 */
function stripThinkingTags(text) {
	// </think> がある場合、その後のテキストだけを取得
	const thinkEnd = text.lastIndexOf("</think>");
	if (thinkEnd !== -1) {
		return text.substring(thinkEnd + 8).trim();
	}
	// <think> のみで閉じてない場合は全て思考なので空
	if (text.includes("<think>")) {
		return "";
	}
	// Thinking Process: で始まる場合も除去
	let result = text.replace(/Thinking Process:[\s\S]*$/g, "");
	return result.trim();
}

/**
 * 会話履歴をテキスト形式にフォーマットする
 */
function formatHistory(history) {
	if (history.length === 0) return "";
	let text = "これまでの会話:";
	for (const msg of history) {
		if (msg.role === "user") {
			text += `\nユーザー: ${msg.content}`;
		} else if (msg.role === "assistant") {
			text += `\nアシスタント: ${msg.content}`;
		}
	}
	return text;
}

/**
 * Qwen (ComfyUI) でAI応答を生成する（ユーザーごとに直近5往復の会話履歴を保持）
 */
/**
 * 起動時にダミーリクエストを送ってCUDA graphウォームアップを済ませる
 */
export async function warmupQwen() {
	try {
		console.log("Qwen3.5 4B のウォームアップ中...");
		const workflow = buildWorkflow("hi", "");
		const promptId = await queuePrompt(workflow);
		await pollHistory(promptId);
		console.log("Qwen3.5 4B ウォームアップ完了!");
	} catch (error) {
		console.warn("Qwen3.5 4B ウォームアップ失敗 (ComfyUIが起動していない可能性):", error.message);
	}
}

export async function generateQwenResponse(question, userId) {
	// ユーザーの会話履歴を取得（なければ初期化）
	if (!chatHistories.has(userId)) {
		chatHistories.set(userId, []);
	}
	const history = chatHistories.get(userId);
	const historyText = formatHistory(history);

	const workflow = buildWorkflow(question, historyText);

	activeRequests++;
	try {
		const promptId = await queuePrompt(workflow);
		console.log(`ComfyUI queued: ${promptId}`);

		const entry = await pollHistory(promptId);
		const rawText = extractText(entry);
		let responseText = stripThinkingTags(rawText);
		// Discord表示用に1024文字で切る
		if (responseText.length > 1024) {
			responseText = responseText.substring(0, 1021) + "...";
		}

		// 会話履歴に追加（直近MAX_HISTORY往復まで保持）
		history.push(
			{ role: "user", content: question },
			{ role: "assistant", content: responseText }
		);
		// 古い履歴を削除（1往復 = 2メッセージ）
		while (history.length > MAX_HISTORY * 2) {
			history.splice(0, 2);
		}

		console.log(`Qwen response for ${userId}: "${String(responseText).substring(0, 80)}..."`);
		return responseText;
	} catch (error) {
		if (error.code === "ECONNREFUSED") {
			throw new Error("ComfyUI が起動していません。");
		}
		throw error;
	} finally {
		activeRequests--;
	}
}
