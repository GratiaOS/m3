// Lightweight unit tests for parseSpeaker without adding a full test framework.
// Run with: pnpm exec tsx src/utils/town.spec.ts

import { parseSpeaker } from './town';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function assertEq(actual: any, expected: any, label: string) {
  assert(actual === expected, `${label} expected=${expected} actual=${actual}`);
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

// Cases

test('empty raw yields unknown/—', () => {
  const s = parseSpeaker(undefined);
  assertEq(s.species, 'unknown', 'species');
  assertEq(s.name, '—', 'name');
});

test('simple name no colon', () => {
  const s = parseSpeaker('Raz');
  assertEq(s.species, 'unknown', 'species');
  assertEq(s.name, 'Raz', 'name');
});

test('prefix:name basic parsing', () => {
  const s = parseSpeaker('bot:Guide');
  assertEq(s.species, 'bot', 'species');
  assertEq(s.name, 'Guide', 'name');
});

test('multiple colons keeps remainder', () => {
  const s = parseSpeaker('human:Raz:extra:bits');
  assertEq(s.species, 'human', 'species');
  assertEq(s.name, 'Raz:extra:bits', 'name remainder');
});

test('leading colon', () => {
  const s = parseSpeaker(':nameless');
  assertEq(s.species, 'unknown', 'species');
  assertEq(s.name, 'nameless', 'name');
});

test('trailing colon', () => {
  const s = parseSpeaker('bot:');
  assertEq(s.species, 'bot', 'species');
  assertEq(s.name, '—', 'default name when empty');
});

test('whitespace trimmed', () => {
  const s = parseSpeaker('  bot:  Sage  ');
  assertEq(s.species, 'bot', 'species');
  assertEq(s.name, 'Sage', 'trimmed name');
});

console.log('\nAll parseSpeaker tests passed.');
