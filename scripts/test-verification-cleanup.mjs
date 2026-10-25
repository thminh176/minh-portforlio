import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { closeBrowserBounded, closeBrowserContextsBounded } from './verification-helpers.mjs';

// Observe real deadline handles, including cancellation after early settlement.
function trackTimers(t) {
  const active = new Set();
  const set = globalThis.setTimeout;
  const clear = globalThis.clearTimeout;
  t.mock.method(globalThis, 'setTimeout', (...args) => {
    const handle = set(...args);
    active.add(handle);
    return handle;
  });
  t.mock.method(globalThis, 'clearTimeout', (handle) => {
    active.delete(handle);
    return clear(handle);
  });
  return active;
}

for (const [name, close, resource] of [
  ['browser', closeBrowserBounded, (action) => ({ close: action })],
  ['contexts', closeBrowserContextsBounded, (action) => ({ contexts: () => [{ close: action }] })],
]) {
  test(`${name}: awaits successful disposal and cancels deadline`, async (t) => {
    const timers = trackTimers(t);
    let disposed = false;
    await close(resource(async () => { await delay(10); disposed = true; }), 200);
    assert.equal(disposed, true);
    assert.equal(timers.size, 0);
  });

  test(`${name}: hung disposal rejects at explicit short deadline`, async (t) => {
    const timers = trackTimers(t);
    const started = performance.now();
    await assert.rejects(close(resource(() => new Promise(() => {})), 25), /timed out after 25ms/);
    assert.ok(performance.now() - started >= 20);
    assert.equal(timers.size, 0);
  });

  test(`${name}: late successful disposal remains a timeout failure`, async (t) => {
    const timers = trackTimers(t);
    let finish;
    const pending = close(resource(() => new Promise((resolve) => { finish = resolve; })), 25);
    await assert.rejects(pending, /timed out after 25ms/);
    finish();
    await assert.rejects(pending, /timed out after 25ms/);
    assert.equal(timers.size, 0);
  });

  test(`${name}: preserves close error identity and cancels deadline`, async (t) => {
    const timers = trackTimers(t);
    const failure = new Error(`${name} disposal failed`);
    await assert.rejects(close(resource(async () => { throw failure; }), 200), (error) => error === failure);
    assert.equal(timers.size, 0);
  });

  test(`${name}: absent browser is a no-op without a timer`, async (t) => {
    const timers = trackTimers(t);
    await close(null, 25);
    assert.equal(timers.size, 0);
  });
}

test('contexts: awaits every owned context, not only the first', async () => {
  const completed = [];
  await closeBrowserContextsBounded({ contexts: () => [10, 30].map((ms) => ({
    close: async () => { await delay(ms); completed.push(ms); },
  })) }, 200);
  assert.deepEqual(completed, [10, 30]);
});

// Exercise the verifier's actual catch/finally with controlled resources. Read
// that block from production so the fixture cannot drift into a mirror of it.
const source = fs.readFileSync(new URL('./verify-browser.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('\n  } catch (error) {\n    primaryError = error;');
const end = source.indexOf('\n}\n\nrunBrowserVerification()');
assert.ok(start > 0 && end > start, 'verifier lifecycle block must be identifiable');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runLifecycle = new AsyncFunction('browser', 'staticServer', 'evidenceDir', 'failure', 'fs', 'path', 'closeBrowserContextsBounded', 'closeBrowserBounded', 'console',
  `let primaryError = null; try { if (failure) throw failure; ${source.slice(start, end)}`);

for (const primaryFails of [false, true]) {
  test(`verifier: ${primaryFails ? 'primary assertion survives' : 'cleanup alone fails'} with all cleanup errors recorded`, async () => {
    const evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'verification-cleanup-'));
    const primary = new Error('original assertion finding');
    const closed = [];
    const contextFailure = new Error('context failure');
    const browserFailure = new Error('browser failure');
    const serverFailure = new Error('server failure');
    const browser = {
      contexts: () => [{ pages: () => [], close: async () => { closed.push('context'); throw contextFailure; } }],
      close: async () => { closed.push('browser'); throw browserFailure; },
      isConnected: () => false,
    };
    const server = { closeBounded: async () => { closed.push('server'); throw serverFailure; } };
    try {
      await assert.rejects(runLifecycle(browser, server, evidence, primaryFails ? primary : null, fs, path, closeBrowserContextsBounded, closeBrowserBounded, { log() {}, error() {} }), (error) => {
        if (primaryFails) return error === primary;
        assert.ok(error instanceof AggregateError);
        assert.deepEqual(error.errors, [contextFailure, browserFailure, serverFailure]);
        return true;
      });
      assert.deepEqual(closed, ['context', 'browser', 'server']);
      const report = JSON.parse(fs.readFileSync(path.join(evidence, 'cleanup-report.json')));
      assert.deepEqual(report.steps.map((step) => step.error.message), ['context failure', 'browser failure', 'server failure']);
      assert.equal(report.primaryError?.message ?? null, primaryFails ? primary.message : null);
      if (primaryFails) assert.equal(JSON.parse(fs.readFileSync(path.join(evidence, 'failure.json'))).message, primary.message);
    } finally {
      fs.rmSync(evidence, { recursive: true });
    }
  });
}
