#!/usr/bin/env tsx
/// <reference types="node" />
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

function kebab(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const [, , titleArg, ...rest] = process.argv;
if (!titleArg) {
  console.error('Usage: pnpm mark "Your Title" [whisper...]');
  process.exit(1);
}

const title = titleArg.trim();
const whisper = rest.join(' ').trim() || 'less friction, more flow — unity remembered.';

const dir = 'docs/marks';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const file = join(dir, `${kebab(title)}.md`);
const now = new Date().toISOString().slice(0, 10);

const content = `# mark: ${title}

date: ${now}

${title.toLowerCase()} — opened.

🌬 whisper: “${whisper}”

the garden remembers.
`;

writeFileSync(file, content, 'utf8');
console.log(`✨ Created ${file}`);
