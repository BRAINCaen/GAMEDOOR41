// Défi de Noël des entreprises — bloc Netlify Blobs repris de netlify/avent-coeur.mjs (branche feat/avent-2026-moteur).
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// editeur-src/node_modules/@netlify/runtime-utils/dist/main.js
var getString, base64Decode, base64Encode, getEnvironment;
var init_main = __esm({
  "editeur-src/node_modules/@netlify/runtime-utils/dist/main.js"() {
    getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
    base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
    base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
    getEnvironment = () => {
      const { Deno, Netlify, process: process2 } = globalThis;
      return Netlify?.env ?? Deno?.env ?? {
        delete: (key) => delete process2?.env[key],
        get: (key) => process2?.env[key],
        has: (key) => Boolean(process2?.env[key]),
        set: (key, value) => {
          if (process2?.env) {
            process2.env[key] = value;
          }
        },
        toObject: () => process2?.env ?? {}
      };
    };
  }
});

// editeur-src/node_modules/@netlify/otel/dist/main.js
function withActiveSpan(tracer, name, optionsOrFn, contextOrFn, fn) {
  const func = typeof contextOrFn === "function" ? contextOrFn : typeof optionsOrFn === "function" ? optionsOrFn : fn;
  if (!func) {
    throw new Error("function to execute with active span is missing");
  }
  if (!tracer) {
    return func();
  }
  return tracer.withActiveSpan(name, optionsOrFn, contextOrFn, func);
}
var GET_TRACER, getTracer;
var init_main2 = __esm({
  "editeur-src/node_modules/@netlify/otel/dist/main.js"() {
    GET_TRACER = "__netlify__getTracer";
    getTracer = (name, version) => {
      return globalThis[GET_TRACER]?.(name, version);
    };
  }
});

// editeur-src/node_modules/@netlify/blobs/dist/chunk-SQCJ2S3G.js
function withSpan(span, name, fn) {
  if (span) return fn(span);
  return withActiveSpan(getTracer(), name, (span2) => {
    return fn(span2);
  });
}
var getEnvironmentContext, setEnvironmentContext, MissingBlobsEnvironmentError, BASE64_PREFIX, METADATA_HEADER_INTERNAL, METADATA_HEADER_EXTERNAL, METADATA_MAX_SIZE, encodeMetadata, decodeMetadata, getMetadataFromResponse, NF_ERROR, NF_REQUEST_ID, DEPLOY_STORE_PREFIX, SITE_STORE_PREFIX, isDeniedWrite, blobsErrorMessage, BlobsInternalError, createBlobsInternalError, discardBody, collectIterator, BlobsConsistencyError, REGION_AUTO, regions, isValidRegion, InvalidBlobsRegionError, DEFAULT_RETRY_DELAY, MIN_RETRY_DELAY, MAX_RETRY, RATE_LIMIT_HEADER, fetchAndRetry, getDelay, sleep, SIGNED_URL_ACCEPT_HEADER, Client, getClientOptions;
var init_chunk_SQCJ2S3G = __esm({
  "editeur-src/node_modules/@netlify/blobs/dist/chunk-SQCJ2S3G.js"() {
    init_main();
    init_main();
    init_main2();
    init_main();
    getEnvironmentContext = () => {
      const context = globalThis.netlifyBlobsContext || getEnvironment().get("NETLIFY_BLOBS_CONTEXT");
      if (typeof context !== "string" || !context) {
        return {};
      }
      const data = base64Decode(context);
      try {
        return JSON.parse(data);
      } catch {
      }
      return {};
    };
    setEnvironmentContext = (context) => {
      const encodedContext = base64Encode(JSON.stringify(context));
      getEnvironment().set("NETLIFY_BLOBS_CONTEXT", encodedContext);
    };
    MissingBlobsEnvironmentError = class extends Error {
      constructor(requiredProperties) {
        super(
          `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
            ", "
          )}`
        );
        this.name = "MissingBlobsEnvironmentError";
      }
    };
    BASE64_PREFIX = "b64;";
    METADATA_HEADER_INTERNAL = "x-amz-meta-user";
    METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
    METADATA_MAX_SIZE = 2 * 1024;
    encodeMetadata = (metadata) => {
      if (!metadata) {
        return null;
      }
      const encodedObject = base64Encode(JSON.stringify(metadata));
      const payload = `b64;${encodedObject}`;
      if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
        throw new Error("Metadata object exceeds the maximum size");
      }
      return payload;
    };
    decodeMetadata = (header) => {
      if (!header?.startsWith(BASE64_PREFIX)) {
        return {};
      }
      const encodedData = header.slice(BASE64_PREFIX.length);
      const decodedData = base64Decode(encodedData);
      const metadata = JSON.parse(decodedData);
      return metadata;
    };
    getMetadataFromResponse = (response) => {
      if (!response.headers) {
        return {};
      }
      const value = response.headers.get(METADATA_HEADER_EXTERNAL) || response.headers.get(METADATA_HEADER_INTERNAL);
      try {
        return decodeMetadata(value);
      } catch {
        throw new Error(
          "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
        );
      }
    };
    NF_ERROR = "x-nf-error";
    NF_REQUEST_ID = "x-nf-request-id";
    DEPLOY_STORE_PREFIX = "deploy:";
    SITE_STORE_PREFIX = "site:";
    isDeniedWrite = (res, { method, storeName }) => (res.status === 401 || res.status === 403) && (method === "put" || method === "delete") && storeName !== void 0 && !storeName.startsWith(DEPLOY_STORE_PREFIX);
    blobsErrorMessage = (res, context, responseBody) => {
      let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
      if (res.headers.has(NF_REQUEST_ID)) {
        details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
      }
      if (isDeniedWrite(res, context)) {
        const storeName = context.storeName?.startsWith(SITE_STORE_PREFIX) ? context.storeName.slice(SITE_STORE_PREFIX.length) : context.storeName;
        const summary = `Netlify Blobs could not write to store '${storeName}' (${details}).`;
        if (context.edgeAccess) {
          return summary;
        }
        return `${summary} Builds and build plugins can only write to deploy-specific stores: use 'getDeployStore' instead of 'getStore', or pass a 'token' with write access to the store. If this code is not running in a build, check that the token and site ID are valid. See https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores`;
      }
      let message = `Netlify Blobs has generated an internal error (${details})`;
      if (!res.headers.get(NF_ERROR) && responseBody) {
        message += `: ${responseBody}`;
      }
      return message;
    };
    BlobsInternalError = class extends Error {
      constructor(res, context = {}, responseBody) {
        super(blobsErrorMessage(res, context, responseBody));
        this.name = "BlobsInternalError";
        this.status = res.status;
        this.responseBody = responseBody;
      }
    };
    createBlobsInternalError = async (res, context = {}) => {
      const responseBody = await res.clone().text().catch(() => void 0);
      return new BlobsInternalError(res, context, responseBody);
    };
    discardBody = async (res) => {
      await res.body?.cancel().catch(() => {
      });
    };
    collectIterator = async (iterator) => {
      const result = [];
      for await (const item of iterator) {
        result.push(item);
      }
      return result;
    };
    BlobsConsistencyError = class extends Error {
      constructor() {
        super(
          `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
        );
        this.name = "BlobsConsistencyError";
      }
    };
    REGION_AUTO = "auto";
    regions = {
      "us-east-1": true,
      "us-east-2": true,
      "eu-central-1": true,
      "ap-southeast-1": true,
      "ap-southeast-2": true
    };
    isValidRegion = (input) => Object.keys(regions).includes(input);
    InvalidBlobsRegionError = class extends Error {
      constructor(region) {
        super(
          `${region} is not a supported Netlify Blobs region. Supported values are: ${Object.keys(regions).join(", ")}.`
        );
        this.name = "InvalidBlobsRegionError";
      }
    };
    DEFAULT_RETRY_DELAY = getEnvironment().get("NODE_ENV") === "test" ? 1 : 5e3;
    MIN_RETRY_DELAY = 1e3;
    MAX_RETRY = 5;
    RATE_LIMIT_HEADER = "X-RateLimit-Reset";
    fetchAndRetry = async (fetch2, url, options, attemptsLeft = MAX_RETRY, getRetryUrl) => {
      try {
        const res = await fetch2(url, options);
        const isRetryable = res.status === 429 || res.status >= 500 || getRetryUrl !== void 0 && res.status === 403;
        if (attemptsLeft > 0 && isRetryable) {
          await discardBody(res);
          const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
          await sleep(delay);
          const retryUrl = getRetryUrl ? await getRetryUrl() : url;
          return fetchAndRetry(fetch2, retryUrl, options, attemptsLeft - 1, getRetryUrl);
        }
        return res;
      } catch (error) {
        if (attemptsLeft === 0) {
          throw error;
        }
        const delay = getDelay();
        await sleep(delay);
        const retryUrl = getRetryUrl ? await getRetryUrl() : url;
        return fetchAndRetry(fetch2, retryUrl, options, attemptsLeft - 1, getRetryUrl);
      }
    };
    getDelay = (rateLimitReset) => {
      if (!rateLimitReset) {
        return DEFAULT_RETRY_DELAY;
      }
      return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
    };
    sleep = (ms) => new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
    SIGNED_URL_ACCEPT_HEADER = "application/json;type=signed-url";
    Client = class {
      /**
       * Whether requests reach Blobs through the edge rather than the API. Only
       * runtime environments are given an edge URL.
       */
      get edgeAccess() {
        return this.edgeURL !== void 0;
      }
      constructor({ apiURL, consistency, edgeURL, fetch: fetch2, region, siteID, token, uncachedEdgeURL }) {
        this.apiURL = apiURL;
        this.consistency = consistency ?? "eventual";
        this.edgeURL = edgeURL;
        this.fetch = fetch2 ?? globalThis.fetch;
        this.region = region;
        this.siteID = siteID;
        this.token = token;
        this.uncachedEdgeURL = uncachedEdgeURL;
        if (!this.fetch) {
          throw new Error(
            "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
          );
        }
      }
      async getFinalRequest({
        consistency: opConsistency,
        key,
        metadata,
        method,
        parameters = {},
        storeName
      }) {
        const encodedMetadata = encodeMetadata(metadata);
        const consistency = opConsistency ?? this.consistency;
        let urlPath = `/${this.siteID}`;
        if (storeName) {
          urlPath += `/${storeName}`;
        }
        if (key) {
          urlPath += `/${key}`;
        }
        if (this.edgeURL) {
          if (consistency === "strong" && !this.uncachedEdgeURL) {
            throw new BlobsConsistencyError();
          }
          const headers = {
            authorization: `Bearer ${this.token}`
          };
          if (encodedMetadata) {
            headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
          }
          if (this.region) {
            urlPath = `/region:${this.region}${urlPath}`;
          }
          const url2 = new URL(urlPath, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
          for (const key2 in parameters) {
            url2.searchParams.set(key2, parameters[key2]);
          }
          return {
            headers,
            url: url2.toString()
          };
        }
        const apiHeaders = { authorization: `Bearer ${this.token}` };
        const url = new URL(`/api/v1/blobs${urlPath}`, this.apiURL ?? "https://api.netlify.com");
        for (const key2 in parameters) {
          url.searchParams.set(key2, parameters[key2]);
        }
        if (this.region) {
          url.searchParams.set("region", this.region);
        }
        if (storeName === void 0 || key === void 0) {
          return {
            headers: apiHeaders,
            url: url.toString()
          };
        }
        if (encodedMetadata) {
          apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
        }
        if (method === "head" || method === "delete") {
          return {
            headers: apiHeaders,
            url: url.toString()
          };
        }
        const res = await this.fetch(url.toString(), {
          headers: { ...apiHeaders, accept: SIGNED_URL_ACCEPT_HEADER },
          method
        });
        if (res.status !== 200) {
          throw await createBlobsInternalError(res, { edgeAccess: this.edgeAccess, method, storeName });
        }
        const { url: signedURL } = await res.json();
        const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
        return {
          headers: userHeaders,
          url: signedURL
        };
      }
      async makeRequest({
        body,
        conditions = {},
        consistency,
        headers: extraHeaders,
        key,
        metadata,
        method,
        parameters,
        storeName
      }) {
        const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
          consistency,
          key,
          metadata,
          method,
          parameters,
          storeName
        });
        const headers = {
          ...baseHeaders,
          ...extraHeaders
        };
        if (method === "put") {
          headers["cache-control"] = "max-age=0, stale-while-revalidate=60";
        }
        if ("onlyIfMatch" in conditions && conditions.onlyIfMatch) {
          headers["if-match"] = conditions.onlyIfMatch;
        } else if ("onlyIfNew" in conditions && conditions.onlyIfNew) {
          headers["if-none-match"] = "*";
        }
        const options = {
          body,
          headers,
          method
        };
        if (body instanceof ReadableStream) {
          options.duplex = "half";
        }
        const usesSignedUrl = !this.edgeURL && key !== void 0 && storeName !== void 0 && method !== "head" && method !== "delete";
        let getRetryUrl;
        if (usesSignedUrl) {
          getRetryUrl = async () => {
            const finalRequest = await this.getFinalRequest({ consistency, key, metadata, method, parameters, storeName });
            return finalRequest.url;
          };
        }
        return fetchAndRetry(this.fetch, url, options, void 0, getRetryUrl);
      }
    };
    getClientOptions = (options, contextOverride) => {
      const context = contextOverride ?? getEnvironmentContext();
      const siteID = context.siteID ?? options.siteID;
      const token = context.token ?? options.token;
      if (!siteID || !token) {
        throw new MissingBlobsEnvironmentError(["siteID", "token"]);
      }
      if (options.region !== void 0 && !isValidRegion(options.region)) {
        throw new InvalidBlobsRegionError(options.region);
      }
      const clientOptions = {
        apiURL: context.apiURL ?? options.apiURL,
        consistency: options.consistency,
        edgeURL: context.edgeURL ?? options.edgeURL,
        fetch: options.fetch,
        region: options.region,
        siteID,
        token,
        uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
      };
      return clientOptions;
    };
  }
});

// editeur-src/node_modules/@netlify/blobs/dist/main.js
var main_exports = {};
__export(main_exports, {
  connectLambda: () => connectLambda,
  getDeployStore: () => getDeployStore,
  getStore: () => getStore,
  listStores: () => listStores,
  setEnvironmentContext: () => setEnvironmentContext
});
function listStores(options = {}) {
  const context = getEnvironmentContext();
  const clientOptions = getClientOptions(options, context);
  const client = new Client(clientOptions);
  const iterator = getListIterator(client, SITE_STORE_PREFIX);
  if (options.paginate) {
    return iterator;
  }
  return collectIterator(iterator).then((results) => ({ stores: results.flatMap((page) => page.stores) }));
}
var connectLambda, LEGACY_STORE_INTERNAL_PREFIX, STATUS_OK, STATUS_PRE_CONDITION_FAILED, Store, getDeployStoreRegion, getDeployStore, getStore, formatListStoreResponse, getListIterator;
var init_main3 = __esm({
  "editeur-src/node_modules/@netlify/blobs/dist/main.js"() {
    init_chunk_SQCJ2S3G();
    init_main();
    connectLambda = (event) => {
      const rawData = base64Decode(event.blobs);
      const data = JSON.parse(rawData);
      const environmentContext = {
        deployID: event.headers["x-nf-deploy-id"],
        edgeURL: data.url,
        siteID: event.headers["x-nf-site-id"],
        token: data.token
      };
      setEnvironmentContext(environmentContext);
    };
    LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
    STATUS_OK = 200;
    STATUS_PRE_CONDITION_FAILED = 412;
    Store = class _Store {
      constructor(options) {
        this.client = options.client;
        if ("deployID" in options) {
          _Store.validateDeployID(options.deployID);
          let name = DEPLOY_STORE_PREFIX + options.deployID;
          if (options.name) {
            name += `:${options.name}`;
          }
          this.name = name;
        } else if (options.name.startsWith(LEGACY_STORE_INTERNAL_PREFIX)) {
          const storeName = options.name.slice(LEGACY_STORE_INTERNAL_PREFIX.length);
          _Store.validateStoreName(storeName);
          this.name = storeName;
        } else {
          _Store.validateStoreName(options.name);
          this.name = SITE_STORE_PREFIX + options.name;
        }
      }
      async delete(key) {
        const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
        await discardBody(res);
        if (![200, 204, 404].includes(res.status)) {
          throw new BlobsInternalError(res, {
            edgeAccess: this.client.edgeAccess,
            method: "delete",
            storeName: this.name
          });
        }
      }
      async deleteAll() {
        let totalDeletedBlobs = 0;
        let hasMore = true;
        while (hasMore) {
          const res = await this.client.makeRequest({ method: "delete", storeName: this.name });
          if (res.status !== 200) {
            await discardBody(res);
            throw new BlobsInternalError(res, {
              edgeAccess: this.client.edgeAccess,
              method: "delete",
              storeName: this.name
            });
          }
          const data = await res.json();
          if (typeof data.blobs_deleted !== "number") {
            throw new BlobsInternalError(res);
          }
          totalDeletedBlobs += data.blobs_deleted;
          hasMore = typeof data.has_more === "boolean" && data.has_more;
        }
        return {
          deletedBlobs: totalDeletedBlobs
        };
      }
      async get(key, options) {
        return withSpan(options?.span, "blobs.get", async (span) => {
          const { consistency, type } = options ?? {};
          span?.setAttributes({
            "blobs.store": this.name,
            "blobs.key": key,
            "blobs.type": type,
            "blobs.method": "GET",
            "blobs.consistency": consistency
          });
          const res = await this.client.makeRequest({
            consistency,
            key,
            method: "get",
            storeName: this.name
          });
          span?.setAttributes({
            "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
            "blobs.response.status": res.status
          });
          if (res.status === 404) {
            await discardBody(res);
            return null;
          }
          if (res.status !== 200) {
            await discardBody(res);
            throw new BlobsInternalError(res);
          }
          if (type === void 0 || type === "text") {
            return res.text();
          }
          if (type === "arrayBuffer") {
            return res.arrayBuffer();
          }
          if (type === "blob") {
            return res.blob();
          }
          if (type === "json") {
            return res.json();
          }
          if (type === "stream") {
            return res.body;
          }
          await discardBody(res);
          throw new BlobsInternalError(res);
        });
      }
      async getMetadata(key, options = {}) {
        return withSpan(options?.span, "blobs.getMetadata", async (span) => {
          span?.setAttributes({
            "blobs.store": this.name,
            "blobs.key": key,
            "blobs.method": "HEAD",
            "blobs.consistency": options.consistency
          });
          const res = await this.client.makeRequest({
            consistency: options.consistency,
            key,
            method: "head",
            storeName: this.name
          });
          span?.setAttributes({
            "blobs.response.status": res.status
          });
          if (res.status === 404) {
            return null;
          }
          if (res.status !== 200 && res.status !== 304) {
            throw new BlobsInternalError(res);
          }
          const etag = res?.headers.get("etag") ?? void 0;
          const metadata = getMetadataFromResponse(res);
          const result = {
            etag,
            metadata
          };
          return result;
        });
      }
      async getWithMetadata(key, options) {
        return withSpan(options?.span, "blobs.getWithMetadata", async (span) => {
          const { consistency, etag: requestETag, type } = options ?? {};
          const headers = requestETag ? { "if-none-match": requestETag } : void 0;
          span?.setAttributes({
            "blobs.store": this.name,
            "blobs.key": key,
            "blobs.method": "GET",
            "blobs.consistency": options?.consistency,
            "blobs.type": type,
            "blobs.request.etag": requestETag
          });
          const res = await this.client.makeRequest({
            consistency,
            headers,
            key,
            method: "get",
            storeName: this.name
          });
          const responseETag = res?.headers.get("etag") ?? void 0;
          span?.setAttributes({
            "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
            "blobs.response.etag": responseETag,
            "blobs.response.status": res.status
          });
          if (res.status === 404) {
            await discardBody(res);
            return null;
          }
          if (res.status !== 200 && res.status !== 304) {
            await discardBody(res);
            throw new BlobsInternalError(res);
          }
          const metadata = getMetadataFromResponse(res);
          const result = {
            etag: responseETag,
            metadata
          };
          if (res.status === 304 && requestETag) {
            return { data: null, ...result };
          }
          if (type === void 0 || type === "text") {
            return { data: await res.text(), ...result };
          }
          if (type === "arrayBuffer") {
            return { data: await res.arrayBuffer(), ...result };
          }
          if (type === "blob") {
            return { data: await res.blob(), ...result };
          }
          if (type === "json") {
            return { data: await res.json(), ...result };
          }
          if (type === "stream") {
            return { data: res.body, ...result };
          }
          await discardBody(res);
          throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
        });
      }
      list(options = {}) {
        return withSpan(options.span, "blobs.list", (span) => {
          span?.setAttributes({
            "blobs.store": this.name,
            "blobs.method": "GET",
            "blobs.list.paginate": options.paginate ?? false
          });
          const iterator = this.getListIterator(options);
          if (options.paginate) {
            return iterator;
          }
          return collectIterator(iterator).then(
            (items) => items.reduce(
              (acc, item) => ({
                blobs: [...acc.blobs, ...item.blobs],
                directories: [...acc.directories, ...item.directories]
              }),
              { blobs: [], directories: [] }
            )
          );
        });
      }
      async set(key, data, options = {}) {
        return withSpan(options.span, "blobs.set", async (span) => {
          span?.setAttributes({
            "blobs.store": this.name,
            "blobs.key": key,
            "blobs.method": "PUT",
            "blobs.data.size": typeof data == "string" ? data.length : data instanceof Blob ? data.size : data.byteLength,
            "blobs.data.type": typeof data == "string" ? "string" : data instanceof Blob ? "blob" : "arrayBuffer",
            "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
          });
          _Store.validateKey(key);
          const conditions = _Store.getConditions(options);
          const res = await this.client.makeRequest({
            conditions,
            body: data,
            key,
            metadata: options.metadata,
            method: "put",
            storeName: this.name
          });
          const etag = res.headers.get("etag") ?? "";
          span?.setAttributes({
            "blobs.response.etag": etag,
            "blobs.response.status": res.status
          });
          if (conditions) {
            await discardBody(res);
            return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
          }
          if (res.status === STATUS_OK) {
            await discardBody(res);
            return {
              etag,
              modified: true
            };
          }
          throw await createBlobsInternalError(res, {
            edgeAccess: this.client.edgeAccess,
            method: "put",
            storeName: this.name
          });
        });
      }
      async setJSON(key, data, options = {}) {
        return withSpan(options.span, "blobs.setJSON", async (span) => {
          span?.setAttributes({
            "blobs.store": this.name,
            "blobs.key": key,
            "blobs.method": "PUT",
            "blobs.data.type": "json",
            "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
          });
          _Store.validateKey(key);
          const conditions = _Store.getConditions(options);
          const payload = JSON.stringify(data);
          const headers = {
            "content-type": "application/json"
          };
          const res = await this.client.makeRequest({
            conditions,
            body: payload,
            headers,
            key,
            metadata: options.metadata,
            method: "put",
            storeName: this.name
          });
          await discardBody(res);
          const etag = res.headers.get("etag") ?? "";
          span?.setAttributes({
            "blobs.response.etag": etag,
            "blobs.response.status": res.status
          });
          if (conditions) {
            return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
          }
          if (res.status === STATUS_OK) {
            return {
              etag,
              modified: true
            };
          }
          throw new BlobsInternalError(res, {
            edgeAccess: this.client.edgeAccess,
            method: "put",
            storeName: this.name
          });
        });
      }
      static formatListResultBlob(result) {
        if (!result.key) {
          return null;
        }
        return {
          etag: result.etag,
          key: result.key
        };
      }
      static getConditions(options) {
        if ("onlyIfMatch" in options && "onlyIfNew" in options) {
          throw new Error(
            `The 'onlyIfMatch' and 'onlyIfNew' options are mutually exclusive. Using 'onlyIfMatch' will make the write succeed only if there is an entry for the key with the given content, while 'onlyIfNew' will make the write succeed only if there is no entry for the key.`
          );
        }
        if ("onlyIfMatch" in options && options.onlyIfMatch) {
          if (typeof options.onlyIfMatch !== "string") {
            throw new Error(`The 'onlyIfMatch' property expects a string representing an ETag.`);
          }
          return {
            onlyIfMatch: options.onlyIfMatch
          };
        }
        if ("onlyIfNew" in options && options.onlyIfNew) {
          if (typeof options.onlyIfNew !== "boolean") {
            throw new Error(
              `The 'onlyIfNew' property expects a boolean indicating whether the write should fail if an entry for the key already exists.`
            );
          }
          return {
            onlyIfNew: true
          };
        }
      }
      static validateKey(key) {
        if (key === "") {
          throw new Error("Blob key must not be empty.");
        }
        if (key.startsWith("/") || key.startsWith("%2F")) {
          throw new Error("Blob key must not start with forward slash (/).");
        }
        if (new TextEncoder().encode(key).length > 600) {
          throw new Error(
            "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
          );
        }
      }
      static validateDeployID(deployID) {
        if (!/^\w{1,24}$/.test(deployID)) {
          throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
        }
      }
      static validateStoreName(name) {
        if (name.includes("/") || name.includes("%2F")) {
          throw new Error("Store name must not contain forward slashes (/).");
        }
        if (new TextEncoder().encode(name).length > 64) {
          throw new Error(
            "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
          );
        }
      }
      getListIterator(options) {
        const { client, name: storeName } = this;
        const parameters = {};
        if (options?.prefix) {
          parameters.prefix = options.prefix;
        }
        if (options?.directories) {
          parameters.directories = "true";
        }
        return {
          [Symbol.asyncIterator]() {
            let currentCursor = null;
            let done = false;
            return {
              async next() {
                return withSpan(options?.span, "blobs.list.next", async (span) => {
                  span?.setAttributes({
                    "blobs.store": storeName,
                    "blobs.method": "GET",
                    "blobs.list.paginate": options?.paginate ?? false,
                    "blobs.list.done": done,
                    "blobs.list.cursor": currentCursor ?? void 0
                  });
                  if (done) {
                    return { done: true, value: void 0 };
                  }
                  const nextParameters = { ...parameters };
                  if (currentCursor !== null) {
                    nextParameters.cursor = currentCursor;
                  }
                  const res = await client.makeRequest({
                    method: "get",
                    parameters: nextParameters,
                    storeName
                  });
                  span?.setAttributes({
                    "blobs.response.status": res.status
                  });
                  let blobs = [];
                  let directories = [];
                  if (![200, 204, 404].includes(res.status)) {
                    await discardBody(res);
                    throw new BlobsInternalError(res);
                  }
                  if (res.status === 404) {
                    await discardBody(res);
                    done = true;
                  } else {
                    const page = await res.json();
                    if (page.next_cursor) {
                      currentCursor = page.next_cursor;
                    } else {
                      done = true;
                    }
                    blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
                    directories = page.directories ?? [];
                  }
                  return {
                    done: false,
                    value: {
                      blobs,
                      directories
                    }
                  };
                });
              }
            };
          }
        };
      }
    };
    getDeployStoreRegion = (clientOptions, context) => {
      if (clientOptions.region) {
        return clientOptions.region;
      }
      if (clientOptions.edgeURL || clientOptions.uncachedEdgeURL) {
        if (!context.primaryRegion) {
          throw new Error(
            "When accessing a deploy store, the Netlify Blobs client needs to be configured with a region, and one was not found in the environment. To manually set the region, set the `region` property in the store options. If you are using the Netlify CLI, you may have an outdated version; run `npm install -g netlify-cli@latest` to update and try again."
          );
        }
        return context.primaryRegion;
      }
      return REGION_AUTO;
    };
    getDeployStore = (input = {}, options) => {
      const context = getEnvironmentContext();
      const mergedOptions = typeof input === "string" ? { ...options, name: input } : input;
      const deployID = mergedOptions.deployID ?? context.deployID;
      if (!deployID) {
        throw new MissingBlobsEnvironmentError(["deployID"]);
      }
      const clientOptions = getClientOptions(mergedOptions, context);
      clientOptions.region = getDeployStoreRegion(clientOptions, context);
      const client = new Client(clientOptions);
      return new Store({ client, deployID, name: mergedOptions.name });
    };
    getStore = (input, options) => {
      if (typeof input === "string") {
        const contextOverride = options?.siteID && options?.token ? { siteID: options?.siteID, token: options?.token } : void 0;
        const clientOptions = getClientOptions(options ?? {}, contextOverride);
        const client = new Client(clientOptions);
        return new Store({ client, name: input });
      }
      if (typeof input?.name === "string") {
        const { name } = input;
        const contextOverride = input?.siteID && input?.token ? { siteID: input?.siteID, token: input?.token } : void 0;
        const clientOptions = getClientOptions(input, contextOverride);
        if (!name) {
          throw new MissingBlobsEnvironmentError(["name"]);
        }
        const client = new Client(clientOptions);
        return new Store({ client, name });
      }
      if (typeof input?.deployID === "string") {
        const context = getEnvironmentContext();
        const clientOptions = getClientOptions(input, context);
        const { deployID } = input;
        if (!deployID) {
          throw new MissingBlobsEnvironmentError(["deployID"]);
        }
        clientOptions.region = getDeployStoreRegion(clientOptions, context);
        const client = new Client(clientOptions);
        return new Store({ client, deployID });
      }
      throw new Error(
        "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
      );
    };
    formatListStoreResponse = (stores) => stores.filter((store) => !store.startsWith(DEPLOY_STORE_PREFIX)).map((store) => store.startsWith(SITE_STORE_PREFIX) ? store.slice(SITE_STORE_PREFIX.length) : store);
    getListIterator = (client, prefix) => {
      const parameters = {
        prefix
      };
      return {
        [Symbol.asyncIterator]() {
          let currentCursor = null;
          let done = false;
          return {
            async next() {
              if (done) {
                return { done: true, value: void 0 };
              }
              const nextParameters = { ...parameters };
              if (currentCursor !== null) {
                nextParameters.cursor = currentCursor;
              }
              const res = await client.makeRequest({
                method: "get",
                parameters: nextParameters
              });
              if (res.status === 404) {
                await discardBody(res);
                return { done: true, value: void 0 };
              }
              const page = await res.json();
              if (page.next_cursor) {
                currentCursor = page.next_cursor;
              } else {
                done = true;
              }
              return {
                done: false,
                value: {
                  ...page,
                  stores: formatListStoreResponse(page.stores)
                }
              };
            }
          };
        }
      };
    };
  }
});


// ===================================================================
// Défi de Noël des entreprises 2026 — « Le Père Noël est en garde à vue »
// Écrit à la main (pas de construction). Le bloc au-dessus est la
// bibliothèque Netlify Blobs, copiée telle quelle.
//
// Le dépôt est public : AUCUNE réponse ni énigme ici. Le contenu des
// 3 pièces est déposé dans le magasin par l'équipe (POST equipe/contenu).
// ===================================================================
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

var SITE = "https://gamedoor41.fr";
var CONTACT = process.env.DEFI_CONTACT || process.env.AVENT_CONTACT || "contact@gamedoor41.fr";
var EXPEDITEUR = process.env.DEFI_EXPEDITEUR || process.env.AVENT_EXPEDITEUR || CONTACT;
var LOT = "une session de quiz Buzz Your Brain offerte, de 4 à 16 personnes";

// Heures de Paris (décembre = UTC+1), écrites en UTC.
var PIECES = {
  1: { ouverture: "2026-12-03T07:00:00Z", limite: "2026-12-09T22:59:59Z", limiteTexte: "mercredi 9 décembre, 23 h 59", titre: "Le message intercepté" },
  2: { ouverture: "2026-12-10T07:00:00Z", limite: "2026-12-16T22:59:59Z", limiteTexte: "mercredi 16 décembre, 23 h 59", titre: "Le cadenas de la hotte" },
  3: { ouverture: "2026-12-17T07:00:00Z", limite: "2026-12-24T11:00:00Z", limiteTexte: "jeudi 24 décembre, 12 h", titre: "Le dernier interrogatoire" }
};
var FIN_INSCRIPTIONS = "2026-12-16T22:59:59Z";

var JETABLES = /@(yopmail|mailinator|guerrillamail|10minutemail|trashmail|tempmail|temp-mail|jetable|sharklasers|getnada|maildrop)\./i;

function json(obj, statut = 200) {
  return new Response(JSON.stringify(obj), { status: statut, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function refus(statut, code, message) { return json({ erreur: code, message }, statut); }
var h = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var propre = (t, max = 120) => String(t == null ? "" : t).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
var hacher = (t) => createHash("sha256").update(String(t)).digest("hex");
var jeton = () => randomBytes(15).toString("base64url");

// Comparaison de réponses : minuscules, sans accents, sans ponctuation ni articles.
var ARTICLES = new Set(["le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "the", "a"]);
function normaliser(t) {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((m) => m && !ARTICLES.has(m)).join(" ");
}
function correspond(reponse, acceptees) {
  const r = " " + normaliser(reponse) + " ";
  if (r.trim() === "") return false;
  return (acceptees || []).some((a) => { const n = normaliser(a); return n && r.includes(" " + n + " "); });
}

function stockage(nom) {
  let store = null;
  const magasin = async () => {
    if (!store) {
      init_main3();
      store = main_exports.getStore({ name: nom, consistency: "strong" });
    }
    return store;
  };
  return {
    lire: async (cle) => (await magasin()).get(cle, { type: "json" }),
    ecrire: async (cle, val) => { await (await magasin()).setJSON(cle, val); },
    lister: async (prefixe) => { const { blobs } = await (await magasin()).list({ prefix: prefixe }); return blobs.map((b) => b.key); },
    supprimer: async (cle) => { await (await magasin()).delete(cle); }
  };
}

// --- Mails (Brevo) ---------------------------------------------------
function brevo() { return process.env.BREVO_API_KEY || null; }
async function appelBrevo(corps) {
  const cle = brevo();
  if (!cle) return { ok: false, erreur: "BREVO_API_KEY absente" };
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(corps), signal: AbortSignal.timeout(15000) });
    if (r.ok) return { ok: true };
    return { ok: false, erreur: "Brevo " + r.status + " " + (await r.text()).slice(0, 200) };
  } catch (e) { return { ok: false, erreur: String(e && e.message || e).slice(0, 200) }; }
}
var EXP = () => ({ name: "GAMEDOOR·41", email: EXPEDITEUR });
async function envoyerUn({ a, nom, sujet, html, texte, repondreA }) {
  return appelBrevo({ sender: EXP(), to: [{ email: a, name: nom || undefined }], replyTo: repondreA || { email: CONTACT, name: "GAMEDOOR·41" }, subject: sujet, htmlContent: html, textContent: texte, tags: ["defi-noel-2026"] });
}
async function envoyerLot(versions, sujet) {
  // versions : [{ email, nom, html, texte }] — un seul appel Brevo par paquet de 50.
  const bilan = { envoyes: 0, echecs: [] };
  for (let i = 0; i < versions.length; i += 50) {
    const paquet = versions.slice(i, i + 50);
    const r = await appelBrevo({ sender: EXP(), replyTo: { email: CONTACT, name: "GAMEDOOR·41" }, subject: sujet, htmlContent: paquet[0].html, textContent: paquet[0].texte, tags: ["defi-noel-2026"], messageVersions: paquet.map((v) => ({ to: [{ email: v.email, name: v.nom || undefined }], htmlContent: v.html, textContent: v.texte })) });
    if (r.ok) bilan.envoyes += paquet.length; else bilan.echecs.push(r.erreur);
  }
  return bilan;
}

var SIGNATURE = `<p style="margin:24px 0 0;color:#5a6478;font-size:13px;line-height:1.5">GAMEDOOR·41 — Escape &amp; Quiz Game · 41 bis rue Pasteur, ZAC de Calix, 14120 Mondeville · 02 31 53 07 51 · <a href="${SITE}" style="color:#5a6478">gamedoor41.fr</a><br>Entrez · Jouez · Vivez.</p><p style="margin:12px 0 0;color:#8a93a5;font-size:12px">Vous recevez ce message car votre entreprise est inscrite au Calendrier de l'Avent des énigmes. Pour ne plus rien recevoir, répondez simplement « STOP ». Vos données : <a href="${SITE}/defi-noel/reglement/#donnees" style="color:#8a93a5">gamedoor41.fr/defi-noel/reglement</a>.</p>`;
function cadre(contenu) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#eef1f6;font-family:Arial,Helvetica,sans-serif;color:#14203b"><div style="max-width:560px;margin:0 auto;padding:20px 12px"><div style="background:#1B2A4E;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-weight:bold;font-size:15px">GAMEDOOR·41 · Calendrier de l'Avent des énigmes</div><div style="background:#fff;padding:22px 20px;border-radius:0 0 10px 10px;font-size:15px;line-height:1.55">${contenu}${SIGNATURE}</div></div></body></html>`;
}
// Le lien est aussi écrit en clair : certaines messageries d'entreprise désactivent les boutons.
var bouton = (lien, texte) => `<p style="margin:20px 0 6px"><a href="${h(lien)}" style="display:inline-block;background:#BE1B1B;color:#fff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:8px">${h(texte)}</a></p><p style="margin:0 0 16px;font-size:13px;color:#5a6478;word-break:break-all">Le bouton ne s'ouvre pas ? Copiez ce lien dans votre navigateur : ${h(lien)}</p>`;
var lienJeu = (origine, n, t) => `${origine}/defi-noel/piece/?n=${n}&t=${encodeURIComponent(t)}`;
var lienPartage = (origine, n) => `${origine}/defi-noel/piece/?n=${n}`;

function mailConfirmation(e, origine) {
  const html = cadre(`<p>Bonjour ${h(e.prenom)},</p><p><b>${h(e.entreprise)}</b> est bien inscrite au Calendrier de l'Avent des énigmes. Le Père Noël est en garde à vue à Mondeville, et votre équipe fait partie des enquêteurs.</p><p><b>La suite :</b> le jeudi 3 décembre au matin, vous recevrez la pièce n°1 du dossier, puis la n°2 le 10 et la n°3 le 17. Chaque fois : une énigme, un son mystère et un quiz éclair Buzz Your Brain. Environ 10 minutes en équipe.</p><p>Vous êtes le référent : c'est vous qui envoyez les réponses au nom de l'équipe, depuis votre lien personnel. Gardez ce mail, le lien ci-dessous ouvre toujours le dossier de ${h(e.entreprise)}.</p>${bouton(lienJeu(origine, 1, e.t), "Mon dossier d'enquête")}<p>À gagner pour l'entreprise qui aura le meilleur score : <b>${LOT}</b>. Gagnant annoncé le jeudi 7 janvier.</p><p>Une question ? Répondez simplement à ce mail.</p>`);
  const texte = `Bonjour ${e.prenom},\n\n${e.entreprise} est bien inscrite au Calendrier de l'Avent des énigmes de GAMEDOOR·41.\nPièce n°1 le jeudi 3 décembre, puis le 10 et le 17. Votre lien personnel : ${lienJeu(origine, 1, e.t)}\n\nÀ gagner : ${LOT}. Gagnant annoncé le jeudi 7 janvier.\n\nGAMEDOOR·41 — 02 31 53 07 51`;
  return { sujet: "Inscription confirmée : le dossier Père Noël vous attend", html, texte };
}
function mailEquipe(e) {
  const html = `<p>Nouvelle entreprise inscrite au défi de Noël :</p><ul><li><b>${h(e.entreprise)}</b> (${h(e.ville || "ville non précisée")})</li><li>${h(e.prenom)} ${h(e.nom)} — ${h(e.fonction || "")}</li><li>${h(e.email)} · ${h(e.telephone || "pas de téléphone")}</li><li>${h(e.joueurs)} joueurs · LinkedIn : ${e.linkedin ? "oui" : "non"} · offres par mail : ${e.offres ? "oui" : "non"} · connu par : ${h(e.source || "?")}</li></ul><p>Source CRM : Calendrier de l'Avent 2026.</p>`;
  return { sujet: "Défi de Noël : " + e.entreprise + " s'est inscrite", html, texte: html.replace(/<[^>]+>/g, " ") };
}
function mailPiece(n, e, origine, rappel, contenu) {
  const p = PIECES[n];
  const c = (contenu && contenu.mail) || {};
  const intro = rappel
    ? `<p>Bonjour ${h(e.prenom)},</p><p>Petit rappel : ${h(e.entreprise)} n'a pas encore envoyé ses réponses pour la pièce n°${n}. Vous avez jusqu'au <b>${p.limiteTexte}</b>.</p>`
    : `<p>Bonjour ${h(e.prenom)},</p>${c.avant || ""}<p><b>Pièce n°${n} du dossier : ${h(p.titre)}.</b></p>${c.accroche || ""}<p>Trois épreuves cette semaine : l'énigme (2 points), le son mystère (1 point) et le quiz éclair Buzz Your Brain (3 points).</p>`;
  const html = cadre(`${intro}${bouton(lienJeu(origine, n, e.t), rappel ? "Répondre maintenant" : "Ouvrir le dossier et répondre")}<p style="font-size:14px;color:#5a6478">Lien à transférer à vos collègues pour qu'ils cherchent avec vous (sans pouvoir envoyer) : <a href="${h(lienPartage(origine, n))}">${h(lienPartage(origine, n))}</a></p><p style="font-size:14px">Réponses jusqu'au ${p.limiteTexte}. Vous pouvez les corriger jusque-là : on garde la dernière version.</p>${rappel ? "" : (c.ps || "")}`);
  const texte = `Bonjour ${e.prenom},\n\nPièce n°${n} : ${p.titre}.\nVotre dossier : ${lienJeu(origine, n, e.t)}\nPour vos collègues : ${lienPartage(origine, n)}\nRéponses jusqu'au ${p.limiteTexte}.\n\nGAMEDOOR·41`;
  const sujet = rappel ? `Rappel : la pièce n°${n} attend vos réponses` : `Calendrier de l'Avent n°${n} — ${p.titre}`;
  return { sujet, html, texte };
}

// --- Le moteur --------------------------------------------------------
function creerMoteur(contexte) {
  const S = stockage(contexte === "production" ? "defi-noel-2026" : "defi-noel-2026-apercu");
  const essai = contexte !== "production";

  const maintenant = (req) => {
    if (essai) {
      const sim = new URL(req.url).searchParams.get("simuler") || req.headers.get("x-defi-simuler");
      if (sim && !isNaN(Date.parse(sim))) return new Date(sim);
    }
    return new Date();
  };
  const etatPiece = (n, quand) => {
    const p = PIECES[n];
    if (!p) return null;
    const ouverte = quand >= new Date(p.ouverture);
    const close = quand > new Date(p.limite);
    return { n, titre: p.titre, ouverture: p.ouverture, limite: p.limite, limiteTexte: p.limiteTexte, ouverte, close };
  };
  const entreprises = async () => {
    const cles = await S.lister("e/");
    const liste = await Promise.all(cles.map((k) => S.lire(k)));
    return liste.filter(Boolean).sort((a, b) => a.cree.localeCompare(b.cree));
  };
  const parJeton = async (t) => {
    if (!t || typeof t !== "string" || t.length > 60) return null;
    const id = await S.lire("t/" + hacher(t));
    return id ? S.lire("e/" + id) : null;
  };
  const contenu = async () => (await S.lire("contenu")) || { pieces: {} };

  // Ce que voit le joueur : jamais les réponses acceptées.
  const versionPublique = (piece) => {
    if (!piece) return null;
    const ep = piece.epreuves || {};
    return {
      enigme: ep.enigme ? { html: ep.enigme.html, question: ep.enigme.question, points: ep.enigme.points || 2 } : null,
      son: ep.son ? { audio: ep.son.audio || null, indice: ep.son.indice || "", transcription: ep.son.transcription || "", question: ep.son.question || "Qu'est-ce que c'est ?", points: 1 } : null,
      quiz: (ep.quiz || []).map((q) => ({ question: q.question })),
      subsidiaire: ep.subsidiaire ? { question: ep.subsidiaire.question } : null,
      avant: piece.avant || ""
    };
  };

  const corriger = (piece, reps, manuel) => {
    const ep = (piece && piece.epreuves) || {};
    const d = {};
    d.enigme = correspond(reps.enigme, ep.enigme && ep.enigme.accepte) ? (ep.enigme.points || 2) : 0;
    d.son = correspond(reps.son, ep.son && ep.son.accepte) ? 1 : 0;
    (ep.quiz || []).forEach((q, i) => { d["q" + (i + 1)] = correspond((reps.quiz || [])[i], q.accepte) ? 1 : 0; });
    for (const k in manuel || {}) if (k in d) d[k] = Number(manuel[k]) || 0;
    const total = Object.values(d).reduce((a, b) => a + b, 0);
    return { detail: d, total };
  };

  async function bilan(origine) {
    const [liste, c] = await Promise.all([entreprises(), contenu()]);
    const resultats = {};
    for (const n of [1, 2, 3]) {
      const cles = await S.lister(`r/${n}/`);
      const reps = (await Promise.all(cles.map((k) => S.lire(k)))).filter(Boolean);
      resultats[n] = reps.map((r) => ({ ...r, correction: corriger(c.pieces[n], r.reponses, r.manuel) }));
    }
    const lignes = liste.map((e) => {
      const parPiece = {};
      let total = 0, derniere = null, subsidiaire = null;
      for (const n of [1, 2, 3]) {
        const r = resultats[n].find((x) => x.id === e.id);
        if (r) { parPiece[n] = r.correction.total; total += r.correction.total; if (n === 3) { derniere = r.maj; subsidiaire = r.reponses.subsidiaire; } }
      }
      return { id: e.id, entreprise: e.entreprise, ville: e.ville, prenom: e.prenom, nom: e.nom, fonction: e.fonction, email: e.email, telephone: e.telephone, joueurs: e.joueurs, linkedin: e.linkedin, offres: !!e.offres, source: e.source, cree: e.cree, parPiece, total, derniere, subsidiaire, lien: lienJeu(origine, 1, e.t) };
    });
    // Subsidiaire : écart à la vraie valeur (nombre d'entreprises ayant trouvé l'énigme 3).
    const bonnes3 = resultats[3].filter((r) => r.correction.detail.enigme > 0).length;
    lignes.forEach((l) => { const v = parseInt(l.subsidiaire, 10); l.ecart = isNaN(v) ? null : Math.abs(v - bonnes3); });
    const classement = [...lignes].sort((a, b) => b.total - a.total || ((a.ecart ?? 1e9) - (b.ecart ?? 1e9)) || String(a.derniere || "z").localeCompare(String(b.derniere || "z")) || a.cree.localeCompare(b.cree));
    return { essai, courrier: !!brevo(), contact: CONTACT, pieces: [1, 2, 3].map((n) => ({ ...PIECES[n], n, contenu: !!c.pieces[n] })), entreprises: lignes, resultats, classement, bonnesReponsesEnigme3: bonnes3, envois: (await S.lire("envois")) || [] };
  }

  async function equipeAutorisee(req) {
    const code = req.headers.get("x-defi-code") || "";
    const ref = await S.lire("code-equipe");
    if (!ref || !code) return false;
    const a = Buffer.from(hacher(code)), b = Buffer.from(ref.hash);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async function inscrire(req, origine) {
    const quand = maintenant(req);
    if (quand > new Date(FIN_INSCRIPTIONS)) return refus(400, "clos", "Les inscriptions sont closes depuis le mercredi 16 décembre.");
    let d; try { d = await req.json(); } catch { return refus(400, "format", "Formulaire illisible."); }
    if (d.site) return json({ ok: true }); // piège à robots
    const e = {
      entreprise: propre(d.entreprise, 90), ville: propre(d.ville, 60), prenom: propre(d.prenom, 50), nom: propre(d.nom, 60), fonction: propre(d.fonction, 80),
      email: propre(d.email, 120).toLowerCase(), telephone: propre(d.telephone, 30), joueurs: Math.max(1, Math.min(500, parseInt(d.joueurs, 10) || 0)), linkedin: !!d.linkedin, offres: !!d.offres, source: propre(d.source, 60)
    };
    if (e.entreprise.length < 2) return refus(400, "entreprise", "Indiquez le nom de votre entreprise.");
    if (!e.prenom) return refus(400, "prenom", "Indiquez votre prénom.");
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e.email)) return refus(400, "email", "Cette adresse mail ne semble pas valide.");
    if (JETABLES.test(e.email)) return refus(400, "email", "Merci d'utiliser votre adresse professionnelle.");
    if (!d.rgpd) return refus(400, "rgpd", "Merci de cocher la case : vous acceptez le règlement du défi.");
    const cleEnt = normaliser(e.entreprise).replace(/ /g, "");
    const deja = await S.lire("n/" + hacher(cleEnt));
    if (deja) {
      const ex = await S.lire("e/" + deja);
      if (ex && ex.email === e.email) return json({ ok: true, deja: true, entreprise: ex.entreprise, message: "Votre entreprise est déjà inscrite. Nous venons de vous renvoyer votre lien par mail." , renvoi: await renvoyer(ex, origine) });
      return refus(409, "deja", `${ex ? ex.entreprise : e.entreprise} est déjà inscrite (une inscription par entreprise). Le référent est ${ex ? ex.prenom : "un de vos collègues"} : demandez-lui le lien à partager, ou écrivez-nous à ${CONTACT}.`);
    }
    const id = randomBytes(6).toString("hex");
    const t = jeton();
    const ent = { ...e, id, cree: quand.toISOString(), crm: "Calendrier de l'Avent 2026",
      // Preuve des accords (RGPD) : quoi, quand, sur quelle version du texte. Aucune adresse IP n'est gardée.
      accords: { reglement: quand.toISOString(), linkedin: e.linkedin ? quand.toISOString() : null, offres: e.offres ? quand.toISOString() : null, version: "reglement-2026-11-26" } };
    await S.ecrire("e/" + id, { ...ent, t });
    await S.ecrire("t/" + hacher(t), id);
    await S.ecrire("n/" + hacher(cleEnt), id);
    let mail = null;
    if (brevo()) {
      const m = mailConfirmation({ ...ent, t }, origine);
      mail = await envoyerUn({ a: e.email, nom: e.prenom + " " + e.nom, ...m });
      const me = mailEquipe(ent);
      await envoyerUn({ a: CONTACT, ...me, repondreA: { email: e.email, name: e.prenom } });
    }
    return json({ ok: true, entreprise: e.entreprise, lien: lienJeu(origine, 1, t), mail: mail ? mail.ok : false });
  }
  async function renvoyer(ex, origine) {
    if (!brevo()) return false;
    const r = await envoyerUn({ a: ex.email, nom: ex.prenom, ...mailConfirmation(ex, origine) });
    return r.ok;
  }

  async function lirePiece(req) {
    const url = new URL(req.url);
    const n = parseInt(url.searchParams.get("n"), 10);
    const etat = etatPiece(n, maintenant(req));
    if (!etat) return refus(404, "piece", "Cette pièce n'existe pas.");
    const t = url.searchParams.get("t");
    const ent = t ? await parJeton(t) : null;
    if (t && !ent) return refus(404, "lien", "Ce lien n'est pas reconnu. Vérifiez qu'il est complet, ou écrivez-nous.");
    const reponse = { etat, entreprise: ent ? ent.entreprise : null, referent: ent ? ent.prenom : null, essai };
    if (etat.ouverte) {
      const c = await contenu();
      reponse.piece = versionPublique(c.pieces[n]);
      if (ent) { const r = await S.lire(`r/${n}/${ent.id}`); reponse.mesReponses = r ? r.reponses : null; reponse.maj = r ? r.maj : null; }
    }
    return json(reponse);
  }

  async function repondre(req) {
    let d; try { d = await req.json(); } catch { return refus(400, "format", "Réponses illisibles."); }
    const n = parseInt(d.n, 10);
    const quand = maintenant(req);
    const etat = etatPiece(n, quand);
    if (!etat) return refus(404, "piece", "Cette pièce n'existe pas.");
    if (!etat.ouverte) return refus(400, "pas-ouverte", "Cette pièce n'est pas encore ouverte.");
    if (etat.close) return refus(400, "close", `Trop tard : les réponses étaient acceptées jusqu'au ${etat.limiteTexte}.`);
    const ent = await parJeton(d.t);
    if (!ent) return refus(403, "lien", "Seul le référent de l'entreprise peut envoyer les réponses, depuis son lien personnel.");
    const r = d.reponses || {};
    const reponses = { enigme: propre(r.enigme, 200), son: propre(r.son, 200), quiz: [0, 1, 2].map((i) => propre((r.quiz || [])[i], 200)), subsidiaire: n === 3 ? propre(r.subsidiaire, 20) : undefined };
    const avant = await S.lire(`r/${n}/${ent.id}`);
    await S.ecrire(`r/${n}/${ent.id}`, { id: ent.id, entreprise: ent.entreprise, reponses, premiere: avant ? avant.premiere : quand.toISOString(), maj: quand.toISOString(), versions: ((avant && avant.versions) || 0) + 1, manuel: avant ? avant.manuel : undefined });
    return json({ ok: true, maj: quand.toISOString(), limiteTexte: etat.limiteTexte });
  }

  async function equipe(req, chemin, origine) {
    const m = req.method;
    if (chemin === "bilan" && m === "GET") return json(await bilan(origine));
    if (chemin === "contenu" && m === "GET") return json(await contenu());
    let d = {}; if (m === "POST") { try { d = await req.json(); } catch { return refus(400, "format", "Corps illisible."); } }
    if (chemin === "contenu" && m === "POST") {
      if (!d.pieces || typeof d.pieces !== "object") return refus(400, "format", "Il faut { pieces: { 1: …, 2: …, 3: … } }.");
      const c = await contenu();
      for (const k of ["1", "2", "3"]) if (d.pieces[k]) c.pieces[k] = d.pieces[k];
      await S.ecrire("contenu", c);
      return json({ ok: true, pieces: Object.keys(c.pieces) });
    }
    if (chemin === "supprimer" && m === "POST") {
      // Droit à l'effacement : l'entreprise, son lien et toutes ses réponses disparaissent.
      const id = String(d.id || "").replace(/[^a-f0-9]/g, "");
      const e = id ? await S.lire("e/" + id) : null;
      if (!e) return refus(404, "inconnu", "Entreprise introuvable.");
      await S.supprimer("t/" + hacher(e.t));
      await S.supprimer("n/" + hacher(normaliser(e.entreprise).replace(/ /g, "")));
      for (const n of [1, 2, 3]) await S.supprimer(`r/${n}/${id}`);
      await S.supprimer("e/" + id);
      return json({ ok: true });
    }
    if (chemin === "modifier" && m === "POST") {
      // Retrait d'un accord (LinkedIn ou offres) à la demande de l'entreprise.
      const id = String(d.id || "").replace(/[^a-f0-9]/g, "");
      const e = id ? await S.lire("e/" + id) : null;
      if (!e) return refus(404, "inconnu", "Entreprise introuvable.");
      for (const k of ["linkedin", "offres"]) if (k in d) { e[k] = !!d[k]; e.accords = { ...(e.accords || {}), [k]: d[k] ? new Date().toISOString() : null, [k + "Retire"]: d[k] ? null : new Date().toISOString() }; }
      await S.ecrire("e/" + id, e);
      return json({ ok: true });
    }
    if (chemin === "valider" && m === "POST") {
      const cle = `r/${parseInt(d.n, 10)}/${String(d.id || "").replace(/[^a-f0-9]/g, "")}`;
      const r = await S.lire(cle);
      if (!r) return refus(404, "inconnu", "Réponse introuvable.");
      r.manuel = { ...(r.manuel || {}), [String(d.epreuve)]: Number(d.points) || 0 };
      await S.ecrire(cle, r);
      return json({ ok: true });
    }
    if (chemin === "envoyer" && m === "POST") {
      const n = parseInt(d.n, 10);
      if (!PIECES[n]) return refus(400, "piece", "Pièce inconnue.");
      if (!brevo()) return refus(400, "brevo", "L'envoi de mails n'est pas branché : il manque la clé Brevo sur Netlify.");
      const c = await contenu();
      const rappel = d.type === "rappel";
      let cibles = await entreprises();
      if (rappel) { const deja = new Set((await S.lister(`r/${n}/`)).map((k) => k.split("/")[2])); cibles = cibles.filter((e) => !deja.has(e.id)); }
      if (d.test) cibles = [{ ...(cibles[0] || { entreprise: "Entreprise test", prenom: "Test", t: "essai" }), email: propre(d.test, 120), prenom: "Test" }];
      if (d.ids) { const ids = new Set(d.ids); cibles = cibles.filter((e) => ids.has(e.id)); }
      if (!cibles.length) return json({ ok: true, envoyes: 0, echecs: [] });
      const versions = cibles.map((e) => { const mm = mailPiece(n, e, origine, rappel, c.pieces[n]); return { email: e.email, nom: e.prenom, html: mm.html, texte: mm.texte, sujet: mm.sujet }; });
      const r = await envoyerLot(versions, versions[0].sujet);
      if (!d.test) { const journal = (await S.lire("envois")) || []; journal.push({ n, type: rappel ? "rappel" : "piece", quand: new Date().toISOString(), envoyes: r.envoyes, echecs: r.echecs.length }); await S.ecrire("envois", journal); }
      return json({ ok: true, ...r });
    }
    if (chemin === "mail" && m === "POST") {
      // Mail libre (résultats, annonce) à toutes les entreprises ou à un test.
      if (!brevo()) return refus(400, "brevo", "L'envoi de mails n'est pas branché : il manque la clé Brevo sur Netlify.");
      const sujet = propre(d.sujet, 150); const corps = String(d.html || "").slice(0, 20000);
      if (!sujet || !corps) return refus(400, "format", "Sujet et texte obligatoires.");
      let cibles = d.test ? [{ email: propre(d.test, 120), prenom: "Test", entreprise: "Entreprise test" }] : await entreprises();
      const versions = cibles.map((e) => ({ email: e.email, nom: e.prenom, html: cadre(corps.replace(/\{prenom\}/g, h(e.prenom)).replace(/\{entreprise\}/g, h(e.entreprise))), texte: corps.replace(/<[^>]+>/g, " ") }));
      return json({ ok: true, ...(await envoyerLot(versions, sujet)) });
    }
    return refus(404, "inconnu", "Introuvable.");
  }

  async function gerer(req) {
    const url = new URL(req.url);
    const origine = url.origin.replace(/^http:/, "https:");
    const chemin = url.pathname.replace(/^\/api\/defi-noel\/?/, "").replace(/\/$/, "");
    const m = req.method;
    try {
      if (chemin === "inscription" && m === "POST") return await inscrire(req, origine);
      if (chemin === "piece" && m === "GET") return await lirePiece(req);
      if (chemin === "reponses" && m === "POST") return await repondre(req);
      if (chemin === "public" && m === "GET") { const l = await S.lister("e/"); return json({ inscrites: l.length, essai, fin: FIN_INSCRIPTIONS }); }
      if (chemin === "equipe/initialiser" && m === "POST") {
        if (await S.lire("code-equipe")) return refus(403, "deja", "Le code de l'équipe est déjà choisi.");
        let d; try { d = await req.json(); } catch { d = {}; }
        if (!d.code || String(d.code).length < 12) return refus(400, "code", "Le code doit faire 12 caractères au moins.");
        await S.ecrire("code-equipe", { hash: hacher(d.code), cree: new Date().toISOString() });
        return json({ ok: true });
      }
      if (chemin.startsWith("equipe/")) {
        if (!await equipeAutorisee(req)) { await new Promise((r) => setTimeout(r, 400)); return refus(401, "code", "Code de l'équipe incorrect."); }
        return await equipe(req, chemin.slice(7), origine);
      }
      return refus(404, "inconnu", "Introuvable.");
    } catch (e) {
      console.error("[defi-noel] erreur :", e && e.stack ? e.stack : e);
      return refus(500, "panne", "Un souci de notre côté. Réessayez dans un instant.");
    }
  }
  return { gerer };
}

var moteurs = {};
function contexteDe(hote) {
  return /--gamedoor41\.netlify\.app$/i.test(hote) || /^(localhost|127\.0\.0\.1)$/i.test(hote) ? "apercu" : "production";
}
async function gererDefi(req) {
  const ctx = contexteDe(new URL(req.url).hostname);
  if (!moteurs[ctx]) moteurs[ctx] = creerMoteur(ctx);
  return moteurs[ctx].gerer(req);
}
export { gererDefi, normaliser, correspond };
