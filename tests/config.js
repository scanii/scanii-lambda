const assert = require('assert');
const it = require("mocha").it;
const describe = require("mocha").describe;
const beforeEach = require("mocha").beforeEach;
const afterEach = require("mocha").afterEach;
const CONFIG = require('../lib/config').CONFIG;
const actions = require('../lib/actions');
const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, DeleteObjectCommand, PutObjectTaggingCommand, GetObjectTaggingCommand } = require('@aws-sdk/client-s3');

const s3Mock = mockClient(S3Client);

describe('Config tests', () => {

  let deleteCounter = 0;
  let tagCounter = 0;
  const result = {
    "id": "2e4612793298b1d691202e75dc125f6e",
    "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
    "content_length": "1251174",
    "findings": ["finding1"],
    "creation_date": "2016-01-24T15:05:53.260Z",
    "content_type": "image/jpeg",
    "metadata": {
      "signature": "abc",
      "bucket": "test-bucket",
      "key": "test-key"
    }
  };

  beforeEach(() => {
    // resetting
    deleteCounter = tagCounter = 0;
    s3Mock.reset();

    s3Mock.on(DeleteObjectCommand).callsFake(async () => {
      deleteCounter++;
      return {};
    });

    s3Mock.on(PutObjectTaggingCommand).callsFake(async () => {
      tagCounter++;
      return {};
    });

    s3Mock.on(GetObjectTaggingCommand).resolves({
      TagSet: []
    });
  });

  afterEach(function () {
    s3Mock.reset();
  });

  it("if all actions are disabled, no action should be taken", async () => {
    CONFIG.ACTION_DELETE_OBJECT = false;
    CONFIG.ACTION_TAG_OBJECT = false;

    await actions.onFindings("bucket1", "key1", result);
    assert.strictEqual(0, deleteCounter);
    assert.strictEqual(0, tagCounter);
  });
  it("if a single action is enabled, a single action should be taken", async () => {
    CONFIG.ACTION_DELETE_OBJECT = true;
    CONFIG.ACTION_TAG_OBJECT = false;

    await actions.onFindings("bucket1", "key1", result);
    assert.strictEqual(1, deleteCounter);
    assert.strictEqual(0, tagCounter);
  });
  it("if a single action is enabled, a single action should be taken - 2", async () => {
    CONFIG.ACTION_DELETE_OBJECT = false;
    CONFIG.ACTION_TAG_OBJECT = true;

    await actions.onFindings("bucket1", "key1", result);
    assert.strictEqual(0, deleteCounter);
    assert.strictEqual(1, tagCounter);
  });
  it("if 2 actions are enabled then 2 actions should be taken", async () => {
    CONFIG.ACTION_DELETE_OBJECT = true;
    CONFIG.ACTION_TAG_OBJECT = true;

    await actions.onFindings("bucket1", "key1", result);
    assert.strictEqual(1, deleteCounter);
    assert.strictEqual(1, tagCounter);
  });
});
