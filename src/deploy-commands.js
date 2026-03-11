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

	// /vv 系コマンドのオプションを構築するヘルパー
	function buildVVOptions(builder, { withCustomSpeaker = false } = {}) {
		builder.addStringOption((o) =>
			o.setName("text").setDescription("読み上げる文章").setRequired(true)
		);
		addCommonOptions(builder, { withCustomSpeaker });
		builder
			.addNumberOption((o) =>
				o.setName("speed").setDescription("話速（0.5~2.0）").setMinValue(0.5).setMaxValue(2.0)
			)
			.addNumberOption((o) =>
				o.setName("pitch").setDescription("音高（-0.15~0.15）").setMinValue(-0.15).setMaxValue(0.15)
			)
			.addNumberOption((o) =>
				o.setName("intonation").setDescription("抑揚（0~2.0）").setMinValue(0).setMaxValue(2.0)
			)
			.addNumberOption((o) =>
				o.setName("volume").setDescription("音量（0~2.0）").setMinValue(0).setMaxValue(2.0)
			);
		return builder;
	}

	// /vvai 系コマンドのオプションを構築するヘルパー
	function buildVVAIOptions(builder, { withSearch = false } = {}) {
		builder.addStringOption((o) =>
			o.setName("question").setDescription("AIへの質問").setRequired(true)
		);
		addCommonOptions(builder);
		if (withSearch) {
			builder.addBooleanOption((o) =>
				o.setName("search").setDescription("Google検索を使用するか")
			);
		}
		return builder;
	}

	// 共通オプション（speaker, channelid）
	function addCommonOptions(builder, { withCustomSpeaker = false } = {}) {
		builder.addStringOption((o) => {
			o.setName("speaker").setDescription("VOICEVOXの話者");
			if (speakerChoices.length > 0) {
				const choices = withCustomSpeaker
					? [{ name: "カスタム", value: "custom" }, ...speakerChoices]
					: speakerChoices;
				o.addChoices(...choices);
			}
			return o;
		});
		if (withCustomSpeaker) {
			builder.addStringOption((o) =>
				o.setName("custom_speaker").setDescription("カスタム話者名（speakerで「カスタム」選択時）")
			);
		}
		builder.addStringOption((o) =>
			o.setName("channelid").setDescription("ボイスチャンネルのID（省略可能）")
		);
		return builder;
	}

	const commands = [
		// /vv - テキスト読み上げ（公開）
		buildVVOptions(
			new SlashCommandBuilder().setName("vv").setDescription("文章を読み上げます"),
			{ withCustomSpeaker: true }
		),
		// /vvs - テキスト読み上げ（自分のみ表示）
		buildVVOptions(
			new SlashCommandBuilder().setName("vvs").setDescription("文章を読み上げます（自分のみ表示）"),
			{ withCustomSpeaker: true }
		),

		// /vvai - AI質問 + 読み上げ（公開）
		buildVVAIOptions(
			new SlashCommandBuilder().setName("vvai").setDescription("AIに質問し、VOICEVOXで読み上げます"),
			{ withSearch: true }
		),
		// /vvais - AI質問 + 読み上げ（自分のみ表示）
		buildVVAIOptions(
			new SlashCommandBuilder().setName("vvais").setDescription("AIに質問し、VOICEVOXで読み上げます（自分のみ表示）"),
			{ withSearch: true }
		),

		// /vvaiq - ローカルAI質問 + 読み上げ（公開）
		buildVVAIOptions(
			new SlashCommandBuilder().setName("vvaiq").setDescription("ローカルAIに質問し、VOICEVOXで読み上げます"),
		),
		// /vvaiqs - ローカルAI質問 + 読み上げ（自分のみ表示）
		buildVVAIOptions(
			new SlashCommandBuilder().setName("vvaiqs").setDescription("ローカルAIに質問し、VOICEVOXで読み上げます（自分のみ表示）"),
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
			console.log(`Registering guild commands for ${guildId}...`);
			await rest.put(
				Routes.applicationGuildCommands(appId, guildId),
				{ body: commands }
			);
		} else {
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
