#!/usr/bin/env node
import { readFileSync } from "node:fs";

const file = process.argv[2];
const msg = readFileSync(file, "utf8");

// Check if commit is from a bot (Dependabot, copilot-swe-agent, etc.)
// Bots are identified by [bot] in the author email or specific bot patterns
const authorEmail = process.argv[3] || "";
const isBotCommit = 
  authorEmail.includes("dependabot[bot]@") ||
  authorEmail.includes("github-actions[bot]@") ||
  authorEmail.includes("copilot-swe-agent[bot]@") ||
  authorEmail.includes("Copilot@users.noreply.github.com") ||
  msg.includes("Co-authored-by: dependabot[bot]") ||
  msg.includes("Signed-off-by: dependabot[bot]");

if (isBotCommit) {
  console.log("ℹ️  Skipping whisper check for bot commit");
  process.exit(0);
}

// Must contain a line starting with the wind emoji + ' whisper: "..."'
const hasWhisper = /^🌬️?\s*whisper:\s*".*"|^🌬️?\s*whisper:\s*".*"/mi.test(msg);
// For safety, also allow plain colon without fancy quotes:
const hasWhisperPlain = /^🌬️?\s*whisper:\s*.+$/mi.test(msg);

if (!(hasWhisper || hasWhisperPlain)) {
  console.error(
    [
      "❌ Commit rejected: missing whisper line.",
      "Each commit must include a line like:",
      '  🌬️ whisper: "your short poetic intention."',
      "",
      'Open CONTRIBUTING.md → "Mandatory Whisper" for details.',
    ].join("\n")
  );
  process.exit(1);
}

process.exit(0);
