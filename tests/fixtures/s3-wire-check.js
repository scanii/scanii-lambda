// Runs the S3 client's real response deserializers over canned S3 responses and prints what they
// parse to. tests/s3-wire.js runs it in a process of its own, because aws-sdk-client-mock, which the
// other tests install on S3Client, replaces send() and so skips the deserializers entirely.
//
// 3.0.3 and 3.1.0 shipped with a fast-xml-parser override that the AWS SDK's XML parser could not
// use: every XML response, GetObjectTagging and S3's own error bodies alike, failed to deserialize,
// so tagging and delete-on-findings failed on every callback (scanii-lambda#124).
const { S3Client, GetObjectTaggingCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');

function respond(statusCode, body) {
  return {
    handle: async () => ({
      response: {
        statusCode,
        headers: { 'content-type': 'application/xml', 'x-amz-request-id': 'R' },
        body: Readable.from([Buffer.from(body)]),
      },
    }),
    updateHttpClientConfig() {},
    httpHandlerConfigs() { return {}; },
  };
}

const cases = {
  tags: [200, '<?xml version="1.0" encoding="UTF-8"?>\n<Tagging xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><TagSet>' +
    '<Tag><Key>scanii-findings</Key><Value>content.malicious.eicar &amp; more</Value></Tag>' +
    '<Tag><Key>other</Key><Value>&#233;</Value></Tag></TagSet></Tagging>'],
  empty: [200, '<?xml version="1.0" encoding="UTF-8"?><Tagging><TagSet></TagSet></Tagging>'],
  missing: [404, '<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>'],
};

// Only when run on its own: mocha loads every file under tests/, this one included, and here it must
// do nothing.
if (require.main === module) (async () => {
  const out = {};
  for (const [name, [status, body]] of Object.entries(cases)) {
    const client = new S3Client({
      region: 'us-east-1', credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
      requestHandler: respond(status, body), maxAttempts: 1,
    });
    try {
      out[name] = { tags: (await client.send(new GetObjectTaggingCommand({ Bucket: 'b', Key: 'k' }))).TagSet };
    } catch (e) {
      out[name] = { error: e.name, status: e.$metadata && e.$metadata.httpStatusCode, message: e.message };
    }
  }
  process.stdout.write(JSON.stringify(out));
})();
