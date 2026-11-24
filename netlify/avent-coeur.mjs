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
      const { Deno, Netlify, process } = globalThis;
      return Netlify?.env ?? Deno?.env ?? {
        delete: (key) => delete process?.env[key],
        get: (key) => process?.env[key],
        has: (key) => Boolean(process?.env[key]),
        set: (key, value) => {
          if (process?.env) {
            process.env[key] = value;
          }
        },
        toObject: () => process?.env ?? {}
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
    fetchAndRetry = async (fetch, url, options, attemptsLeft = MAX_RETRY, getRetryUrl) => {
      try {
        const res = await fetch(url, options);
        const isRetryable = res.status === 429 || res.status >= 500 || getRetryUrl !== void 0 && res.status === 403;
        if (attemptsLeft > 0 && isRetryable) {
          await discardBody(res);
          const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
          await sleep(delay);
          const retryUrl = getRetryUrl ? await getRetryUrl() : url;
          return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
        }
        return res;
      } catch (error) {
        if (attemptsLeft === 0) {
          throw error;
        }
        const delay = getDelay();
        await sleep(delay);
        const retryUrl = getRetryUrl ? await getRetryUrl() : url;
        return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
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
      constructor({ apiURL, consistency, edgeURL, fetch, region, siteID, token, uncachedEdgeURL }) {
        this.apiURL = apiURL;
        this.consistency = consistency ?? "eventual";
        this.edgeURL = edgeURL;
        this.fetch = fetch ?? globalThis.fetch;
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
var ANNEE = 2026;
var NB_PORTES = 24;
var MAX_INSCRIPTIONS_PAR_IP = 8;
var UNIVERS = ["gav", "psy", "80s", "quiz", "final"];
var JETABLES = ["yopmail.com", "yopmail.fr", "mailinator.com", "guerrillamail.com", "sharklasers.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "trashmail.com", "mekuron.com", "getnada.com", "maildrop.cc", "throwawaymail.com", "mohmal.com", "emailondeck.com", "jetable.org", "tempr.email", "dispostable.com", "fakeinbox.com", "mailnesia.com"];
var hacher = (texte) => createHash("sha256").update(texte).digest("hex");
var pad = (n) => String(n).padStart(2, "0");
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
function creerMoteur({ stockage, maintenant = () => /* @__PURE__ */ new Date(), contexte = "production" }) {
  const essai = contexte !== "production";
  let secretCache = null;
  let tiragesCache = { quand: 0, valeurs: {} };
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
      cle: pad(j),
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
    for (let j = 1; j <= NB_PORTES; j++) if (resultatVisible(j, quand)) dus.push(pad(j));
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
    const resultats = {};
    liste.forEach((d) => {
      if (!resultatVisible(d.j, quand)) return;
      const t = tir[pad(d.j)];
      resultats[d.j] = { bonne: texteBonne(d), explication: d.explication, tire: !!t, gagnant: t && t.gagnant ? t.gagnant.etiquette : null, participants: t ? t.participants : null, lot: t && t.lot || null };
    });
    const finaux = {};
    ["grand", "assidus"].forEach((g) => {
      if (tir[g]) finaux[g] = { gagnant: tir[g].gagnant ? tir[g].gagnant.etiquette : null, lot: tir[g].lot || null };
    });
    const joueur = await joueurDuJeton(req);
    return json({
      cal: quand.cal,
      simule: quand.simule,
      essai,
      portes: liste.map((d) => ({ j: d.j, univers: d.univers, gros: !!d.gros, titre: d.j <= quand.cal ? d.titre : null })),
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
        const cleIp = "limites/" + ANNEE + "-" + pad(quand.cal) + "/" + hacher(s.hmac + "|" + (ip || "inconnue")).slice(0, 24);
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
  async function bilan(req) {
    const quand = quandPour(req);
    const [joueurs, liste, lots] = await Promise.all([tousLesJoueurs(), defis(), stockage.lire("config/lots")]);
    try {
      await assurerTirages(quand);
    } catch (e) {
      console.error("[avent] tirage impossible :", e && e.message);
    }
    tiragesCache.quand = 0;
    const tir = await tirages();
    const jours = [];
    for (let j = 1; j <= NB_PORTES; j++) {
      let joues = 0, leJour = 0, justes = 0;
      joueurs.forEach((x) => {
        const r = x.reponses && x.reponses[j];
        if (r) {
          joues++;
          if (r.leJour) leJour++;
          if (r.juste) justes++;
        }
      });
      const d = liste && liste.find((x) => x.j === j);
      jours.push({ j, titre: d ? d.titre : "", univers: d ? d.univers : "", gros: !!(d && d.gros), joues, leJour, justes, lot: lots && lots[j] || "", tirage: tir[pad(j)] || null });
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
      lots: lots || {}
    });
  }
  async function equipeEcrire(req, action) {
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
      const lots = {};
      Object.keys(corps.lots || {}).forEach((k) => {
        if (/^(\d{1,2}|grand|assidus)$/.test(k)) lots[k] = String(corps.lots[k] || "").slice(0, 200);
      });
      await stockage.ecrire("config/lots", lots);
      return json({ ok: true });
    }
    if (action === "tirage") {
      const cle = /^(grand|assidus)$/.test(corps.cle) ? corps.cle : pad(parseInt(corps.cle, 10));
      const actuel = await stockage.lire("tirages/" + cle);
      if (!actuel) return refus(404, "absent", "Ce tirage n\u2019a pas encore eu lieu.");
      if (corps.action === "prevenu") actuel.prevenu = corps.valeur !== false;
      else if (corps.action === "lot") actuel.lot = String(corps.valeur || "").slice(0, 200);
      else if (corps.action === "retirer") {
        const joueurs = await tousLesJoueurs();
        const anciens = (actuel.anciens || []).concat(actuel.gagnant ? [{ ...actuel.gagnant, remplaceLe: maintenant().toISOString(), raison: String(corps.raison || "").slice(0, 200) }] : []);
        const neuf = actuel.genre === "jour" ? await tirerJour(actuel.jour, joueurs, anciens.map((a) => a.id)) : tirerFinal(actuel.genre, joueurs.filter((x) => !anciens.some((a) => a.id === x.id)));
        Object.assign(actuel, { gagnant: neuf.gagnant, tireLe: neuf.tireLe, prevenu: false, anciens });
      } else return refus(400, "action", "Action inconnue.");
      await stockage.ecrire("tirages/" + cle, actuel);
      tiragesCache = { quand: 0, valeurs: {} };
      return json({ ok: true, tirage: actuel });
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
    const chemin = url.pathname.replace(/^\/api\/avent\/?/, "").replace(/\/+$/, "");
    const m = req.method;
    try {
      if (chemin === "etat" && m === "GET") return await etat(req);
      if (chemin === "defi" && m === "GET") return await defi(req, url);
      if (chemin === "jouer" && m === "POST") return await jouer(req, ip);
      if (chemin === "essai/effacer" && m === "POST") return await effacerEssai(req);
      if (chemin === "equipe/initialiser" && m === "POST") return await initialiser(req);
      if (chemin.startsWith("equipe/")) {
        if (!await equipeAutorisee(req)) {
          await new Promise((r) => setTimeout(r, 400));
          return refus(401, "code", "Code de l\u2019\xE9quipe incorrect.");
        }
        if (chemin === "equipe/bilan" && m === "GET") return await bilan(req);
        if (chemin === "equipe/defis" && m === "GET") return json({ defis: await defis() });
        if (chemin === "equipe/export" && m === "GET") return await exporter();
        if (m === "POST") return await equipeEcrire(req, chemin.slice("equipe/".length));
      }
      return refus(404, "inconnu", "Introuvable.");
    } catch (e) {
      console.error("[avent] erreur :", e && e.stack ? e.stack : e);
      return refus(500, "panne", "Un souci de notre c\xF4t\xE9. R\xE9essayez dans un instant.");
    }
  }
  return { gerer, assurerTirages, quandReel: () => {
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

// avent-src/entree.mjs
function contexteDe(hote) {
  return /--gamedoor41\.netlify\.app$/i.test(hote) || /^(localhost|127\.0\.0\.1)$/i.test(hote) ? "apercu" : "production";
}
var moteurs = {};
function moteur(contexte) {
  if (!moteurs[contexte]) moteurs[contexte] = creerMoteur({ contexte, stockage: stockageNetlify(contexte === "production" ? "avent-2026" : "avent-2026-apercu") });
  return moteurs[contexte];
}
async function gererAvent(req, context) {
  const contexte = contexteDe(new URL(req.url).hostname);
  return moteur(contexte).gerer(req, { ip: context && context.ip });
}
async function tirageDuJour() {
  const m = moteur("production");
  const n = await m.assurerTirages(m.quandReel());
  if (n) console.log("[avent] tirages faits : " + n);
  return n;
}
export {
  contexteDe,
  gererAvent,
  tirageDuJour
};
