const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const assert = require('assert');
const qs = require('querystring');
const CONFIG = require('./config').CONFIG;
const utils = require('./utils');
const scanii = require('./client');
const pkg = require('../package.json');

const s3Client = new S3Client({});


/**
 * Handles events from S3 and submits object for processing
 * @param event {Object} S3 event to be processed
 * @param context the AWS lambda context
 */
exports.handler = async (event, context) => {

  try {
    console.log(`handling s3 event using ${pkg.name}/v${pkg.version}`);

    // pre-flight checks:
    assert.ok(CONFIG.CALLBACK_URL !== null, "api callback url cannot be null");
    assert.ok(CONFIG.KEY !== null, "api key cannot be null");
    assert.ok(CONFIG.SECRET !== null, "api secret cannot be null");

    const scaniiClient = new scanii.ScaniiClient(CONFIG.KEY, CONFIG.SECRET, `https://${CONFIG.API_ENDPOINT}`, CONFIG.MAX_ATTEMPTS, CONFIG.MAX_ATTEMPT_DELAY_MSEC);

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;

    // see https://forums.aws.amazon.com/thread.jspa?threadID=215813
    const key = Object.keys(qs.decode(event.Records[0].s3.object.key))[0];

    // sanity checks
    assert(bucket !== undefined, "bucket not present in s3 event");
    assert(key !== undefined, "key not present in s3 event");
    assert(key.endsWith('/') !== true, "cannot process directory");

    console.log('processing ' + utils.internalId(bucket, key));

    // creating signed url for processing - permissions are only checked at execution time
    const url = await exports._getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: CONFIG.SIGNED_URL_DURATION }
    );
    console.log('created signed url', url);

    console.log('submitting content for processing');
    // signing request
    const signature = utils.generateSignature(bucket, key);
    console.log('using signature ' + signature);

    const metadata = {
      "signature": signature,
      "bucket": bucket,
      "key": key
    };

    const submitResult = await scaniiClient.fetch(url, metadata, CONFIG.CALLBACK_URL);
    assert.ok(submitResult.id !== undefined, "invalid response from server");
    assert.ok(submitResult.resourceLocation !== undefined, "invalid response from server, no response received");
    console.log(`contents submitted for processing with id: ${submitResult.id} and location: ${submitResult.resourceLocation}`);

    return {
      "statusCode": 200,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": JSON.stringify({status: "OK"}, null, 2)
    };
  } catch (error) {
    console.error(error, error.stack); // an error occurred
    return {
      "statusCode": 500,
      "headers": {
        "Content-Type": "application/json"
      },
      "body": JSON.stringify({status: error.message}, null, 2)
    };
  }
};

exports._getSignedUrl = getSignedUrl;
