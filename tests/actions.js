const assert = require('assert');
const it = require("mocha").it;
const describe = require("mocha").describe;
const beforeEach = require("mocha").beforeEach;
const afterEach = require("mocha").afterEach;
const actions = require('../lib/actions');
const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, GetObjectTaggingCommand, PutObjectTaggingCommand } = require('@aws-sdk/client-s3');

const s3Mock = mockClient(S3Client);

describe('Actions tests', () => {

  let putObjectTagCallCount = 0;
  beforeEach(() => {
    putObjectTagCallCount = 0;
    s3Mock.reset();
  });

  afterEach(function () {
    s3Mock.reset();
  });

  it('should add correct tags if findings', async () => {
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

    s3Mock.on(PutObjectTaggingCommand).callsFake(async (input) => {
      assert.ok(input.Bucket === result.metadata.bucket);
      assert.ok(input.Key === result.metadata.key);

      assert.ok(input.Tagging.TagSet[0].Key === "ScaniiFindings");
      assert.ok(input.Tagging.TagSet[0].Value === result.findings.join(' '));

      assert.ok(input.Tagging.TagSet[1].Key === "ScaniiId");
      assert.ok(input.Tagging.TagSet[1].Value === result.id);

      assert.ok(input.Tagging.TagSet[2].Key === "ScaniiContentType");
      assert.ok(input.Tagging.TagSet[2].Value === result.content_type);
      putObjectTagCallCount++;
      return {};
    });

    s3Mock.on(GetObjectTaggingCommand).resolves({
      TagSet: []
    });

    await actions.tagObject(result.metadata.bucket, result.metadata.key, result);
    assert(putObjectTagCallCount === 1);
  });

  it('should add correct tags if no findings', async () => {
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

    s3Mock.on(PutObjectTaggingCommand).callsFake(async (input) => {
      assert.ok(input.Bucket === result.metadata.bucket);
      assert.ok(input.Key === result.metadata.key);

      assert.ok(input.Tagging.TagSet[0].Key === "ScaniiFindings");
      assert.ok(input.Tagging.TagSet[0].Value === 'None');

      assert.ok(input.Tagging.TagSet[1].Key === "ScaniiId");
      assert.ok(input.Tagging.TagSet[1].Value === result.id);

      assert.ok(input.Tagging.TagSet[2].Key === "ScaniiContentType");
      assert.ok(input.Tagging.TagSet[2].Value === result.content_type);
      putObjectTagCallCount++;
      return {};
    });

    s3Mock.on(GetObjectTaggingCommand).resolves({
      TagSet: []
    });

    await actions.tagObject(result.metadata.bucket, result.metadata.key, result);
    assert(putObjectTagCallCount === 1);

  });
  it('should truncate tag values', async () => {
    const result = {
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": ["a".repeat(300)],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": "abc",
        "bucket": "test-bucket",
        "key": "test-key"
      }
    };

    s3Mock.on(PutObjectTaggingCommand).callsFake(async (input) => {
      assert.ok(input.Tagging.TagSet[0].Key === "ScaniiFindings");
      assert.ok(input.Tagging.TagSet[0].Value.length < 256);
      putObjectTagCallCount++;
      return {};
    });

    s3Mock.on(GetObjectTaggingCommand).resolves({
      TagSet: []
    });

    await actions.tagObject(result.metadata.bucket, result.metadata.key, result);
    assert(putObjectTagCallCount === 1);
  });

  it('should append not replace tags', async () => {

    s3Mock.on(PutObjectTaggingCommand).callsFake(async (input) => {
      assert.ok(input.Bucket === result.metadata.bucket);
      assert.ok(input.Key === result.metadata.key);
      assert.ok(input.Tagging.TagSet.length === 4);
      putObjectTagCallCount++;
      return {};
    });

    s3Mock.on(GetObjectTaggingCommand).resolves({
      TagSet: [
        {
          Key: "Tag1",
          Value: "Value1"
        }
      ]
    });

    const result = {
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": ["malware.a", "malware.b"],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": "abc",
        "bucket": "test-bucket",
        "key": "test-key"
      }
    };

    await actions.tagObject(result.metadata.bucket, result.metadata.key, result);
    assert(putObjectTagCallCount === 1);
  });
});
