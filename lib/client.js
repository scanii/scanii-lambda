const { ScaniiClient: CoreClient } = require('@scanii/core');

/**
 * Retry wrapper around the @scanii/core ScaniiClient.
 */
class ScaniiClient {
  constructor(key, secret, endpoint, maxAttempts = 3, maxAttemptDelay = 1000) {
    this.maxAttempts = maxAttempts;
    this.maxAttemptDelay = maxAttemptDelay;
    this._client = new CoreClient({ key, secret, endpoint });
  }

  async fetch(location, metadata, callback) {
    return this._retry(() => this._client.fetch(location, metadata, callback));
  }

  async retrieve(id) {
    return this._retry(() => this._client.retrieve(id));
  }

  async _retry(func) {
    let attempt = 1;
    while (attempt <= this.maxAttempts) {
      if (attempt > 1) {
        const wait = Math.round(Math.random() * this.maxAttemptDelay);
        console.log(`retrying, waiting ${wait}ms`);
        await new Promise(resolve => setTimeout(resolve, wait));
      }
      try {
        return await func();
      } catch (e) {
        console.error(e.message);
      } finally {
        attempt++;
      }
    }
    throw new ScaniiError(attempt - 1);
  }
}

class ScaniiError extends Error {
  constructor(attempts) {
    super(`Scanii ERROR, could not get a successful response from service after ${attempts} attempts`);
    this.attempts = attempts;
  }
}

exports.ScaniiClient = ScaniiClient;
exports.ScaniiError = ScaniiError;
