# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord bot combining VOICEVOX TTS, Google Gemini AI, and local LLM (KoboldAI/Qwen) for voice channel audio playback. All documentation and user-facing text is in Japanese.

## Commands

```bash
npm start          # Run bot (node src/index.js)
npm run deploy     # Register slash commands only
```

## Architecture

ES modules (`"type": "module"`), Node.js 22 LTS, discord.js v14.

```
src/index.js              # Entry point, interaction router, per-user queue
src/deploy-commands.js    # Slash command registration (guild or global)
src/commands/
  vv.js                   # /vv  - Text-to-speech
  vvai.js                 # /vvai - Gemini AI + TTS (with optional Google search)
  vvaiq.js                # /vvaiq - Local AI (KoboldAI) + TTS
  lvv.js                  # /lvv - Leave voice channel
src/services/
  voicevox.js             # VOICEVOX API (audio_query → synthesis → WAV → AudioResource)
  voice.js                # Voice channel connect/disconnect/timeout
  ai.js                   # Google Gemini (gemini-2.5-flash), per-user chat history
  local-ai.js             # KoboldAI OpenAI-compatible API, per-user history
```

### Key Patterns

- **deferReply workaround**: `deferReply()` consistently fails with 40060 on this environment. All commands skip `deferReply` and set `interaction.deferred = true` manually, then use `editReply()`.
- **Per-user queue**: `interactionQueue` Set in index.js prevents concurrent commands from the same user.
- **Speaker cache**: VOICEVOX speakers are fetched once on bot ready and reused for command choices.
- **Auto-disconnect**: Voice connections auto-destroy after 10 minutes (TIMEOUT constant).
- **Temp file cleanup**: WAV files are deleted in `AudioPlayerStatus.Idle` handler.

## Environment Variables

See `.env.example`. Required: `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, `GOOGLE_API_KEY`, `VOICEVOX_URL`.
Optional: `DISCORD_GUILD_ID` (guild commands, instant), `KOBOLD_URL` (for /vvaiq).

## Remote Development (TUF PC)

The bot runs on a local ASUS TUF Gaming F15 (192.168.11.27) accessible via SSH.

```bash
# SSH into TUF PC
ssh waros@192.168.11.27

# Workflow: edit locally → push → pull on TUF → restart
git push
ssh waros@192.168.11.27 'cd C:\Users\waros\Documents\Develop\discordbot-voicevox2 && git pull'

# Kill and restart bot on TUF PC
ssh waros@192.168.11.27 'taskkill /F /IM node.exe'
# Then start from TUF PC console: node src/index.js

# Check running processes
ssh waros@192.168.11.27 'tasklist /FI "IMAGENAME eq node.exe" 2>NUL'
```

**Important**: Only ONE bot process may run at a time. Multiple processes cause `40060: Interaction has already been acknowledged` errors. Always verify with `tasklist` before starting.

### TUF PC Services

- **VOICEVOX Engine**: `http://localhost:50021` — must be running before bot starts
- **KoboldAI** (optional): `http://localhost:5001` — for /vvaiq command
- **FFmpeg**: Must be installed and in PATH for audio playback
- **Node.js**: v22 LTS (installed via nvm-windows)
- **Project path**: `C:\Users\waros\Documents\Develop\discordbot-voicevox2`

### SSH Notes

- Windows SSH uses CMD by default — use double quotes, not single quotes for Windows commands
- `winget` does not work over SSH — install software directly on TUF PC
- New terminal required after PATH changes (e.g., after installing FFmpeg)
- `git safe.directory` may need to be configured on TUF PC

## Dependencies

- **@discordjs/voice ^0.19.1** — must be 0.18+ for new Discord encryption modes (old modes deprecated late 2024)
- **opusscript** — pure JS Opus encoder (no native build required, unlike @discordjs/opus)
- **libsodium-wrappers** — encryption for voice
- **prism-media** — FFmpeg bridge for audio processing
