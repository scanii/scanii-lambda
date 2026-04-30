/**
 * Integration tests for lib/client.js — the retry wrapper around @scanii/core.
 *
 * Requires a running scanii-cli instance:
 *
 *   docker run -d --name scanii-cli -p 4000:4000 ghcr.io/scanii/scanii-cli:latest server
 *
 * In CI, scanii-cli is started via scanii/setup-cli-action@v1.
 * Tests skip gracefully when scanii-cli is not reachable.
 */

'use strict';

const assert = require('assert');
const { ScaniiClient } = require('../lib/client');

const ENDPOINT = process.env.SCANII_TEST_ENDPOINT ?? 'http://localhost:4000';
const KEY = 'key';
const SECRET = 'secret';

async function isScaniiCliRunning() {
  try {
    const res = await fetch(`${ENDPOINT}/v2.2/ping`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${KEY}:${SECRET}`).toString('base64') },
    });
    return res.ok;
  } catch {
    return false;
  }
}

let scaniiCliAvailable = false;

before(async function () {
  scaniiCliAvailable = await isScaniiCliRunning();
  if (!scaniiCliAvailable) {
    console.warn(`[integration] scanii-cli not reachable at ${ENDPOINT} — all integration tests will be skipped`);
  }
});

function itIfCli(name, fn) {
  it(name, async function () {
    if (!scaniiCliAvailable) {
      this.skip();
    }
    await fn.call(this);
  });
}

function client() {
  return new ScaniiClient(KEY, SECRET, ENDPOINT, 3, 0);
}

describe('integration: client wrapper against scanii-cli', () => {
  itIfCli('fetch returns a pending result with id and resourceLocation', async function () {
    const result = await client().fetch('https://example.com/', {});
    assert.ok(result.id, 'expected id in pending result');
    assert.ok(result.resourceLocation, 'expected resourceLocation in pending result');
  });

  itIfCli('fetch passes metadata through', async function () {
    const result = await client().fetch('https://example.com/', { source: 'lambda-integration-test' });
    assert.ok(result.id, 'expected id in pending result');
  });

  itIfCli('retrieve of a previously fetched id returns a completed result', async function () {
    const pending = await client().fetch('https://example.com/', {});
    await new Promise(r => setTimeout(r, 500));
    const result = await client().retrieve(pending.id);
    assert.strictEqual(result.id, pending.id);
    assert.ok(Array.isArray(result.findings), 'expected findings array');
  });

  itIfCli('retrieve of unknown id throws', async function () {
    await assert.rejects(
      () => client().retrieve('does-not-exist-' + Date.now()),
      (e) => {
        assert.ok(e.message, 'expected error message');
        return true;
      }
    );
  });
});
