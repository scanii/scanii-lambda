const assert = require('assert');
const it = require("mocha").it;
const describe = require("mocha").describe;
const beforeEach = require("mocha").beforeEach;
const utils = require('../lib/utils');
const {CONFIG} = require("../lib/config");

describe('Util tests', () => {

  beforeEach(() => {
  });

  it('should throw error if config secret is not set', async () => {
    CONFIG.SECRET = false;
    const result = {
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": [],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": "abc",
        "bucket": "test-bucket",
        "key": "test-key"
      }
    };
    try {
      const signature = utils.generateSignature(result.metadata.bucket, result.metadata.key);
      assert.ok(result.metadata.signature === signature);
    } catch (error) {
      assert(error.code === 'ERR_ASSERTION')
    }
  });


  it('should format tag value #1', async () => {
    const value = utils.formatTagValue(['content.malicious.porcupine-malware-36555-unofficial', 'content.malicious.trojan-agent-bwqq'
    ]);

    assert.deepStrictEqual(value, "content.malicious.porcupine-malware-36555-unofficial content.malicious.trojan-agent-bwqq");
  });
});
