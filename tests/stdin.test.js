import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readStdin, isContextInitialized } from '../dist/stdin.js';

test('readStdin returns null for TTY input', async () => {
  const originalIsTTY = process.stdin.isTTY;
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

  try {
    const result = await readStdin();
    assert.equal(result, null);
  } finally {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
  }
});

test('readStdin returns null on stream errors', async () => {
  const originalIsTTY = process.stdin.isTTY;
  const originalSetEncoding = process.stdin.setEncoding;
  Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
  process.stdin.setEncoding = () => {
    throw new Error('boom');
  };

  try {
    const result = await readStdin();
    assert.equal(result, null);
  } finally {
    process.stdin.setEncoding = originalSetEncoding;
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
  }
});

function createPipe() {
  const stream = new PassThrough();
  Object.defineProperty(stream, 'isTTY', { value: false, configurable: true });
  return stream;
}

test('readStdin parses valid JSON without waiting for EOF', async () => {
  const stream = createPipe();
  const resultPromise = readStdin(stream, { firstByteTimeoutMs: 20, idleTimeoutMs: 10 });

  stream.write('{"cwd":"/tmp/project","model":{"display_name":"Opus"}}');

  const result = await resultPromise;
  assert.deepEqual(result, {
    cwd: '/tmp/project',
    model: { display_name: 'Opus' },
  });
});

test('readStdin parses JSON split across multiple chunks', async () => {
  const stream = createPipe();
  const resultPromise = readStdin(stream, { firstByteTimeoutMs: 20, idleTimeoutMs: 10 });

  stream.write('{"cwd":"/tmp/project",');
  stream.write('"model":{"display_name":"Opus"}}');

  const result = await resultPromise;
  assert.deepEqual(result, {
    cwd: '/tmp/project',
    model: { display_name: 'Opus' },
  });
});

test('readStdin returns null when a non-TTY stream never produces data', async () => {
  const stream = createPipe();
  const result = await readStdin(stream, { firstByteTimeoutMs: 10, idleTimeoutMs: 5 });
  assert.equal(result, null);
});

test('readStdin returns null when partial JSON goes idle', async () => {
  const stream = createPipe();
  const resultPromise = readStdin(stream, { firstByteTimeoutMs: 20, idleTimeoutMs: 10 });

  stream.write('{"cwd":"/tmp/project"');

  const result = await resultPromise;
  assert.equal(result, null);
});

test('readStdin returns null when stdin payload exceeds the safety limit', async () => {
  const stream = createPipe();
  const resultPromise = readStdin(stream, {
    firstByteTimeoutMs: 20,
    idleTimeoutMs: 10,
    maxBytes: 16,
  });

  stream.write('{"cwd":"/tmp/project"}');

  const result = await resultPromise;
  assert.equal(result, null);
});

// isContextInitialized tests
test('isContextInitialized returns false when context_window is absent', () => {
  assert.equal(isContextInitialized({}), false);
});

test('isContextInitialized returns false on cold start (current_usage null, no used_percentage)', () => {
  assert.equal(isContextInitialized({
    context_window: { context_window_size: 200000, current_usage: null },
  }), false);
});

test('isContextInitialized returns false when used_percentage is 0 and current_usage is null', () => {
  assert.equal(isContextInitialized({
    context_window: { context_window_size: 200000, current_usage: null, used_percentage: 0 },
  }), false);
});

test('isContextInitialized returns true when used_percentage is non-zero', () => {
  assert.equal(isContextInitialized({
    context_window: { context_window_size: 200000, current_usage: null, used_percentage: 5 },
  }), true);
});

test('isContextInitialized returns true when current_usage is non-null', () => {
  assert.equal(isContextInitialized({
    context_window: {
      context_window_size: 200000,
      current_usage: { input_tokens: 10000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    },
  }), true);
});
