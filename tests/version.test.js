import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderVersionLine } from '../dist/render/lines/version.js';
import { getClaudeCodeVersion, _resetVersionCache } from '../dist/version.js';
import { DEFAULT_CONFIG } from '../dist/config.js';

function makeCtx(overrides = {}) {
  return {
    stdin: {},
    transcript: { tools: [], agents: [], todos: [] },
    claudeMdCount: 0,
    rulesCount: 0,
    mcpCount: 0,
    hooksCount: 0,
    sessionDuration: '',
    gitStatus: null,
    usageData: null,
    config: DEFAULT_CONFIG,
    extraLabel: null,
    ...overrides,
  };
}

// renderVersionLine tests

test('renderVersionLine returns null when showClaudeCodeVersion is false', () => {
  const ctx = makeCtx({
    config: { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showClaudeCodeVersion: false } },
    claudeCodeVersion: '2.1.77',
  });
  assert.equal(renderVersionLine(ctx), null);
});

test('renderVersionLine returns null when showClaudeCodeVersion is true but version is missing', () => {
  const ctx = makeCtx({
    config: { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showClaudeCodeVersion: true } },
    claudeCodeVersion: undefined,
  });
  assert.equal(renderVersionLine(ctx), null);
});

test('renderVersionLine renders version string when enabled and version is present', () => {
  const ctx = makeCtx({
    config: { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, showClaudeCodeVersion: true } },
    claudeCodeVersion: '2.1.77',
  });
  const result = renderVersionLine(ctx);
  assert.ok(result !== null, 'expected a non-null result');
  assert.ok(result.includes('2.1.77'), `expected version in output, got: ${result}`);
});

// getClaudeCodeVersion tests

test('getClaudeCodeVersion returns undefined when claude binary is not found', async () => {
  _resetVersionCache();
  const original = process.env.PATH;
  process.env.PATH = '';
  try {
    const version = await getClaudeCodeVersion();
    assert.equal(version, undefined);
  } finally {
    process.env.PATH = original;
    _resetVersionCache();
  }
});

test('getClaudeCodeVersion returns cached value on second call', async () => {
  _resetVersionCache();
  const original = process.env.PATH;
  process.env.PATH = '';
  try {
    await getClaudeCodeVersion();             // first call — populates cache (undefined)
    process.env.PATH = original;             // restore PATH
    const second = await getClaudeCodeVersion(); // second call — must use cache, not shell out
    assert.equal(second, undefined);         // cached value from first (failed) call
  } finally {
    process.env.PATH = original;
    _resetVersionCache();
  }
});
