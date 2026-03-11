import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

export async function deployCommands(speakers = []) {
	const normalSpeakers = speakers
		.filter((s) => s.name.includes("ノーマル"))
		.slice(0, 24);

	const speakerChoices = normalSpeakers.map((s) => ({
		name: s.name,
		value: s.name,
	}));

	const commands = [
		// /vv - テキスト読み上げ
		new SlashCommandBuilder()
			.setName("vv")
			.setDescription("指定したボイスチャンネルで文章を読み上げます")
			.addStringOption((o) =>
				o.setName("text").setDescription("読み上げる文章").setRequired(true)
			)
			.addStringOption((o) =>
				o
					.setName("channelid")
					.setDescription("ボイスチャンネルのID（省略可能）")
			)
			.addStringOption((o) => {
				o.setName("speaker").setDescription("VOICEVOXの話者");
				if (speakerChoices.length > 0) {
					o.addChoices(
						{ name: "カスタム", value: "custom" },
						...speakerChoices
					);
				}
				return o;
			})
			.addStringOption((o) =>
				o
					.setName("custom_speaker")
					.setDescription("カスタム話者名（speakerで「カスタム」選択時）")
			)
			.addNumberOption((o) =>
				o
					.setName("speed")
					.setDescription("話速（0.5~2.0）")
					.setMinValue(0.5)
					.setMaxValue(2.0)
			)
			.addNumberOption((o) =>
				o
					.setName("pitch")
					.setDescription("音高（-0.15~0.15）")
					.setMinValue(-0.15)
					.setMaxValue(0.15)
			)
			.addNumberOption((o) =>
				o
					.setName("intonation")
					.setDescription("抑揚（0~2.0）")
					.setMinValue(0)
					.setMaxValue(2.0)
			)
			.addNumberOption((o) =>
				o
					.setName("volume")
					.setDescription("音量（0~2.0）")
					.setMinValue(0)
					.setMaxValue(2.0)
			),

		// /vvai - AI質問 + 読み上げ
		new SlashCommandBuilder()
			.setName("vvai")
			.setDescription("AIに質問し、VOICEVOXの声で回答を読み上げます")
			.addStringOption((o) =>
				o.setName("question").setDescription("AIへの質問").setRequired(true)
			)
			.addStringOption((o) => {
				o.setName("speaker").setDescription("VOICEVOXの話者");
				if (speakerChoices.length > 0) {
					o.addChoices(...speakerChoices);
				}
				return o;
			})
			.addStringOption((o) =>
				o.setName("channelid").setDescription("ボイスチャンネルのID（省略可能）")
			)
			.addBooleanOption((o) =>
				o.setName("search").setDescription("Google検索を使用するか")
			),

		// /vvaiq - ローカルAI質問 + 読み上げ
		new SlashCommandBuilder()
			.setName("vvaiq")
			.setDescription("ローカルAI（Qwen）に質問し、VOICEVOXの声で回答を読み上げます")
			.addStringOption((o) =>
				o.setName("question").setDescription("AIへの質問").setRequired(true)
			)
			.addStringOption((o) => {
				o.setName("speaker").setDescription("VOICEVOXの話者");
				if (speakerChoices.length > 0) {
					o.addChoices(...speakerChoices);
				}
				return o;
			})
			.addStringOption((o) =>
				o.setName("channelid").setDescription("ボイスチャンネルのID（省略可能）")
			),

		// /lvv - 退出
		new SlashCommandBuilder()
			.setName("lvv")
			.setDescription("ボイスチャンネルから退出します"),
	].map((c) => c.toJSON());

	const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

	try {
		const appId = process.env.DISCORD_APPLICATION_ID;
		const guildId = process.env.DISCORD_GUILD_ID;

		if (guildId) {
			// ギルドコマンド（即反映、テスト用）
			console.log(`Registering guild commands for ${guildId}...`);
			await rest.put(
				Routes.applicationGuildCommands(appId, guildId),
				{ body: commands }
			);
		} else {
			// グローバルコマンド（全サーバー、反映に最大1時間）
			console.log("Registering global commands...");
			await rest.put(
				Routes.applicationCommands(appId),
				{ body: commands }
			);
		}
		console.log("Slash commands registered.");
	} catch (error) {
		console.error("Failed to register commands:", error);
	}
}

// CLIから直接実行された場合
if (process.argv[1]?.endsWith("deploy-commands.js")) {
	deployCommands();
}
