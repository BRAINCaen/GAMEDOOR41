// Fichier construit par avent-src/construire.mjs — ne pas modifier à la main.
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

// avent-src/coeur.mjs
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

// avent-src/messages.mjs
var SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
var dateTexte = (j, annee = 2026) => SEMAINE[new Date(Date.UTC(annee, 11, j)).getUTCDay()] + " " + (j === 1 ? "1er" : j) + " d\xE9cembre";
var h = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var pad = (n) => String(n).padStart(2, "0");
var ADRESSE = "41 bis rue Pasteur, 14120 Mondeville";
var PAGE = "/calendrier-de-l-avent/";
var RETRAIT_JEUX = "28 f\xE9vrier 2027";
function habiller(titre, blocs, origine) {
  const corps = blocs.filter(Boolean).map((b) => b.cadre ? '<div style="margin:18px 0;padding:16px 18px;background:#fff6ec;border-left:5px solid #ff6b00;border-radius:6px;">' + b.cadre + "</div>" : '<p style="margin:0 0 14px;">' + b + "</p>").join("\n");
  return '<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f2efe9;"><div style="max-width:600px;margin:0 auto;padding:24px 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;"><div style="background:#0a0a0a;color:#fff;padding:20px 22px;border-radius:10px 10px 0 0;border-bottom:4px solid #ff6b00;"><div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#ff6b00;">Les 24 portes de GAMEDOOR\xB741</div><div style="font-size:22px;font-weight:bold;margin-top:6px;">' + h(titre) + '</div></div><div style="background:#ffffff;padding:22px;border-radius:0 0 10px 10px;">' + corps + '</div><p style="margin:14px 6px 0;font-size:12px;color:#777;">GAMEDOOR\xB741 \xB7 ' + h(ADRESSE) + ' \xB7 <a href="' + h(origine + PAGE) + '" style="color:#777;">le calendrier de l\u2019Avent</a></p></div></body></html>';
}
var QUOI = { quiz: "1 place de quiz", escape: "1 place d\u2019escape game", session: "1 session de quiz pour 4 \xE0 16 candidats, \xE9mission au choix" };
function mailGagnant({ prenom, tirage = "jour", jour, participants, lot, place, objet, code, suite = false, essai = false, origine = "https://gamedoor41.fr" }) {
  const ou = tirage === "grand" ? "du grand tirage" : tirage === "assidus" ? "du tirage des 24 portes ouvertes" : "de la porte " + jour + " (" + dateTexte(jour) + ")";
  const sujet = (essai ? "[ESSAI] " : "") + (suite ? "Votre code : " + (QUOI[place] || "votre lot") + " (calendrier de l\u2019Avent GAMEDOOR\xB741)" : "Bravo " + prenom + ", vous avez gagn\xE9 au calendrier de l\u2019Avent GAMEDOOR\xB741");
  const lignes = [], blocs = [];
  const dire = (texte, html) => {
    lignes.push(texte);
    blocs.push(html || h(texte));
  };
  dire("Bonjour " + prenom + ",");
  if (suite) dire("Comme promis, voici le code de votre lot " + ou + " de notre calendrier de l\u2019Avent.");
  else {
    dire("Bravo ! Le tirage au sort " + ou + " de notre calendrier de l\u2019Avent est tomb\xE9 sur vous" + (tirage === "jour" && participants > 1 ? ", parmi " + participants + " joueurs" : "") + ".");
    lignes.push("Votre lot : " + lot);
    blocs.push({ cadre: '<strong style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#b34a00;">Votre lot</strong><br><span style="font-size:19px;font-weight:bold;">' + h(lot) + "</span>" });
  }
  if (place && code) {
    lignes.push("Votre code : " + code);
    blocs.push({ cadre: '<strong style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#b34a00;">Votre code</strong><br><span style="font-size:26px;font-weight:bold;letter-spacing:2px;font-family:Consolas,Menlo,monospace;">' + h(code) + "</span>" });
    dire(
      "Ce code vous offre " + QUOI[place] + ". R\xE9servez sur gamedoor41.fr/reserver, puis saisissez-le au moment de r\xE9gler. Il est valable 12 mois.",
      "Ce code vous offre <strong>" + h(QUOI[place]) + '</strong>. R\xE9servez sur <a href="https://gamedoor41.fr/reserver/" style="color:#b34a00;">gamedoor41.fr/reserver</a>, puis saisissez-le au moment de r\xE9gler. Il est valable 12 mois.'
    );
  } else if (place && !suite) {
    dire("Le code de votre " + (place === "session" ? "session" : "place") + " vous arrive dans un second mail, sous 48 heures.");
  }
  if (objet && !suite) dire(
    "Votre cadeau, " + objet + ", vous attend \xE0 l\u2019accueil de GAMEDOOR\xB741, " + ADRESSE + ". Venez le chercher le jour de votre session, ou r\xE9pondez \xE0 ce mail pour nous dire quand vous passez. Il est \xE0 retirer avant le " + RETRAIT_JEUX + ".",
    "Votre cadeau, <strong>" + h(objet) + "</strong>, vous attend \xE0 l\u2019accueil de GAMEDOOR\xB741, " + h(ADRESSE) + ". Venez le chercher le jour de votre session, ou r\xE9pondez \xE0 ce mail pour nous dire quand vous passez. Il est \xE0 retirer avant le " + h(RETRAIT_JEUX) + "."
  );
  dire("Les lots ne sont ni \xE9changeables ni remboursables. Une question ? R\xE9pondez simplement \xE0 ce mail.");
  if (!suite && tirage === "jour" && jour < 24) dire("Et le calendrier continue : une nouvelle porte s\u2019ouvre chaque jour jusqu\u2019au 24 d\xE9cembre.");
  dire("\xC0 tr\xE8s vite,");
  dire("L\u2019\xE9quipe GAMEDOOR\xB741");
  return { sujet, texte: lignes.join("\n\n"), html: habiller(suite ? "Voici votre code" : "Vous avez gagn\xE9 !", blocs, origine) };
}
function mailAccuse({ prenom, essai = false, origine = "https://gamedoor41.fr" }) {
  const lignes = [
    "Bonjour " + prenom + ",",
    "Nous avons bien re\xE7u votre message au sujet du calendrier de l\u2019Avent. Nous vous r\xE9pondons sous 48 heures, par mail.",
    "En attendant, les r\xE9ponses aux questions les plus fr\xE9quentes (tirages, lots, tickets, portes en retard) sont en bas de la page du calendrier : " + origine + PAGE + "#av-questions",
    "\xC0 tr\xE8s vite,",
    "L\u2019\xE9quipe GAMEDOOR\xB741"
  ];
  const blocs = [
    h(lignes[0]),
    h(lignes[1]),
    'En attendant, les r\xE9ponses aux questions les plus fr\xE9quentes (tirages, lots, tickets, portes en retard) sont <a href="' + h(origine + PAGE + "#av-questions") + '" style="color:#b34a00;">en bas de la page du calendrier</a>.',
    h(lignes[3]),
    h(lignes[4])
  ];
  return { sujet: (essai ? "[ESSAI] " : "") + "Bien re\xE7u : votre message sur le calendrier de l\u2019Avent GAMEDOOR\xB741", texte: lignes.join("\n\n"), html: habiller("Message bien re\xE7u", blocs, origine) };
}
function mailQuestionEquipe({ prenom, email, message, fiche, essai = false, origine = "https://gamedoor41.fr" }) {
  const lignes = ["Question ou r\xE9clamation re\xE7ue sur le calendrier de l\u2019Avent.", "De : " + prenom + " <" + email + ">", fiche, "Message : \xAB " + message + " \xBB", "Pour r\xE9pondre : bouton \xAB R\xE9pondre \xBB de ce mail. La personne a d\xE9j\xE0 re\xE7u un accus\xE9 de r\xE9ception (r\xE9ponse promise sous 48 heures).", "Toutes les questions : " + origine + PAGE + "equipe/"];
  const blocs = [h(lignes[0]), "<strong>De :</strong> " + h(prenom) + " &lt;" + h(email) + "&gt;", h(fiche), { cadre: h(message).replace(/\n/g, "<br>") }, h(lignes[4]), '<a href="' + h(origine + PAGE + "equipe/") + '" style="color:#b34a00;">Voir toutes les questions dans l\u2019\xE9cran de l\u2019\xE9quipe</a>'];
  return { sujet: (essai ? "[ESSAI] " : "") + "[Avent] Question de " + prenom, texte: lignes.join("\n\n"), html: habiller("Une question \xE0 traiter", blocs, origine) };
}
function mailRapport({ jour, lignes, alertes, essai = false, origine = "https://gamedoor41.fr" }) {
  const quoi = jour > 24 ? "Tirages de fin" : "Porte " + jour;
  const sujet = (essai ? "[ESSAI] " : "") + "[Avent] " + quoi + (alertes.length ? " : " + alertes.length + " action" + (alertes.length > 1 ? "s" : "") + " \xE0 faire" : " : tout est parti tout seul");
  const texte = [quoi + " du calendrier de l\u2019Avent.", ...lignes, alertes.length ? "\xC0 FAIRE :\n- " + alertes.join("\n- ") : "Rien \xE0 faire.", "\xC9cran de l\u2019\xE9quipe : " + origine + PAGE + "equipe/"].join("\n\n");
  const blocs = [...lignes.map(h), alertes.length ? { cadre: '<strong style="color:#b00020;">\xC0 faire</strong><ul style="margin:8px 0 0;padding-left:20px;">' + alertes.map((a) => "<li>" + h(a) + "</li>").join("") + "</ul>" } : { cadre: '<strong style="color:#1f8f4a;">Rien \xE0 faire.</strong>' }, '<a href="' + h(origine + PAGE + "equipe/") + '" style="color:#b34a00;">Ouvrir l\u2019\xE9cran de l\u2019\xE9quipe</a>'];
  return { sujet, texte, html: habiller(quoi + (alertes.length ? " : \xE0 regarder" : " : tout est parti"), blocs, origine) };
}
var MOTS = "#calendrierdelavent #jeuconcours #concours #caen #mondeville #normandie #escapegame #quiz #gamedoor41";
var LIEN = "gamedoor41.fr/calendrier-de-l-avent";
var fin = (lot, signe) => /[?!.]$/.test(lot) ? "" : signe;
function legendeJour({ jour, lot, veille }) {
  const l = ["\u{1F384} Porte " + jour + " du calendrier de l\u2019Avent GAMEDOOR\xB741", "\u{1F381} \xC0 gagner aujourd\u2019hui : " + lot + fin(lot, "."), "Un d\xE9fi d\u2019une minute, une seule r\xE9ponse, et vous \xEAtes dans le tirage au sort de demain midi. Bonne ou mauvaise r\xE9ponse, tout le monde a sa chance."];
  if (veille && veille.gagnant) l.push("\u{1F3C6} Porte " + veille.jour + " : bravo \xE0 " + veille.gagnant + ", qui remporte " + veille.lot + fin(veille.lot, " !"));
  l.push("\u{1F449} Pour jouer : " + LIEN + " (lien dans notre bio). Jeu gratuit, jusqu\u2019au 24 d\xE9cembre.");
  l.push(MOTS);
  return l.join("\n\n");
}
function legendeFin({ veille, grand, assidus }) {
  const l = ["\u{1F384} Les 24 portes de GAMEDOOR\xB741 sont toutes ouvertes. Merci d\u2019avoir jou\xE9 avec nous tout le mois !"];
  if (veille && veille.gagnant) l.push("\u{1F3C6} Porte 24 : bravo \xE0 " + veille.gagnant + ", qui remporte " + veille.lot + fin(veille.lot, "."));
  if (grand && grand.gagnant) l.push("\u{1F697} Grand tirage : " + grand.gagnant + " remporte " + grand.lot + ".");
  if (assidus && assidus.gagnant) l.push("\u2B50 Tirage des 24 portes ouvertes : " + assidus.gagnant + " remporte " + assidus.lot + ".");
  l.push("Les gagnants ont re\xE7u un mail. Joyeux No\xEBl \xE0 toutes et \xE0 tous, et \xE0 tr\xE8s vite \xE0 Mondeville !");
  l.push(MOTS);
  return l.join("\n\n");
}
var quandParis = (annee, j, heure, minute = 0) => annee + "-12-" + pad(j) + "T" + pad(heure) + ":" + pad(minute) + ":00+01:00";

// avent-src/coeur.mjs
var ANNEE = 2026;
var NB_PORTES = 24;
var MAX_INSCRIPTIONS_PAR_IP = 8;
var MAX_QUESTIONS_PAR_IP = 3;
var MAX_ESSAIS_MAIL = 6;
var TYPES_CODES = ["quiz", "escape", "session"];
var UNIVERS = ["gav", "psy", "80s", "quiz", "final"];
var JETABLES = ["yopmail.com", "yopmail.fr", "mailinator.com", "guerrillamail.com", "sharklasers.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "trashmail.com", "mekuron.com", "getnada.com", "maildrop.cc", "throwawaymail.com", "mohmal.com", "emailondeck.com", "jetable.org", "tempr.email", "dispostable.com", "fakeinbox.com", "mailnesia.com"];
var hacher = (texte) => createHash("sha256").update(texte).digest("hex");
var pad2 = (n) => String(n).padStart(2, "0");
function parisDe(date) {
  const p = {};
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23" }).formatToParts(date).forEach((x) => {
    if (x.type !== "literal") p[x.type] = parseInt(x.value, 10);
  });
  return { annee: p.year, mois: p.month, jour: p.day, heure: p.hour };
}
function jourCalendrier(p) {
  if (p.annee < ANNEE || p.annee === ANNEE && p.mois < 12) return 0;
  if (p.annee > ANNEE) return 99;
  return p.jour;
}
function resultatVisible(j, quand) {
  if (quand.simule) return quand.cal > j;
  return quand.cal > j + 1 || quand.cal === j + 1 && quand.heure >= 12;
}
function normaliserEmail(brut) {
  const email = String(brut || "").trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return null;
  let [local, domaine] = email.split("@");
  if (domaine === "googlemail.com") domaine = "gmail.com";
  local = local.split("+")[0];
  if (domaine === "gmail.com") local = local.replace(/\./g, "");
  if (!local) return null;
  return { email, cle: local + "@" + domaine, domaine };
}
var idJoueur = (cle) => hacher("avent-" + ANNEE + "|" + cle).slice(0, 40);
function signer(id, secret) {
  return id + "." + createHmac("sha256", secret).update(id).digest("hex").slice(0, 32);
}
function lireJeton(jeton, secret) {
  const [id, sceau] = String(jeton || "").split(".");
  if (!/^[0-9a-f]{40}$/.test(id || "") || !sceau) return null;
  const attendu = Buffer.from(signer(id, secret));
  const recu = Buffer.from(id + "." + sceau);
  return attendu.length === recu.length && timingSafeEqual(attendu, recu) ? id : null;
}
function nettoyerPrenom(brut) {
  const p = String(brut || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
  return p.length >= 2 ? p : null;
}
function etiquetteGagnant(joueur) {
  const [local, domaine] = joueur.email.split("@");
  return joueur.prenom + " (" + local.slice(0, 2) + "\u2022\u2022\u2022@" + domaine.slice(0, 1) + "\u2022\u2022\u2022)";
}
function verifierDefis(defis) {
  if (!Array.isArray(defis) || defis.length !== NB_PORTES) return "Il faut exactement " + NB_PORTES + " d\xE9fis.";
  for (let i = 0; i < defis.length; i++) {
    const d = defis[i];
    const ou = "D\xE9fi " + (i + 1) + " : ";
    if (!d || d.j !== i + 1) return ou + "le num\xE9ro de jour ne suit pas.";
    if (!UNIVERS.includes(d.univers)) return ou + "univers inconnu.";
    for (const champ of ["titre", "intro", "question", "explication"]) if (typeof d[champ] !== "string" || !d[champ].trim()) return ou + "il manque \xAB " + champ + " \xBB.";
    if (d.type === "qcm") {
      if (!Array.isArray(d.choix) || d.choix.length < 2 || d.choix.length > 4) return ou + "il faut 2 \xE0 4 r\xE9ponses.";
      if (!Number.isInteger(d.bonne) || d.bonne < 0 || d.bonne >= d.choix.length) return ou + "la bonne r\xE9ponse n\u2019est pas dans la liste.";
    } else if (d.type === "code") {
      if (!/^\d{1,6}$/.test(d.code || "") || d.code.length !== d.longueur) return ou + "le code ne correspond pas \xE0 sa longueur.";
    } else return ou + "type inconnu.";
  }
  return null;
}
var SECRETS = ["bonne", "code", "explication", "prod"];
function defiPublic(d) {
  const v = {};
  Object.keys(d).forEach((k) => {
    if (!SECRETS.includes(k)) v[k] = d[k];
  });
  return v;
}
function corriger(d, reponse) {
  if (d.type === "qcm") return Number.isInteger(reponse) && reponse >= 0 && reponse < d.choix.length ? { ok: true, juste: reponse === d.bonne, reponse } : { ok: false };
  const texte = String(reponse == null ? "" : reponse);
  return /^\d+$/.test(texte) && texte.length === d.longueur ? { ok: true, juste: texte === d.code, reponse: texte } : { ok: false };
}
var texteBonne = (d) => d.type === "qcm" ? d.choix[d.bonne] : d.code;
function ticketsDe(joueur, estVisible) {
  let n = 0;
  Object.keys(joueur.reponses || {}).forEach((j) => {
    const r = joueur.reponses[j];
    n += 1 + (r.juste && r.leJour && estVisible(Number(j)) ? 1 : 0);
  });
  return n;
}
function vueJoueur(joueur, quand) {
  const reponses = {};
  let bonusEnAttente = 0;
  Object.keys(joueur.reponses || {}).forEach((j) => {
    const r = joueur.reponses[j];
    const visible = resultatVisible(Number(j), quand);
    reponses[j] = { reponse: r.reponse, leJour: r.leJour };
    if (visible) reponses[j].juste = r.juste;
    else if (r.leJour) bonusEnAttente++;
  });
  return { prenom: joueur.prenom, reponses, tickets: ticketsDe(joueur, (j) => resultatVisible(j, quand)), bonusEnAttente, nouvelles: !!joueur.nouvelles };
}
var ENTETES = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" };
var json = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: ENTETES });
var refus = (statut, code, message) => json({ erreur: code, message }, statut);
function creerMoteur({ stockage, maintenant = () => /* @__PURE__ */ new Date(), contexte = "production", lotsPrevus: lotsPrevus2 = {}, courrier: courrier2 = null, contact = "contact@gamedoor41.fr" }) {
  const essai = contexte !== "production";
  let secretCache = null;
  let tiragesCache = { quand: 0, valeurs: {} };
  let lotsCache = { quand: 0, valeurs: null };
  async function secret() {
    if (secretCache) return secretCache;
    let s = await stockage.lire("config/secret");
    if (!s) {
      await stockage.ecrire("config/secret", { hmac: randomBytes(32).toString("hex"), cree: maintenant().toISOString() }, { siAbsent: true });
      s = await stockage.lire("config/secret");
    }
    secretCache = s;
    return s;
  }
  async function defis() {
    return await stockage.lire("config/defis") || null;
  }
  async function lots() {
    const t = maintenant().getTime();
    if (lotsCache.valeurs && t - lotsCache.quand < 45e3) return lotsCache.valeurs;
    const saisis = await stockage.lire("config/lots") || {};
    const tout = {};
    Object.keys(lotsPrevus2).forEach((k) => {
      const p = lotsPrevus2[k];
      tout[k] = { lot: String(p.lot || ""), jeu: p.jeu || null, objet: p.objet || null, place: p.place || null };
    });
    Object.keys(saisis).forEach((k) => {
      if (saisis[k]) tout[k] = { ...tout[k] || { jeu: null, objet: null, place: null }, lot: String(saisis[k]) };
    });
    lotsCache = { quand: t, valeurs: tout };
    return tout;
  }
  function quandPour(req) {
    const p = parisDe(maintenant());
    const q = { cal: jourCalendrier(p), heure: p.heure, simule: false };
    const voulu = essai ? parseInt(req.headers.get("x-avent-jour") || "", 10) : NaN;
    if (Number.isInteger(voulu) && voulu >= 0 && voulu <= 26) {
      q.cal = voulu;
      q.heure = 13;
      q.simule = true;
    }
    return q;
  }
  async function tousLesJoueurs() {
    const cles = await stockage.lister("joueurs/");
    const sortie = [];
    for (let i = 0; i < cles.length; i += 25) {
      const lot = await Promise.all(cles.slice(i, i + 25).map((c) => stockage.lire(c)));
      lot.forEach((j) => {
        if (j && j.email) sortie.push(j);
      });
    }
    return sortie;
  }
  async function tirerJour(j, joueurs, exclus = []) {
    const candidats = joueurs.filter((x) => x.reponses && x.reponses[j] && x.reponses[j].leJour && !exclus.includes(x.id));
    const gagnant = candidats.length ? candidats[randomInt(candidats.length)] : null;
    return {
      cle: pad2(j),
      genre: "jour",
      jour: j,
      participants: candidats.length,
      tireLe: maintenant().toISOString(),
      gagnant: gagnant ? { id: gagnant.id, prenom: gagnant.prenom, email: gagnant.email, etiquette: etiquetteGagnant(gagnant) } : null,
      prevenu: false
    };
  }
  function tirerFinal(genre, joueurs) {
    const tout = () => true;
    let urne = [];
    if (genre === "grand") joueurs.forEach((x) => {
      const n = ticketsDe(x, tout);
      for (let i = 0; i < n; i++) urne.push(x);
    });
    else urne = joueurs.filter((x) => Object.keys(x.reponses || {}).length >= NB_PORTES);
    const gagnant = urne.length ? urne[randomInt(urne.length)] : null;
    return {
      cle: genre,
      genre,
      participants: genre === "grand" ? joueurs.filter((x) => Object.keys(x.reponses || {}).length).length : urne.length,
      billets: urne.length,
      tireLe: maintenant().toISOString(),
      gagnant: gagnant ? { id: gagnant.id, prenom: gagnant.prenom, email: gagnant.email, etiquette: etiquetteGagnant(gagnant) } : null,
      prevenu: false
    };
  }
  async function assurerTirages(quand) {
    if (quand.simule && !essai) return 0;
    const dus = [];
    for (let j = 1; j <= NB_PORTES; j++) if (resultatVisible(j, quand)) dus.push(pad2(j));
    if (resultatVisible(NB_PORTES, quand)) dus.push("grand", "assidus");
    if (!dus.length) return 0;
    const faits = new Set((await stockage.lister("tirages/")).map((c) => c.slice("tirages/".length)));
    const manquants = dus.filter((c) => !faits.has(c));
    const aRevoir = essai && quand.simule ? dus.filter((c) => faits.has(c)) : [];
    if (!manquants.length && !aRevoir.length) return 0;
    const joueurs = await tousLesJoueurs();
    const tirer = async (c) => /^\d\d$/.test(c) ? tirerJour(Number(c), joueurs) : tirerFinal(c, joueurs);
    let n = 0;
    for (const c of manquants) {
      if (await stockage.ecrire("tirages/" + c, await tirer(c), { siAbsent: true })) n++;
    }
    for (const c of aRevoir) {
      const vieux = await stockage.lire("tirages/" + c);
      if (!vieux || vieux.prevenu || vieux.lot || vieux.anciens && vieux.anciens.length) continue;
      const neuf = await tirer(c);
      const disparu = vieux.gagnant && !joueurs.some((x) => x.id === vieux.gagnant.id);
      if (neuf.participants !== vieux.participants || neuf.billets !== vieux.billets || disparu) {
        await stockage.ecrire("tirages/" + c, neuf);
        n++;
      }
    }
    tiragesCache = { quand: 0, valeurs: {} };
    return n;
  }
  async function tirages() {
    const t = maintenant().getTime();
    if (t - tiragesCache.quand < 45e3) return tiragesCache.valeurs;
    const cles = await stockage.lister("tirages/");
    const valeurs = {};
    (await Promise.all(cles.map((c) => stockage.lire(c)))).forEach((x) => {
      if (x) valeurs[x.cle] = x;
    });
    tiragesCache = { quand: t, valeurs };
    return valeurs;
  }
  async function reserve() {
    const r = await stockage.lire("config/codes") || {};
    TYPES_CODES.forEach((t) => {
      if (!Array.isArray(r[t])) r[t] = [];
    });
    if (!Array.isArray(r.donnes)) r.donnes = [];
    return r;
  }
  async function prendreCode(type, pour) {
    const r = await reserve();
    if (!r[type] || !r[type].length) return null;
    const code = r[type].shift();
    r.donnes.push({ code, type, pour, le: maintenant().toISOString() });
    await stockage.ecrire("config/codes", r);
    return code;
  }
  const cleLot = (cle) => /^\d\d$/.test(cle) ? String(Number(cle)) : cle;
  async function livrer(origine) {
    if (!courrier2) return { envoyes: 0, echecs: 0 };
    const prevus = await lots();
    let envoyes = 0, echecs = 0;
    for (const cleBlob of await stockage.lister("tirages/")) {
      const cle = cleBlob.slice("tirages/".length);
      let t = await stockage.lire(cleBlob);
      if (!t || !t.gagnant) continue;
      const p = prevus[cleLot(cle)] || {};
      const fait = !!(t.mail && t.mail.etat === "envoye");
      const codeEnRetard = fait && !!t.mail.sansCode;
      if (fait && !codeEnRetard || !t.mail && t.prevenu) continue;
      if (!fait && t.mail && t.mail.essais >= MAX_ESSAIS_MAIL) continue;
      if (codeEnRetard && (!p.place || !t.code && !(await reserve())[p.place].length)) continue;
      if (!await stockage.ecrire("verrous/lot-" + cle + "-" + Math.floor(maintenant().getTime() / 6e5), { le: maintenant().toISOString() }, { siAbsent: true })) continue;
      let code = t.code || null;
      if (!code && p.place) code = await prendreCode(p.place, cle);
      const message = mailGagnant({ prenom: t.gagnant.prenom, tirage: t.genre, jour: t.jour, participants: t.participants, lot: t.lot || p.lot || "votre lot", place: p.place, objet: p.objet, code, suite: codeEnRetard, essai, origine });
      const r = await courrier2.envoyer({ a: t.gagnant.email, nom: t.gagnant.prenom, ...message });
      t = await stockage.lire(cleBlob) || t;
      t.code = code;
      const essais = (t.mail && t.mail.essais || 0) + 1;
      const le = maintenant().toISOString();
      if (r.ok) {
        t.mail = { etat: "envoye", le, essais, sansCode: !!p.place && !code };
        t.prevenu = true;
        envoyes++;
      } else if (codeEnRetard) {
        t.mail = { ...t.mail, erreur: String(r.erreur || "inconnue").slice(0, 200) };
        echecs++;
      } else {
        t.mail = { etat: "echec", le, essais, erreur: String(r.erreur || "inconnue").slice(0, 200) };
        echecs++;
      }
      await stockage.ecrire(cleBlob, t);
    }
    tiragesCache = { quand: 0, valeurs: {} };
    return { envoyes, echecs };
  }
  function besoinsCodes(prevus, tir) {
    const besoin = { quiz: 0, escape: 0, session: 0 };
    Object.keys(prevus).forEach((k) => {
      const p = prevus[k], t = tir[/^\d+$/.test(k) ? pad2(Number(k)) : k];
      if (!p.place) return;
      if (!t) besoin[p.place]++;
      else if (t.gagnant && !t.code && !(!t.mail && t.prevenu)) besoin[p.place]++;
    });
    return besoin;
  }
  async function rapport(quand, origine, { force = false } = {}) {
    if (!courrier2) return false;
    let jour = 0;
    for (let j = 1; j <= NB_PORTES; j++) if (resultatVisible(j, quand)) jour = j;
    if (!jour) return false;
    const cle = pad2(jour);
    if (!force && !await stockage.ecrire("rapports/" + cle, { le: maintenant().toISOString() }, { siAbsent: true })) return false;
    tiragesCache.quand = 0;
    lotsCache.quand = 0;
    const [joueurs, tir, prevus, r, clesQuestions] = await Promise.all([tousLesJoueurs(), tirages(), lots(), reserve(), stockage.lister("questions/")]);
    const lignes = [], alertes = [];
    let leJour = 0, justes = 0;
    joueurs.forEach((x) => {
      const rep = x.reponses && x.reponses[jour];
      if (rep && rep.leJour) {
        leJour++;
        if (rep.juste) justes++;
      }
    });
    lignes.push("Porte " + jour + " (" + dateTexte(jour, ANNEE) + ") : " + leJour + " joueur" + (leJour > 1 ? "s" : "") + " le jour m\xEAme, " + justes + " bonne" + (justes > 1 ? "s" : "") + " r\xE9ponse" + (justes > 1 ? "s" : "") + ".");
    const dire = (nom, k) => {
      const t = tir[k], p = prevus[cleLot(k)] || {};
      if (!t) {
        alertes.push(nom + " : le tirage n\u2019a pas eu lieu. Ouvrez l\u2019\xE9cran de l\u2019\xE9quipe pour le relancer.");
        return;
      }
      if (!t.gagnant) {
        lignes.push(nom + " : pas de gagnant (aucun participant).");
        return;
      }
      const servi = t.mail && t.mail.etat === "envoye";
      lignes.push(nom + " : " + t.gagnant.prenom + " <" + t.gagnant.email + "> gagne " + (t.lot || p.lot || "son lot") + (t.code ? " \xB7 code " + t.code : "") + " \xB7 " + (servi ? "mail envoy\xE9" : t.prevenu ? "pr\xE9venu \xE0 la main" : "mail pas encore parti") + ".");
      if (p.objet) lignes.push("\xC0 mettre de c\xF4t\xE9 \xE0 l\u2019accueil pour " + t.gagnant.prenom + " : " + p.objet + ".");
      if (!servi && !t.prevenu) alertes.push(nom + " : le mail au gagnant n\u2019est pas parti" + (t.mail && t.mail.erreur ? " (" + t.mail.erreur + ")" : "") + ". " + (t.mail && t.mail.essais >= MAX_ESSAIS_MAIL ? "Les essais automatiques sont finis : utilisez \xAB \xC9crire au gagnant \xBB dans l\u2019\xE9cran de l\u2019\xE9quipe." : "Un nouvel essai part tout seul dans la demi-heure."));
      if (servi && t.mail.sansCode) alertes.push(nom + " : " + t.gagnant.prenom + " attend son code (" + p.place + "), la r\xE9serve est vide. Ajoutez des codes dans l\u2019\xE9cran de l\u2019\xE9quipe : il partira tout seul.");
    };
    dire("Gagnant de la porte " + jour, cle);
    if (jour === NB_PORTES) {
      dire("Grand tirage", "grand");
      dire("Tirage des 24 portes", "assidus");
    }
    lignes.push("Depuis le d\xE9but : " + joueurs.length + " inscrit" + (joueurs.length > 1 ? "s" : "") + ", " + joueurs.reduce((n, x) => n + Object.keys(x.reponses || {}).length, 0) + " participations, " + joueurs.filter((x) => x.nouvelles).length + " veulent nos nouvelles.");
    lignes.push("Codes en r\xE9serve : " + TYPES_CODES.map((t) => t + " " + r[t].length).join(", ") + ".");
    const besoin = besoinsCodes(prevus, tir);
    TYPES_CODES.forEach((t) => {
      if (r[t].length < besoin[t]) alertes.push("Il manque " + (besoin[t] - r[t].length) + " code" + (besoin[t] - r[t].length > 1 ? "s" : "") + " \xAB " + t + " \xBB pour finir le mois. \xC0 ajouter dans l\u2019\xE9cran de l\u2019\xE9quipe.");
    });
    const questions = (await Promise.all(clesQuestions.map((c) => stockage.lire(c)))).filter((q) => q && q.etat === "ouverte");
    if (questions.length) {
      lignes.push("Questions en attente : " + questions.length + ".");
      const vieilles = questions.filter((q) => maintenant().getTime() - new Date(q.le).getTime() > 48 * 36e5).length;
      if (vieilles) alertes.push(vieilles + " question" + (vieilles > 1 ? "s attendent" : " attend") + " une r\xE9ponse depuis plus de 48 heures.");
    }
    const envoi = await courrier2.envoyer({ a: contact, nom: "GAMEDOOR\xB741", ...mailRapport({ jour, lignes, alertes, essai, origine }) });
    if (!envoi.ok && !force) await stockage.supprimer("rapports/" + cle);
    return envoi.ok;
  }
  async function automate(quand, origine) {
    if (quand.cal < 1 || quand.cal > 60) return { tirages: 0, envoyes: 0, echecs: 0, rapport: false };
    const n = await assurerTirages(quand);
    const l = await livrer(origine);
    const b = await rapport(quand, origine);
    return { tirages: n, envoyes: l.envoyes, echecs: l.echecs, rapport: b };
  }
  async function joueurDuJeton(req) {
    const id = lireJeton(req.headers.get("x-avent-jeton"), (await secret()).hmac);
    return id ? await stockage.lire("joueurs/" + id) : null;
  }
  async function etat(req) {
    const quand = quandPour(req);
    const liste = await defis();
    if (!liste) return refus(503, "pas_pret", "Le calendrier n\u2019est pas encore pr\xEAt.");
    try {
      await assurerTirages(quand);
    } catch (e) {
      console.error("[avent] tirage impossible :", e && e.message);
    }
    const tir = await tirages();
    const prevus = await lots();
    const lotDe = (k) => prevus[k] && prevus[k].lot || null;
    const resultats = {};
    liste.forEach((d) => {
      if (!resultatVisible(d.j, quand)) return;
      const t = tir[pad2(d.j)];
      resultats[d.j] = { bonne: texteBonne(d), explication: d.explication, tire: !!t, gagnant: t && t.gagnant ? t.gagnant.etiquette : null, participants: t ? t.participants : null, lot: t && t.lot || lotDe(d.j) };
    });
    const finaux = {};
    ["grand", "assidus"].forEach((g) => {
      if (tir[g]) finaux[g] = { gagnant: tir[g].gagnant ? tir[g].gagnant.etiquette : null, lot: tir[g].lot || lotDe(g) };
    });
    const joueur = await joueurDuJeton(req);
    return json({
      cal: quand.cal,
      simule: quand.simule,
      essai,
      portes: liste.map((d) => ({ j: d.j, univers: d.univers, gros: !!d.gros, titre: d.j <= quand.cal ? d.titre : null, lot: lotDe(d.j), jeu: prevus[d.j] && prevus[d.j].jeu || null })),
      lotsFinaux: { grand: lotDe("grand"), assidus: lotDe("assidus") },
      resultats,
      finaux,
      moi: joueur ? vueJoueur(joueur, quand) : null
    });
  }
  async function defi(req, url) {
    const quand = quandPour(req);
    const j = parseInt(url.searchParams.get("j") || "", 10);
    const liste = await defis();
    if (!liste) return refus(503, "pas_pret", "Le calendrier n\u2019est pas encore pr\xEAt.");
    const d = liste.find((x) => x.j === j);
    if (!d) return refus(404, "inconnu", "Cette porte n\u2019existe pas.");
    if (j > quand.cal) return refus(403, "fermee", "Cette porte n\u2019est pas encore ouverte.");
    return json({ defi: defiPublic(d) });
  }
  async function jouer(req, ip) {
    const quand = quandPour(req);
    let corps;
    try {
      corps = await req.json();
    } catch (_) {
      return refus(400, "illisible", "Demande illisible.");
    }
    const j = parseInt(corps && corps.j, 10);
    if (!Number.isInteger(j) || j < 1 || j > NB_PORTES) return refus(400, "porte", "Cette porte n\u2019existe pas.");
    if (quand.cal < 1) return refus(403, "pas_commence", "Le calendrier commence le 1er d\xE9cembre.");
    if (quand.cal > NB_PORTES) return refus(403, "termine", "Le calendrier est termin\xE9.");
    if (j > quand.cal) return refus(403, "fermee", "Cette porte n\u2019est pas encore ouverte.");
    const liste = await defis();
    const d = liste && liste.find((x) => x.j === j);
    if (!d) return refus(503, "pas_pret", "Le calendrier n\u2019est pas encore pr\xEAt.");
    const corrige = corriger(d, corps.reponse);
    if (!corrige.ok) return refus(400, "reponse", "Cette r\xE9ponse n\u2019est pas valable.");
    const s = await secret();
    let id = lireJeton(req.headers.get("x-avent-jeton"), s.hmac);
    let joueur = id ? await stockage.lire("joueurs/" + id) : null;
    if (!joueur) {
      const mail = normaliserEmail(corps.email);
      const prenom = nettoyerPrenom(corps.prenom);
      if (!mail || !prenom) return refus(401, "inscription", "Indiquez votre pr\xE9nom et votre adresse mail.");
      if (JETABLES.includes(mail.domaine)) return refus(400, "email_jetable", "Les adresses mail temporaires ne sont pas accept\xE9es.");
      id = idJoueur(mail.cle);
      joueur = await stockage.lire("joueurs/" + id);
      if (!joueur) {
        if (corps.reglement !== true) return refus(400, "reglement", "Cochez la case du r\xE8glement pour participer.");
        const cleIp = "limites/" + ANNEE + "-" + pad2(quand.cal) + "/" + hacher(s.hmac + "|" + (ip || "inconnue")).slice(0, 24);
        const compteur = await stockage.lire(cleIp) || { n: 0 };
        if (compteur.n >= MAX_INSCRIPTIONS_PAR_IP) return refus(429, "trop", "Trop d\u2019inscriptions depuis cette connexion aujourd\u2019hui. R\xE9essayez demain.");
        await stockage.ecrire(cleIp, { n: compteur.n + 1 });
        joueur = { id, prenom, email: mail.email, nouvelles: corps.nouvelles === true, reglement: maintenant().toISOString(), inscritLe: maintenant().toISOString(), inscritJour: quand.cal, reponses: {} };
      } else if (corps.nouvelles === true) joueur.nouvelles = true;
    }
    if (joueur.reponses[j]) return json({ erreur: "deja_joue", message: "Vous avez d\xE9j\xE0 jou\xE9 cette porte.", jeton: signer(joueur.id, s.hmac), moi: vueJoueur(joueur, quand) }, 409);
    joueur.reponses[j] = { reponse: corrige.reponse, juste: corrige.juste, leJour: j === quand.cal, quand: maintenant().toISOString() };
    await stockage.ecrire("joueurs/" + joueur.id, joueur);
    return json({ ok: true, jeton: signer(joueur.id, s.hmac), moi: vueJoueur(joueur, quand) });
  }
  async function question(req, ip, origine) {
    let corps;
    try {
      corps = await req.json();
    } catch (_) {
      return refus(400, "illisible", "Demande illisible.");
    }
    corps = corps || {};
    if (corps.site) return json({ ok: true });
    const mail = normaliserEmail(corps.email), prenom = nettoyerPrenom(corps.prenom);
    const message = String(corps.message || "").replace(/[\u0000-\u0008\u000b-\u001f<>]/g, "").trim().slice(0, 2e3);
    if (!mail || !prenom) return refus(400, "identite", "Indiquez votre pr\xE9nom et votre adresse mail.");
    if (JETABLES.includes(mail.domaine)) return refus(400, "email_jetable", "Les adresses mail temporaires ne sont pas accept\xE9es.");
    if (message.length < 10) return refus(400, "court", "Votre message est trop court pour que nous puissions vous r\xE9pondre.");
    const s = await secret(), p = parisDe(maintenant());
    const jourCle = p.annee + pad2(p.mois) + pad2(p.jour);
    const cleIp = "limites/q-" + jourCle + "/" + hacher(s.hmac + "|" + (ip || "inconnue")).slice(0, 24);
    const cleMail = "limites/q-" + jourCle + "/m-" + hacher(s.hmac + "|" + mail.cle).slice(0, 24);
    const [parIp, parMail] = await Promise.all([stockage.lire(cleIp), stockage.lire(cleMail)]);
    if (parIp && parIp.n >= MAX_QUESTIONS_PAR_IP || parMail && parMail.n >= MAX_QUESTIONS_PAR_IP) return refus(429, "trop", "Vous nous avez d\xE9j\xE0 \xE9crit plusieurs fois aujourd\u2019hui. Nous vous r\xE9pondons sous 48 heures.");
    await Promise.all([stockage.ecrire(cleIp, { n: (parIp && parIp.n || 0) + 1 }), stockage.ecrire(cleMail, { n: (parMail && parMail.n || 0) + 1 })]);
    const id = maintenant().getTime().toString(36) + randomBytes(3).toString("hex");
    const idJ = idJoueur(mail.cle);
    const joueur = await stockage.lire("joueurs/" + idJ);
    let fiche = "Cette adresse n\u2019est pas inscrite au jeu.";
    if (joueur) {
      const gains = Object.values(await tirages()).filter((t) => t.gagnant && t.gagnant.id === idJ).map((t) => t.genre === "jour" ? "porte " + t.jour : t.genre === "grand" ? "grand tirage" : "tirage des 24 portes");
      fiche = "Inscrit\xB7e le " + String(joueur.inscritLe || "").slice(0, 10) + ", " + Object.keys(joueur.reponses || {}).length + " porte(s) ouverte(s)" + (gains.length ? ", a gagn\xE9 : " + gains.join(", ") : ", n\u2019a pas gagn\xE9 pour le moment") + ".";
    }
    const q = { id, prenom, email: mail.email, message, le: maintenant().toISOString(), etat: "ouverte", fiche, accuse: false };
    await stockage.ecrire("questions/" + id, q);
    if (courrier2) {
      await courrier2.envoyer({ a: contact, nom: "GAMEDOOR\xB741", repondreA: { email: mail.email, name: prenom }, ...mailQuestionEquipe({ prenom, email: mail.email, message, fiche, essai, origine }) });
      const r = await courrier2.envoyer({ a: mail.email, nom: prenom, ...mailAccuse({ prenom, essai, origine }) });
      if (r.ok) {
        q.accuse = true;
        await stockage.ecrire("questions/" + id, q);
      }
    }
    return json({ ok: true });
  }
  async function annonces(req, origine) {
    const quand = quandPour(req);
    const liste = await defis();
    if (!liste) return refus(503, "pas_pret", "Le calendrier n\u2019est pas encore pr\xEAt.");
    try {
      await assurerTirages(quand);
    } catch (e) {
      console.error("[avent] tirage impossible :", e && e.message);
    }
    const tir = await tirages();
    const prevus = await lots();
    const lotDe = (k) => prevus[k] && prevus[k].lot || "";
    const gagne = (k, jour) => {
      const t = tir[k];
      return t ? { jour, gagnant: t.gagnant ? t.gagnant.etiquette : null, lot: t.lot || lotDe(cleLot(k)) } : null;
    };
    const image = (nom) => origine + "/img/avent/" + nom + ".jpg";
    const reseaux = ["instagram", "facebook"];
    const publications = [];
    for (let j = 1; j <= NB_PORTES; j++) {
      publications.push({ id: "avent" + ANNEE + "-story-" + pad2(j), jour: j, format: "story", reseaux, quand: quandParis(ANNEE, j, 8, 0), image: image("story-" + pad2(j)), texte: "Porte " + j + " du calendrier de l\u2019Avent : \xE0 gagner aujourd\u2019hui, " + lotDe(j) + ".", pret: true });
      publications.push({ id: "avent" + ANNEE + "-post-" + pad2(j), jour: j, format: "post", reseaux, quand: quandParis(ANNEE, j, 12, 15), image: image("post-" + pad2(j)), texte: legendeJour({ jour: j, lot: lotDe(j), veille: j > 1 ? gagne(pad2(j - 1), j - 1) : null }), pret: j === 1 || !!tir[pad2(j - 1)] });
    }
    publications.push({ id: "avent" + ANNEE + "-post-25", jour: 25, format: "post", reseaux, quand: quandParis(ANNEE, 25, 12, 15), image: image("post-25"), texte: legendeFin({ veille: gagne(pad2(NB_PORTES), NB_PORTES), grand: gagne("grand"), assidus: gagne("assidus") }), pret: !!(tir[pad2(NB_PORTES)] && tir.grand && tir.assidus) });
    return json({ cal: quand.cal, essai, maintenant: maintenant().toISOString(), publications });
  }
  async function effacerEssai(req) {
    if (!essai) return refus(404, "inconnu", "Introuvable.");
    const j = await joueurDuJeton(req);
    if (j) await stockage.supprimer("joueurs/" + j.id);
    return json({ ok: true });
  }
  async function equipeAutorisee(req) {
    const s = await secret();
    const code = req.headers.get("x-avent-code") || "";
    if (!s.codeHash || !code) return false;
    const a = Buffer.from(hacher(s.hmac + "|" + code)), b = Buffer.from(s.codeHash);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  async function initialiser(req) {
    const s = await secret();
    if (s.codeHash) return refus(409, "deja", "Le code de l\u2019\xE9quipe existe d\xE9j\xE0.");
    let corps;
    try {
      corps = await req.json();
    } catch (_) {
      corps = {};
    }
    const code = String(corps && corps.code || "");
    if (code.length < 12) return refus(400, "court", "Code trop court (12 caract\xE8res au moins).");
    const neuf = { ...s, codeHash: hacher(s.hmac + "|" + code) };
    await stockage.ecrire("config/secret", neuf);
    secretCache = neuf;
    return json({ ok: true });
  }
  async function bilan(req, origine) {
    const quand = quandPour(req);
    lotsCache.quand = 0;
    try {
      await assurerTirages(quand);
      await livrer(origine);
    } catch (e) {
      console.error("[avent] remise des lots impossible :", e && e.message);
    }
    const [joueurs, liste, prevus] = await Promise.all([tousLesJoueurs(), defis(), lots()]);
    const textes = {};
    Object.keys(prevus).forEach((k) => {
      textes[k] = prevus[k].lot;
    });
    tiragesCache.quand = 0;
    const tir = await tirages();
    const r = await reserve();
    const questions = (await Promise.all((await stockage.lister("questions/")).map((c) => stockage.lire(c)))).filter(Boolean);
    const jours = [];
    for (let j = 1; j <= NB_PORTES; j++) {
      let joues = 0, leJour = 0, justes = 0;
      joueurs.forEach((x) => {
        const r2 = x.reponses && x.reponses[j];
        if (r2) {
          joues++;
          if (r2.leJour) leJour++;
          if (r2.juste) justes++;
        }
      });
      const d = liste && liste.find((x) => x.j === j);
      jours.push({ j, titre: d ? d.titre : "", univers: d ? d.univers : "", gros: !!(d && d.gros), joues, leJour, justes, lot: textes[j] || "", tirage: tir[pad2(j)] || null });
    }
    return json({
      cal: quand.cal,
      essai,
      pret: !!liste,
      inscrits: joueurs.length,
      actifs: joueurs.filter((x) => Object.keys(x.reponses || {}).length).length,
      nouvelles: joueurs.filter((x) => x.nouvelles).length,
      assidus: joueurs.filter((x) => Object.keys(x.reponses || {}).length >= NB_PORTES).length,
      participations: joueurs.reduce((n, x) => n + Object.keys(x.reponses || {}).length, 0),
      jours,
      finaux: { grand: tir.grand || null, assidus: tir.assidus || null },
      lots: textes,
      courrier: !!courrier2,
      contact,
      codes: Object.fromEntries(TYPES_CODES.map((t) => [t, r[t].length])),
      codesDonnes: r.donnes.length,
      besoins: besoinsCodes(prevus, tir),
      questions: questions.sort((a, b) => a.le < b.le ? 1 : -1).slice(0, 100)
    });
  }
  async function ajouterCodes(corps) {
    const type = String(corps.type || "");
    if (!TYPES_CODES.includes(type)) return refus(400, "type", "Genre de code inconnu.");
    const r = await reserve();
    const connus = /* @__PURE__ */ new Set([...TYPES_CODES.flatMap((t) => r[t]), ...r.donnes.map((d) => d.code)]);
    const recus = String(corps.codes || "").split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean);
    const refuses = recus.filter((c) => !/^[A-Za-z0-9_-]{3,40}$/.test(c));
    let ajoutes = 0;
    recus.forEach((c) => {
      if (/^[A-Za-z0-9_-]{3,40}$/.test(c) && !connus.has(c)) {
        connus.add(c);
        r[type].push(c);
        ajoutes++;
      }
    });
    if (corps.vider === true) r[type] = [];
    await stockage.ecrire("config/codes", r);
    return json({ ok: true, ajoutes, refuses: refuses.slice(0, 10), codes: Object.fromEntries(TYPES_CODES.map((t) => [t, r[t].length])) });
  }
  async function equipeEcrire(req, action, origine) {
    let corps;
    try {
      corps = await req.json();
    } catch (_) {
      return refus(400, "illisible", "Demande illisible.");
    }
    if (action === "defis") {
      const souci = verifierDefis(corps.defis);
      if (souci) return refus(400, "defis", souci);
      await stockage.ecrire("config/defis", corps.defis);
      return json({ ok: true, nombre: corps.defis.length });
    }
    if (action === "lots") {
      const saisis = {};
      Object.keys(corps.lots || {}).forEach((k) => {
        if (/^(\d{1,2}|grand|assidus)$/.test(k)) saisis[k] = String(corps.lots[k] || "").slice(0, 200);
      });
      await stockage.ecrire("config/lots", saisis);
      lotsCache = { quand: 0, valeurs: null };
      return json({ ok: true });
    }
    if (action === "tirage") {
      const cle = /^(grand|assidus)$/.test(corps.cle) ? corps.cle : pad2(parseInt(corps.cle, 10));
      const actuel = await stockage.lire("tirages/" + cle);
      if (!actuel) return refus(404, "absent", "Ce tirage n\u2019a pas encore eu lieu.");
      if (corps.action === "prevenu") actuel.prevenu = corps.valeur !== false;
      else if (corps.action === "lot") actuel.lot = String(corps.valeur || "").slice(0, 200);
      else if (corps.action === "retirer") {
        const joueurs = await tousLesJoueurs();
        const anciens = (actuel.anciens || []).concat(actuel.gagnant ? [{ ...actuel.gagnant, remplaceLe: maintenant().toISOString(), raison: String(corps.raison || "").slice(0, 200) }] : []);
        const neuf = actuel.genre === "jour" ? await tirerJour(actuel.jour, joueurs, anciens.map((a) => a.id)) : tirerFinal(actuel.genre, joueurs.filter((x) => !anciens.some((a) => a.id === x.id)));
        Object.assign(actuel, { gagnant: neuf.gagnant, tireLe: neuf.tireLe, prevenu: false, anciens, mail: null, code: null });
      } else return refus(400, "action", "Action inconnue.");
      await stockage.ecrire("tirages/" + cle, actuel);
      tiragesCache = { quand: 0, valeurs: {} };
      return json({ ok: true, tirage: actuel });
    }
    if (action === "codes") return ajouterCodes(corps);
    if (action === "question") {
      const q = await stockage.lire("questions/" + String(corps.id || "").replace(/[^a-z0-9]/g, ""));
      if (!q) return refus(404, "absent", "Question introuvable.");
      q.etat = corps.etat === "ouverte" ? "ouverte" : "traitee";
      q.traiteeLe = q.etat === "traitee" ? maintenant().toISOString() : null;
      await stockage.ecrire("questions/" + q.id, q);
      return json({ ok: true });
    }
    if (action === "rapport") {
      if (!courrier2) return refus(409, "sans_courrier", "L\u2019envoi des mails n\u2019est pas branch\xE9 sur ce site.");
      const ok = await rapport(quandPour(req), origine, { force: true });
      return ok ? json({ ok: true, a: contact }) : refus(409, "rien", "Rien \xE0 envoyer : aucun tirage n\u2019a encore eu lieu, ou l\u2019envoi a \xE9chou\xE9.");
    }
    return refus(404, "inconnu", "Introuvable.");
  }
  async function exporter() {
    const joueurs = await tousLesJoueurs();
    const lignes = ["prenom;email;portes_ouvertes;inscrit_le"];
    joueurs.filter((x) => x.nouvelles).forEach((x) => lignes.push([x.prenom.replace(/[;"\r\n]/g, " "), x.email, Object.keys(x.reponses || {}).length, (x.inscritLe || "").slice(0, 10)].join(";")));
    return new Response("\uFEFF" + lignes.join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="avent-2026-nouvelles.csv"', "cache-control": "no-store" } });
  }
  async function gerer(req, { ip } = {}) {
    const url = new URL(req.url);
    const origine = url.origin;
    const chemin = url.pathname.replace(/^\/api\/avent\/?/, "").replace(/\/+$/, "");
    const m = req.method;
    try {
      if (chemin === "etat" && m === "GET") return await etat(req);
      if (chemin === "defi" && m === "GET") return await defi(req, url);
      if (chemin === "jouer" && m === "POST") return await jouer(req, ip);
      if (chemin === "question" && m === "POST") return await question(req, ip, origine);
      if (chemin === "annonces" && m === "GET") return await annonces(req, origine);
      if (chemin === "essai/effacer" && m === "POST") return await effacerEssai(req);
      if (chemin === "equipe/initialiser" && m === "POST") return await initialiser(req);
      if (chemin.startsWith("equipe/")) {
        if (!await equipeAutorisee(req)) {
          await new Promise((r) => setTimeout(r, 400));
          return refus(401, "code", "Code de l\u2019\xE9quipe incorrect.");
        }
        if (chemin === "equipe/bilan" && m === "GET") return await bilan(req, origine);
        if (chemin === "equipe/defis" && m === "GET") return json({ defis: await defis() });
        if (chemin === "equipe/export" && m === "GET") return await exporter();
        if (m === "POST") return await equipeEcrire(req, chemin.slice("equipe/".length), origine);
      }
      return refus(404, "inconnu", "Introuvable.");
    } catch (e) {
      console.error("[avent] erreur :", e && e.stack ? e.stack : e);
      return refus(500, "panne", "Un souci de notre c\xF4t\xE9. R\xE9essayez dans un instant.");
    }
  }
  return { gerer, assurerTirages, livrer, automate, quandReel: () => {
    const p = parisDe(maintenant());
    return { cal: jourCalendrier(p), heure: p.heure, simule: false };
  } };
}

// avent-src/stockage.mjs
function stockageNetlify(nom) {
  let store = null;
  const magasin = async () => {
    if (!store) {
      const { getStore: getStore2 } = await Promise.resolve().then(() => (init_main3(), main_exports));
      store = getStore2({ name: nom, consistency: "strong" });
    }
    return store;
  };
  return {
    async lire(cle) {
      return (await magasin()).get(cle, { type: "json" });
    },
    async ecrire(cle, val, { siAbsent = false } = {}) {
      const r = await (await magasin()).setJSON(cle, val, siAbsent ? { onlyIfNew: true } : void 0);
      return siAbsent ? !!(r && r.modified) : true;
    },
    async supprimer(cle) {
      await (await magasin()).delete(cle);
    },
    async lister(prefixe) {
      const { blobs } = await (await magasin()).list({ prefix: prefixe });
      return blobs.map((b) => b.key).sort();
    }
  };
}

// avent-src/lots-2026.mjs
var ETOILES = [6, 13, 20, 24];
var PLACE_QUIZ = "1 place de quiz";
var PLACE_ESCAPE = "1 place d\u2019escape game";
var JEUX = {
  1: { univers: "gav", nom: "Dossiers Criminels Pocket", sous: "Qui a tu\xE9 Isabella Vega ?", court: "Dossiers Criminels Pocket", detail: "Une enqu\xEAte de poche : des indices, des suspects, un coupable \xE0 d\xE9masquer." },
  4: { univers: "psy", nom: "Black Stories", court: "Black Stories", detail: "50 \xE9nigmes macabres \xE0 r\xE9soudre en posant des questions. R\xE9ponses permises : oui ou non." },
  6: { univers: "quiz", nom: "Esquiss\xE9 ?", sous: "Version 6 joueurs", court: "Esquiss\xE9 ?", detail: "Le t\xE9l\xE9phone arabe en dessin : on dessine, on devine, et tout d\xE9rape." },
  7: { univers: "80s", nom: "E.T. l\u2019Extra-Terrestre", court: "E.T. l\u2019Extra-Terrestre", detail: "Jeu d\u2019aventure coop\xE9ratif : aidez E.T. \xE0 rentrer chez lui avant les agents. 2 \xE0 4 joueurs, d\xE8s 10 ans, 30 minutes." },
  10: { univers: "quiz", nom: "Snort Funny", sous: "Le jeu \xAB ingroinyable \xBB", court: "Snort Funny", detail: "Un jeu d\u2019ambiance pour faire rire toute la table." },
  13: { univers: "gav", nom: "Sous Scell\xE9s", sous: "La Fille du Troisi\xE8me", court: "Sous Scell\xE9s : La Fille du Troisi\xE8me", detail: "Un dossier d\u2019enqu\xEAte \xE0 ouvrir chez vous : \xE0 vous de r\xE9soudre l\u2019affaire." },
  15: { univers: "80s", nom: "Retour vers le futur", court: "Retour vers le futur", detail: "Jeu d\u2019aventure coop\xE9ratif : faites monter la DeLorean \xE0 88 miles \xE0 l\u2019heure avant l\u2019\xE9clair. 2 \xE0 4 joueurs, d\xE8s 10 ans, 50 minutes." },
  16: { univers: "psy", nom: "Scream, le jeu", court: "Scream, le jeu", detail: "Jeu de soci\xE9t\xE9 coop\xE9ratif : faites \xE9quipe pour \xE9chapper au tueur masqu\xE9." },
  18: { univers: "quiz", nom: "Longueur d\u2019onde", court: "Longueur d\u2019onde", detail: "Jeu d\u2019ambiance en \xE9quipes : \xEAtes-vous sur la m\xEAme longueur d\u2019onde que vos amis ?" },
  20: { univers: "psy", nom: "Chucky, le jeu", court: "Chucky, le jeu", detail: "Jeu d\u2019horreur coop\xE9ratif : tous ensemble contre la poup\xE9e." },
  23: { univers: "80s", nom: "The Goonies", sous: "Ne disent jamais mourir", court: "The Goonies", detail: "Jeu d\u2019aventure : un joueur dirige les ennemis, les autres incarnent les Goonies. 2 \xE0 5 joueurs, d\xE8s 12 ans, 50 minutes." }
};
var FINAUX = {
  grand: { quand: "Le grand tirage", nom: "Une DeLorean radio-command\xE9e", lot: "la DeLorean radio-command\xE9e de Retour vers le futur", detail: "La voiture de Retour vers le futur, \xE0 piloter \xE0 la t\xE9l\xE9commande. Chaque ticket gagn\xE9 pendant le mois est une chance de plus." },
  assidus: { quand: "Les 24 portes ouvertes", nom: "Une session de quiz compl\xE8te", lot: "1 session de quiz pour 4 \xE0 16 candidats, \xE9mission au choix", detail: "Un tirage r\xE9serv\xE9 \xE0 celles et ceux qui ont ouvert les 24 portes : une session de quiz offerte pour 4 \xE0 16 candidats, \xE9mission au choix." }
};
function lotsPrevus() {
  const lots = {};
  for (let j = 1; j <= 24; j++) {
    const place = ETOILES.includes(j) ? PLACE_ESCAPE : PLACE_QUIZ;
    const jeu = JEUX[j];
    lots[j] = { lot: jeu ? place + " + le jeu " + jeu.court : place, jeu: jeu ? jeu.court : null, objet: jeu ? "le jeu " + jeu.court : null, place: ETOILES.includes(j) ? "escape" : "quiz" };
  }
  lots.grand = { lot: FINAUX.grand.lot, jeu: null, objet: FINAUX.grand.lot, place: null };
  lots.assidus = { lot: FINAUX.assidus.lot, jeu: null, objet: null, place: "session" };
  return lots;
}

// avent-src/courrier.mjs
function courrierBrevo({ cle, expediteur, repondre, envoi = fetch }) {
  return {
    async envoyer({ a, nom, sujet, texte, html, repondreA }) {
      try {
        const r = await envoi("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sender: expediteur, to: [{ email: a, name: nom || void 0 }], replyTo: repondreA || repondre || expediteur, subject: sujet, textContent: texte, htmlContent: html, tags: ["avent-2026"] }),
          signal: AbortSignal.timeout(1e4)
        });
        if (r.ok) return { ok: true };
        return { ok: false, erreur: "Brevo " + r.status + " " + (await r.text()).slice(0, 160) };
      } catch (e) {
        return { ok: false, erreur: String(e && e.message || e).slice(0, 160) };
      }
    }
  };
}

// avent-src/entree.mjs
var SITE = "https://gamedoor41.fr";
var CONTACT = process.env.AVENT_CONTACT || "contact@gamedoor41.fr";
function courrier() {
  const cle = process.env.BREVO_API_KEY;
  return cle ? courrierBrevo({ cle, expediteur: { name: "GAMEDOOR\xB741", email: process.env.AVENT_EXPEDITEUR || CONTACT }, repondre: { name: "GAMEDOOR\xB741", email: CONTACT } }) : null;
}
function contexteDe(hote) {
  return /--gamedoor41\.netlify\.app$/i.test(hote) || /^(localhost|127\.0\.0\.1)$/i.test(hote) ? "apercu" : "production";
}
var moteurs = {};
function moteur(contexte) {
  if (!moteurs[contexte]) moteurs[contexte] = creerMoteur({ contexte, lotsPrevus: lotsPrevus(), courrier: courrier(), contact: CONTACT, stockage: stockageNetlify(contexte === "production" ? "avent-2026" : "avent-2026-apercu") });
  return moteurs[contexte];
}
async function gererAvent(req, context) {
  const contexte = contexteDe(new URL(req.url).hostname);
  return moteur(contexte).gerer(req, { ip: context && context.ip });
}
async function tirageDuJour() {
  const m = moteur("production");
  const r = await m.automate(m.quandReel(), SITE);
  if (r.tirages || r.envoyes || r.echecs) console.log("[avent] tirages : " + r.tirages + ", lots envoy\xE9s : " + r.envoyes + ", envois rat\xE9s : " + r.echecs);
  return r;
}
export {
  contexteDe,
  gererAvent,
  tirageDuJour
};
