// Integration smoke test for the current REST server.
// Boots tools/server.js on a throwaway port and exercises the public surface.
// (Replaced by the full Jest unit/integration/acceptance suite when the
//  TypeScript core/ lands in PR2.)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4199;
const BASE = `http://127.0.0.1:${PORT}`;

let server;

async function waitForReady(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/applications`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not become ready in time');
}

before(async () => {
  server = spawn('node', ['tools/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await waitForReady();
});

after(() => {
  if (server) server.kill('SIGTERM');
});

test('GET / serves the launcher page', async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /<!DOCTYPE html>/i);
});

test('GET /api/applications returns a JSON array', async () => {
  const res = await fetch(`${BASE}/api/applications`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.ok(Array.isArray(await res.json()));
});

test('GET /api/history returns a JSON array', async () => {
  const res = await fetch(`${BASE}/api/history`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(await res.json()));
});

test('POST /api/applications without firma is rejected with 400', async () => {
  const res = await fetch(`${BASE}/api/applications`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stelle: 'no company given' }),
  });
  assert.equal(res.status, 400);
});

test('unknown API endpoint returns 404 JSON', async () => {
  const res = await fetch(`${BASE}/api/does-not-exist`);
  assert.equal(res.status, 404);
});
