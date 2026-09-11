(function exposeBuildCacheCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WebGlBuildCacheCore = api;
})(typeof globalThis === "object" ? globalThis : self, function buildCacheCore() {
  "use strict";

  const SHA256_BLOCK_BYTES = 64;
  const SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const rotateRight = (value, count) =>
    (value >>> count) | (value << (32 - count));

  const asBytes = (chunk) => {
    if (chunk instanceof Uint8Array) return chunk;
    if (ArrayBuffer.isView(chunk)) {
      return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    }
    if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
    throw new TypeError("SHA-256 stream chunks must be byte arrays");
  };

  class IncrementalSha256 {
    constructor() {
      this.state = new Uint32Array([
        0x6a09e667,
        0xbb67ae85,
        0x3c6ef372,
        0xa54ff53a,
        0x510e527f,
        0x9b05688c,
        0x1f83d9ab,
        0x5be0cd19,
      ]);
      this.block = new Uint8Array(SHA256_BLOCK_BYTES);
      this.words = new Uint32Array(64);
      this.blockLength = 0;
      this.bytesHashed = 0;
      this.finished = false;
    }

    update(chunk) {
      if (this.finished) throw new Error("SHA-256 digest is already finalized");
      const bytes = asBytes(chunk);
      this.bytesHashed += bytes.byteLength;
      if (!Number.isSafeInteger(this.bytesHashed)) {
        throw new Error("SHA-256 input exceeds the supported size");
      }

      let offset = 0;
      while (offset < bytes.byteLength) {
        const count = Math.min(
          SHA256_BLOCK_BYTES - this.blockLength,
          bytes.byteLength - offset
        );
        this.block.set(bytes.subarray(offset, offset + count), this.blockLength);
        this.blockLength += count;
        offset += count;
        if (this.blockLength === SHA256_BLOCK_BYTES) {
          this.compress(this.block);
          this.blockLength = 0;
        }
      }
      return this;
    }

    compress(block) {
      const words = this.words;
      for (let index = 0; index < 16; index += 1) {
        const offset = index * 4;
        words[index] =
          ((block[offset] << 24) |
            (block[offset + 1] << 16) |
            (block[offset + 2] << 8) |
            block[offset + 3]) >>>
          0;
      }
      for (let index = 16; index < 64; index += 1) {
        const before15 = words[index - 15];
        const before2 = words[index - 2];
        const sigma0 =
          rotateRight(before15, 7) ^
          rotateRight(before15, 18) ^
          (before15 >>> 3);
        const sigma1 =
          rotateRight(before2, 17) ^
          rotateRight(before2, 19) ^
          (before2 >>> 10);
        words[index] =
          (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
      }

      let a = this.state[0];
      let b = this.state[1];
      let c = this.state[2];
      let d = this.state[3];
      let e = this.state[4];
      let f = this.state[5];
      let g = this.state[6];
      let h = this.state[7];

      for (let index = 0; index < 64; index += 1) {
        const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const choose = (e & f) ^ (~e & g);
        const temporary1 = (h + sum1 + choose + SHA256_K[index] + words[index]) >>> 0;
        const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const temporary2 = (sum0 + majority) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temporary1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temporary1 + temporary2) >>> 0;
      }

      this.state[0] = (this.state[0] + a) >>> 0;
      this.state[1] = (this.state[1] + b) >>> 0;
      this.state[2] = (this.state[2] + c) >>> 0;
      this.state[3] = (this.state[3] + d) >>> 0;
      this.state[4] = (this.state[4] + e) >>> 0;
      this.state[5] = (this.state[5] + f) >>> 0;
      this.state[6] = (this.state[6] + g) >>> 0;
      this.state[7] = (this.state[7] + h) >>> 0;
    }

    digestHex() {
      if (this.finished) throw new Error("SHA-256 digest is already finalized");
      this.finished = true;

      const block = this.block;
      let length = this.blockLength;
      block[length] = 0x80;
      length += 1;
      if (length > 56) {
        block.fill(0, length);
        this.compress(block);
        block.fill(0);
      } else {
        block.fill(0, length);
      }

      const highBits = Math.floor(this.bytesHashed / 0x20000000);
      const lowBits = (this.bytesHashed * 8) >>> 0;
      block[56] = (highBits >>> 24) & 0xff;
      block[57] = (highBits >>> 16) & 0xff;
      block[58] = (highBits >>> 8) & 0xff;
      block[59] = highBits & 0xff;
      block[60] = (lowBits >>> 24) & 0xff;
      block[61] = (lowBits >>> 16) & 0xff;
      block[62] = (lowBits >>> 8) & 0xff;
      block[63] = lowBits & 0xff;
      this.compress(block);

      return Array.from(this.state, (word) =>
        word.toString(16).padStart(8, "0")
      ).join("");
    }
  }

  class BuildArtifactMismatchError extends Error {
    constructor(file, actualSha256, receivedBytes) {
      const role = file && file.role ? file.role : "artifact";
      const expected = file && file.responseSha256;
      super(
        `WGP-CACHE-MISMATCH: ${role} response digest mismatch ` +
          `(expected ${expected || "missing"}, received ${actualSha256 || "unavailable"}, ` +
          `${receivedBytes} bytes)`
      );
      this.name = "BuildArtifactMismatchError";
      this.code = "WGP-CACHE-MISMATCH";
      this.role = role;
      this.expectedSha256 = expected || "";
      this.actualSha256 = actualSha256 || "";
      this.receivedBytes = receivedBytes;
    }
  }

  const isResponseDigest = (value) => /^[a-f0-9]{64}$/.test(value || "");

  const verifiedResponse = (response, file, options = {}) => {
    if (!response || !response.body || !isResponseDigest(file.responseSha256)) {
      throw new BuildArtifactMismatchError(file, "", 0);
    }

    const hasher = new IncrementalSha256();
    let receivedBytes = 0;
    const verification = new TransformStream({
      transform(chunk, controller) {
        const bytes = asBytes(chunk);
        receivedBytes += bytes.byteLength;
        hasher.update(bytes);
        if (typeof options.onProgress === "function") {
          options.onProgress(receivedBytes, file.responseSize || 0);
        }
        controller.enqueue(chunk);
      },
      flush() {
        const actualSha256 = hasher.digestHex();
        if (
          actualSha256 !== file.responseSha256 ||
          (Number.isSafeInteger(file.responseSize) &&
            file.responseSize > 0 &&
            receivedBytes !== file.responseSize)
        ) {
          throw new BuildArtifactMismatchError(
            file,
            actualSha256,
            receivedBytes
          );
        }
      },
    });

    return new Response(response.body.pipeThrough(verification), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };

  const cacheVerifiedResponse = async (
    cache,
    key,
    response,
    file,
    options = {}
  ) => {
    try {
      await cache.put(key, verifiedResponse(response, file, options));
      return true;
    } catch (error) {
      await cache.delete(key).catch(() => false);
      throw error;
    }
  };

  const createDeferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve, reject };
  };

  const abortError = () => {
    if (typeof DOMException === "function") {
      return new DOMException("Build artifact request was cancelled", "AbortError");
    }
    const error = new Error("Build artifact request was cancelled");
    error.name = "AbortError";
    return error;
  };

  const keyIdentity = (key) =>
    typeof key === "string" ? key : key && key.url ? key.url : String(key);

  const responseCanBeVerified = (response) =>
    Boolean(response && response.ok && response.status === 200 && response.body);

  class BuildArtifactCoordinator {
    constructor({
      fetchImpl = (...args) => fetch(...args),
      maxInflight = 8,
      maxForegroundConsumers = 4,
    } = {}) {
      this.fetchImpl = fetchImpl;
      this.maxInflight = maxInflight;
      this.maxForegroundConsumers = maxForegroundConsumers;
      this.inflight = new Map();
    }

    get size() {
      return this.inflight.size;
    }

    operationFor(options) {
      const id = keyIdentity(options.key);
      let operation = this.inflight.get(id);
      const reused = Boolean(operation);
      if (!operation) {
        if (this.inflight.size >= this.maxInflight) {
          throw new Error("WGP-CACHE-BUSY: build cache in-flight limit reached");
        }
        operation = this.startOperation(id, options);
        this.inflight.set(id, operation);
      }
      return { operation, reused };
    }

    startOperation(id, options) {
      const completion = createDeferred();
      // Avoid a process-level unhandled rejection if every consumer cancels
      // before its caller can attach a lifecycle promise.
      completion.promise.catch(() => {});
      const operation = {
        id,
        cache: options.cache,
        key: options.key,
        request: options.request,
        file: options.file,
        controller: new AbortController(),
        completion,
        consumers: new Set(),
        foregroundWaiters: [],
        acceptingForeground: true,
        settled: false,
      };

      Promise.resolve()
        .then(() =>
          this.fetchImpl(operation.request, {
            signal: operation.controller.signal,
          })
        )
        .then((response) => this.consumeResponse(operation, response))
        .then(
          (result) => {
            operation.settled = true;
            operation.acceptingForeground = false;
            if (this.inflight.get(id) === operation) this.inflight.delete(id);
            completion.resolve(result);
          },
          (error) => {
            operation.settled = true;
            operation.acceptingForeground = false;
            if (this.inflight.get(id) === operation) this.inflight.delete(id);
            completion.reject(error);
          }
        );
      return operation;
    }

    attachConsumer(operation, signal) {
      const consumer = {
        active: true,
        signal,
        abortListener: null,
        foregroundWaiter: null,
      };
      operation.consumers.add(consumer);

      const release = () => this.releaseConsumer(operation, consumer);
      if (signal) {
        consumer.abortListener = release;
        if (signal.aborted) release();
        else signal.addEventListener("abort", release, { once: true });
      }
      operation.completion.promise.then(release, release);
      return consumer;
    }

    releaseConsumer(operation, consumer) {
      if (!consumer.active) return;
      consumer.active = false;
      operation.consumers.delete(consumer);
      if (consumer.signal && consumer.abortListener) {
        consumer.signal.removeEventListener("abort", consumer.abortListener);
      }
      if (consumer.foregroundWaiter) {
        consumer.foregroundWaiter.reject(abortError());
        consumer.foregroundWaiter = null;
      }
      if (!operation.settled && operation.consumers.size === 0) {
        operation.controller.abort();
      }
    }

    completionFor(operation, consumer) {
      if (!consumer.active) return Promise.reject(abortError());
      if (!consumer.signal) return operation.completion.promise;
      return Promise.race([
        operation.completion.promise,
        new Promise((_, reject) => {
          const onAbort = () => reject(abortError());
          if (consumer.signal.aborted) onAbort();
          else consumer.signal.addEventListener("abort", onAbort, { once: true });
          operation.completion.promise.then(
            () => consumer.signal.removeEventListener("abort", onAbort),
            () => consumer.signal.removeEventListener("abort", onAbort)
          );
        }),
      ]);
    }

    warm(options) {
      const { operation, reused } = this.operationFor(options);
      const consumer = this.attachConsumer(operation, options.signal);
      return {
        reused,
        completion: this.completionFor(operation, consumer).then(
          (result) => result.cached
        ),
      };
    }

    foreground(options) {
      const { operation, reused } = this.operationFor(options);
      const consumer = this.attachConsumer(operation, options.signal);
      let response;

      if (
        consumer.active &&
        operation.acceptingForeground &&
        operation.foregroundWaiters.length < this.maxForegroundConsumers
      ) {
        const waiter = createDeferred();
        waiter.promise.catch(() => {});
        consumer.foregroundWaiter = waiter;
        operation.foregroundWaiters.push({ consumer, waiter });
        response = waiter.promise;
      } else {
        response = this.completionFor(operation, consumer).then(async (result) => {
          if (!result.cached) {
            throw new Error("Build artifact was not available from verified cache");
          }
          const cached = await options.cache.match(options.key);
          if (!cached) throw new Error("Verified build artifact cache entry is missing");
          return cached;
        });
      }

      return {
        reused,
        response,
        completion: operation.completion.promise,
      };
    }

    resolveForeground(operation, response, includeVerifier) {
      operation.acceptingForeground = false;
      const waiters = operation.foregroundWaiters.filter(
        ({ consumer }) => consumer.active
      );
      operation.foregroundWaiters.length = 0;

      for (const { consumer, waiter } of waiters) {
        consumer.foregroundWaiter = null;
        waiter.resolve(response.clone());
      }

      if (!includeVerifier && response.body) {
        // No verified cache write will consume the original response branch.
        response.body.cancel().catch(() => {});
      }
      return waiters.length;
    }

    async consumeResponse(operation, response) {
      if (!responseCanBeVerified(response)) {
        this.resolveForeground(operation, response, false);
        return { cached: false };
      }

      this.resolveForeground(operation, response, true);
      await cacheVerifiedResponse(
        operation.cache,
        operation.key,
        response,
        operation.file
      );
      return { cached: true };
    }
  }

  return {
    BuildArtifactCoordinator,
    BuildArtifactMismatchError,
    IncrementalSha256,
    cacheVerifiedResponse,
  };
});
