#!/usr/bin/env node

/**
 * Ensure the sibling `garden-core` workspace is available.
 * CI runners only clone this repo, so we fetch garden-core on demand.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoUrl = process.env.GARDEN_CORE_GIT_URL ?? 'https://github.com/GratiaOS/garden-core.git';
const gardenPath = path.resolve(process.cwd(), '..', 'garden-core');

if (existsSync(gardenPath)) {
  process.exit(0);
}

console.log(`[ensure-garden-core] Cloning ${repoUrl} to ${gardenPath}`);
const result = spawnSync('git', ['clone', '--depth', '1', repoUrl, gardenPath], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('[ensure-garden-core] Failed to clone garden-core repository.');
  console.error('Set GARDEN_CORE_GIT_URL if you need a different remote or provide the repo manually.');
  process.exit(result.status ?? 1);
}
