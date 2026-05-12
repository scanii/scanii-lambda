const handler = require('../lib/ag-handler.js').handler;
const assert = require('assert');
const it = require("mocha/lib/mocha.js").it;
const describe = require("mocha/lib/mocha.js").describe;
const beforeEach = require("mocha/lib/mocha.js").beforeEach;
const afterEach = require("mocha/lib/mocha.js").afterEach;
const utils = require('../lib/utils.js');
const CONFIG = require('../lib/config').CONFIG;
const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, DeleteObjectCommand, PutObjectTaggingCommand, GetObjectTaggingCommand } = require('@aws-sdk/client-s3');

const s3Mock = mockClient(S3Client);

describe('Api Gateway handler tests', () => {
  beforeEach(() => {
    s3Mock.reset();

    s3Mock.on(DeleteObjectCommand).resolves({});
    s3Mock.on(PutObjectTaggingCommand).resolves({});
    s3Mock.on(GetObjectTaggingCommand).resolves({ TagSet: [] });

    CONFIG.ACTION_DELETE_OBJECT = true;
    CONFIG.SECRET = "secret";
    CONFIG.KEY = "key";
    CONFIG.CALLBACK_URL = "https://example.com/callback/";
  });


  afterEach(() => {
    s3Mock.reset();
  });

  it('should handle a callback without findings', async () => {
    const result = await handler(hydrateEvent({
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": [],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": utils.generateSignature("test-bucket", "test-key"),
        "bucket": "test-bucket",
        "key": "test-key"
      }
    }), {});
    assert(result.statusCode === 200);
  });

  it('should handle a bogus callback', async () => {
    const result = await handler(hydrateEvent({"hello": "world"}), {});
    assert(result.statusCode === 500, "should return the file id");
    assert(result.body.includes("no id provided"));
  });

  it('should require bucket/key in callback metadata', async () => {
    const result = await handler(hydrateEvent({
        "id": "2e4612793298b1d691202e75dc125f6e",
        "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
        "content_length": "1251174",
        "findings": [],
        "creation_date": "2016-01-24T15:05:53.260Z",
        "content_type": "image/jpeg",
        "metadata": {
          "signature": utils.generateSignature("test-bucket", "test-key"),
        }
      }), {});
    assert(result.statusCode === 500, "should return the file id");
    assert(result.body.includes("no bucket supplied in metadata"));
  });

  it('should handle callbacks with findings', async () => {
    const result = await handler(hydrateEvent({
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": ['finding1', 'finding2'],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": utils.generateSignature("test-bucket", "test-key"),
        "bucket": "test-bucket",
        "key": "test-key"
      }
    }), {});
    assert(result.statusCode === 200);
  });

  it('should ensure callback signatures match', async () => {
    const result = await handler(hydrateEvent({
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": ['finding1', 'finding2'],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": utils.generateSignature("test-bucket", "test-key"),
        "bucket": "test-bucket",
        "key": "test-key"
      }
    }), {});
    assert(result.statusCode === 200);
  });

  it('should ensure callback signatures match - negative', async () => {
    const result = await handler(hydrateEvent({
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": ['finding1', 'finding2'],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": utils.generateSignature("test-bucket", "wrong-key"),
        "bucket": "test-bucket",
        "key": "test-key"
      }
    }), {});
    assert(result.statusCode === 500);
  });

  it('should enforce signatures in callbacks', async () => {
    const result = await handler(hydrateEvent({
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": ['finding1', 'finding2'],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": "1234",
        "bucket": "test-bucket",
        "key": "test-key"
      }
    }), {});
    assert(result.statusCode === 500, "should return the file id");
    assert(result.body.includes("invalid signature"));
  });

  it('should handle api gateway proxy callbacks', async () => {
    const result = await handler(hydrateEvent({
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": ['finding1', 'finding2'],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": utils.generateSignature("test-bucket", "test-key"),
        "bucket": "test-bucket",
        "key": "test-key"
      }
    }), {});
    assert(result.statusCode === 200);
  });

  it('should handle api gateway proxy callbacks and findings', async () => {
    const result = await handler(hydrateEvent({
      "id": "2e4612793298b1d691202e75dc125f6e",
      "checksum": "30d3007d8fa7e76f2741805fbaf1c8bba9a00051",
      "content_length": "1251174",
      "findings": ['finding1', 'finding2'],
      "creation_date": "2016-01-24T15:05:53.260Z",
      "content_type": "image/jpeg",
      "metadata": {
        "signature": utils.generateSignature("test-bucket", "test-key"),
        "bucket": "test-bucket",
        "key": "test-key"
      }
    }), {});
    assert(result.statusCode === 200);
  });

  it('should handle api gateway callbacks with errors', async () => {
    const result = await handler(hydrateEvent({
      "error": "error message",
      "id": "a62a6f0ba82f6ac11e95d09b8bdf965c",
      "metadata": {
        "signature": utils.generateSignature("test-bucket", "test-key"),
        "bucket": "test-bucket",
        "key": "test-key"
      }
    }), {});
    assert(result.statusCode === 200);
  });
});

const hydrateEvent = (body) => {
  return {
    "body": JSON.stringify(body),
    "resource": "/{proxy+}",
    "path": "/path/to/resource",
    "httpMethod": "POST",
    "isBase64Encoded": "false",
    "queryStringParameters": {
      "foo": "bar"
    },
    "pathParameters": {
      "proxy": "/path/to/resource"
    },
    "stageVariables": {
      "baz": "qux"
    },
    "headers": {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, sdch",
      "Accept-Language": "en-US,en;q=0.8",
      "Cache-Control": "max-age=0",
      "CloudFront-Forwarded-Proto": "https",
      "CloudFront-Is-Desktop-Viewer": "true",
      "CloudFront-Is-Mobile-Viewer": "false",
      "CloudFront-Is-SmartTV-Viewer": "false",
      "CloudFront-Is-Tablet-Viewer": "false",
      "CloudFront-Viewer-Country": "US",
      "Host": "1234567890.execute-api.us-east-1.amazonaws.com",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Custom User Agent String",
      "Via": "1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)",
      "X-Amz-Cf-Id": "cDehVQoZnx43VYQb9j2-nvCh-9z396Uhbp027Y2JvkCPNLmGJHqlaA==",
      "X-Forwarded-For": "127.0.0.1, 127.0.0.2",
      "X-Forwarded-Port": "443",
      "X-Forwarded-Proto": "https"
    },
    "requestContext": {
      "accountId": "123456789012",
      "resourceId": "123456",
      "stage": "prod",
      "requestId": "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
      "requestTime": "09/Apr/2015:12:34:56 +0000",
      "requestTimeEpoch": 1428582896000,
      "identity": {
        "cognitoIdentityPoolId": null,
        "accountId": null,
        "cognitoIdentityId": null,
        "caller": null,
        "accessKey": null,
        "sourceIp": "127.0.0.1",
        "cognitoAuthenticationType": null,
        "cognitoAuthenticationProvider": null,
        "userArn": null,
        "userAgent": "Custom User Agent String",
        "user": null
      },
      "path": "/prod/path/to/resource",
      "resourcePath": "/{proxy+}",
      "httpMethod": "POST",
      "apiId": "1234567890",
      "protocol": "HTTP/1.1"
    }
  }
};
