const assert = require('assert')
const nock = require('nock')
const scanii = require("../lib/client");

describe('client tests', () => {
  afterEach(function () {
    nock.cleanAll();
  });

  it('should retry failed fetch requests', async function () {
    nock('https://api-us1.scanii.com')
      .post('/v2.2/files/fetch')
      .reply(555);

    const client = new scanii.ScaniiClient('foo', 'bar', "https://api-us1.scanii.com", 2)
    try {
      await client.fetch('https://acme.com', {}, 'https://acme.com/callback');
    } catch (e) {
      assert.ok(e.attempts === 2)
    }
    return Promise.resolve()
  });

  it('should retry failed retrieve requests', async function () {
    nock('https://api-us1.scanii.com')
      .get('/v2.2/files/123')
      .reply(555);

    const client = new scanii.ScaniiClient('foo', 'bar', "https://api-us1.scanii.com", 2)
    try {
      await client.retrieve('123');
    } catch (e) {
      assert.ok(e.attempts === 2)
    }
    return Promise.resolve()
  });

})
