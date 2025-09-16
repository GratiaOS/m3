#!/usr/bin/env node
import { readFileSync } from "node:fs";

const file = process.argv[2];
const msg = readFileSync(file, "utf8");

// Must contain a line starting with the wind emoji + ' whisper: "..."'
const hasWhisper = /^🌬️?\s*whisper:\s*“.*”|^🌬️?\s*whisper:\s*".*"/mi.test(msg);
// For safety, also allow plain colon without fancy quotes:
const hasWhisperPlain = /^🌬️?\s*whisper:\s*.+$/mi.test(msg);

if (!(hasWhisper || hasWhisperPlain)) {
  console.error(
    [
      "❌ Commit rejected: missing whisper line.",
      "Each commit must include a line like:",
      '  🌬️ whisper: “your short poetic intention.”',
      "",
      "Open CONTRIBUTING.md → “Mandatory Whisper” for details.",
    ].join("\n")
  );
  process.exit(1);
}

process.exit(0);