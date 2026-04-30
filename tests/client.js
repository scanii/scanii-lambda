const assert = require('assert')
const nock = require('nock')
const scanii = require("../lib/client");

const ENDPOINT = 'https://api-us1.scanii.com';

// Helpers for common nock replies
const okFetch = () =>
  nock(ENDPOINT)
    .post('/v2.2/files/fetch')
    .reply(202, '{"id":"abc123"}', { Location: `${ENDPOINT}/v2.2/files/abc123` });

const failFetch = () =>
  nock(ENDPOINT)
    .post('/v2.2/files/fetch')
    .reply(555, '{"error":"server error"}');

const okRetrieve = (id) =>
  nock(ENDPOINT)
    .get(`/v2.2/files/${id}`)
    .reply(200, `{"id":"${id}","findings":[]}`);

const failRetrieve = (id) =>
  nock(ENDPOINT)
    .get(`/v2.2/files/${id}`)
    .reply(555, '{"error":"server error"}');

describe('client tests', () => {
  afterEach(function () {
    nock.cleanAll();
  });

  describe('fetch retry', () => {
    it('succeeds on first attempt with no retry', async function () {
      okFetch();
      const client = new scanii.ScaniiClient('foo', 'bar', ENDPOINT, 3, 0);
      const result = await client.fetch('https://acme.com', {}, 'https://acme.com/callback');
      assert.strictEqual(result.id, 'abc123');
    });

    it('succeeds after one transient failure', async function () {
      failFetch();
      okFetch();
      const client = new scanii.ScaniiClient('foo', 'bar', ENDPOINT, 3, 0);
      const result = await client.fetch('https://acme.com', {}, 'https://acme.com/callback');
      assert.strictEqual(result.id, 'abc123');
    });

    it('throws ScaniiError after exhausting all attempts', async function () {
      failFetch();
      failFetch();
      const client = new scanii.ScaniiClient('foo', 'bar', ENDPOINT, 2, 0);
      await assert.rejects(
        () => client.fetch('https://acme.com', {}, 'https://acme.com/callback'),
        (e) => {
          assert.strictEqual(e.attempts, 2);
          assert.ok(e.message.includes('2 attempts'));
          return true;
        }
      );
    });

    it('respects maxAttempts across multiple failures', async function () {
      for (let i = 0; i < 5; i++) failFetch();
      const client = new scanii.ScaniiClient('foo', 'bar', ENDPOINT, 5, 0);
      await assert.rejects(
        () => client.fetch('https://acme.com', {}, 'https://acme.com/callback'),
        (e) => {
          assert.strictEqual(e.attempts, 5);
          return true;
        }
      );
    });
  });

  describe('retrieve retry', () => {
    it('succeeds on first attempt with no retry', async function () {
      okRetrieve('123');
      const client = new scanii.ScaniiClient('foo', 'bar', ENDPOINT, 3, 0);
      const result = await client.retrieve('123');
      assert.strictEqual(result.id, '123');
    });

    it('succeeds after one transient failure', async function () {
      failRetrieve('123');
      okRetrieve('123');
      const client = new scanii.ScaniiClient('foo', 'bar', ENDPOINT, 3, 0);
      const result = await client.retrieve('123');
      assert.strictEqual(result.id, '123');
    });

    it('throws ScaniiError after exhausting all attempts', async function () {
      failRetrieve('123');
      failRetrieve('123');
      const client = new scanii.ScaniiClient('foo', 'bar', ENDPOINT, 2, 0);
      await assert.rejects(
        () => client.retrieve('123'),
        (e) => {
          assert.strictEqual(e.attempts, 2);
          assert.ok(e.message.includes('2 attempts'));
          return true;
        }
      );
    });
  });
});
