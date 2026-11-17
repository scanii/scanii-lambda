const assert = require('assert');
const { describe, it } = require('mocha');
const { execFileSync } = require('child_process');
const path = require('path');

// The S3 client must parse real S3 XML: aws-sdk-client-mock never runs the deserializers, which is
// how 3.0.3 and 3.1.0 shipped with every XML response failing (scanii-lambda#124).
describe('S3 wire format', () => {
  const out = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'fixtures', 's3-wire-check.js')], { encoding: 'utf8' }));

  it('parses GetObjectTagging tags, entities included', () => {
    assert.deepStrictEqual(out.tags, { tags: [
      { Key: 'scanii-findings', Value: 'content.malicious.eicar & more' },
      { Key: 'other', Value: 'é' },
    ] });
  });

  it('parses an empty tag set', () => {
    assert.deepStrictEqual(out.empty, { tags: [] });
  });

  it('turns an S3 error body into its named error', () => {
    assert.strictEqual(out.missing.error, 'NoSuchKey');
    assert.strictEqual(out.missing.status, 404);
  });
});
