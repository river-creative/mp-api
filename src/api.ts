import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { URLSearchParams } from 'url';
import { convertToCamelCase, convertToSnakeCase, convertToPascalCase, convertFromPascalCase, stringifyURLParams, toQueryParameters, toCapitalSnakeCase } from './utils/converters';
import { Communication, CommunicationInfo } from './endpoints/communications';
import { MessageInfo } from './endpoints/messages';
import { TextInfo } from './endpoints/texts';
import { ProcedureInfo } from './endpoints/procedures';
import { UserIdentifier, UserInfo, PasswordInfo, UserSearch } from './endpoints/users';


export type APIGetOneInstance = <T extends Record<string, any>>({ id, path, mpQuery, config }: APIGetParameter & { id: number; }) => Promise<T | undefined | { error: ErrorDetails; }>;
export type APIGetMultipleInstance = <T extends Record<string, any>>({ path, mpQuery, config }: APIGetParameter & { mpQuery: MPGetQuery; }) => Promise<T[] | { error: ErrorDetails; }>;
export type APICreateOneInstance = <T extends Record<string, any>>({ path, mpQuery, data, config }: APICreateOneParameter) => Promise<T | { error: ErrorDetails; }>;
export type APICreateManyInstance = <T extends Record<string, any>>({ path, mpQuery, data, config }: APICreateManyParameter) => Promise<T[] | { error: ErrorDetails; }>;
export type APICreateFileInstance = <T extends Record<string, any>>({ path, mpQuery, data, config }: APICreateFileParameter) => Promise<T | { error: ErrorDetails; }>;
export type APIUpdateInstance = <T extends Record<string, any>>({ path, mpQuery, data, config }: APIUpdateParameter) => Promise<T[] | { error: ErrorDetails; }>;
export type APIDeleteInstance = <T extends Record<string, any>>({ path, ids, mpQuery, config }: APIDeleteParameter) => Promise<T[] | { error: ErrorDetails; }>;

// Communications API types
export type APISendCommunicationInstance = (data: CommunicationInfo, config?: AxiosRequestConfig) => Promise<Communication | { error: ErrorDetails; }>;
export type APISendMessageInstance = (data: MessageInfo, config?: AxiosRequestConfig) => Promise<Communication | { error: ErrorDetails; }>;
export type APISendTextInstance = (data: TextInfo, config?: AxiosRequestConfig) => Promise<Communication | { error: ErrorDetails; }>;

// Procedures API types
export type APIGetProceduresInstance = (search?: string, config?: AxiosRequestConfig) => Promise<ProcedureInfo[] | { error: ErrorDetails; }>;
export type APIExecuteProcedureInstance = <T = Record<string, any>>(procedureName: string, input?: Record<string, any>, config?: AxiosRequestConfig) => Promise<T[][] | { error: ErrorDetails; }>;

// Users API types
export type APIFindUsersInstance = (search: UserSearch, config?: AxiosRequestConfig) => Promise<UserIdentifier[] | { error: ErrorDetails; }>;
export type APIGetUserInstance = (userId: number, config?: AxiosRequestConfig) => Promise<UserInfo | undefined | { error: ErrorDetails; }>;
export type APIUpdateUserInstance = (userId: number, data: UserInfo, config?: AxiosRequestConfig) => Promise<UserInfo | { error: ErrorDetails; }>;
export type APISetUserPasswordInstance = (userId: number, password: PasswordInfo, config?: AxiosRequestConfig) => Promise<{ success: true; status?: unknown } | { error: ErrorDetails; }>;


/**
 * The MP instance this client talks to.
 *
 * Stated once. It was previously spelled out twice inside this file (the axios baseURL and the token
 * endpoint) and could not be reached from anywhere else, which forced every consumer that needed to build
 * a file URL to hardcode the host a third time.
 */
export const MP_BASE_URL = 'https://mp.revival.com/ministryplatformapi';

export interface MPApiBase {
  getOne: APIGetOneInstance;
  getMany: APIGetMultipleInstance;
  createOne: APICreateOneInstance;
  createMany: APICreateManyInstance;
  updateMany: APIUpdateInstance;
  deleteMany: APIDeleteInstance;
  createFile: APICreateFileInstance;
  updateFile: APICreateFileInstance;
  get: AxiosInstance['get'];
  post: AxiosInstance['post'];
  put: AxiosInstance['put'];
  del: AxiosInstance['delete'];
  getError: (error: AxiosError) => ErrorDetails;
  // Communications API
  sendCommunication: APISendCommunicationInstance;
  sendMessage: APISendMessageInstance;
  sendText: APISendTextInstance;
  // Procedures API
  getProcedures: APIGetProceduresInstance;
  executeProcedure: APIExecuteProcedureInstance;
  // Users API
  findUsers: APIFindUsersInstance;
  getUser: APIGetUserInstance;
  updateUser: APIUpdateUserInstance;
  setUserPassword: APISetUserPasswordInstance;
}

export interface ErrorDetails {
  message: string;
  name?: string;
  code?: string;
  status?: number;
  method?: string;
  url?: string;
  data?: string;
  reason?: string;
}


/**
 * Minimal concurrency limiter — runs at most `concurrency` tasks at once and queues the rest.
 * Kept dependency-free (no p-limit) to avoid adding a runtime dependency.
 */
function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const pump = () => {
    while (active < concurrency && queue.length) {
      active++;
      queue.shift()!();
    }
  };
  return <T>(task: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() =>
        task().then(resolve, reject).finally(() => {
          active--;
          pump();
        })
      );
      pump();
    });
}

/**
 * True when an error is MP's transient SQL Server deadlock on a write — SQL chose this request as
 * the deadlock victim and instructs "Rerun the transaction." Only these are retried.
 */
function isDeadlockError(err: unknown): boolean {
  const e = err as AxiosError | undefined;
  const reason = String((e?.response?.data as { Message?: string; } | undefined)?.Message ?? e?.message ?? '');
  return /deadlock|rerun the transaction/i.test(reason);
}

const SECRET_KEY_PATTERN = /password|secret|token|credential/i;

/**
 * A request body safe to put in an error: same shape, secrets replaced.
 *
 * Recursive, and array-preserving, because neither is optional here. Every table write in this library
 * sends an ARRAY of rows (createMany/updateMany/deleteMany), so a top-level-only pass would both miss a
 * credential inside a row and — by rebuilding the array through Object.fromEntries — report
 * `{"0":{…},"1":{…}}` as the payload that was sent, corrupting the very diagnosability this field
 * exists for.
 *
 * A body that cannot be parsed as JSON is dropped rather than guessed at.
 */
function scrubSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubSecrets);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) =>
      SECRET_KEY_PATTERN.test(key) ? [key, '«redacted»'] : [key, scrubSecrets(val)]
    )
  );
}

function redactCredentials(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data !== 'string') return undefined;

  try {
    const parsed = JSON.parse(data);
    if (parsed === null || typeof parsed !== 'object') return data;
    return JSON.stringify(scrubSecrets(parsed));
  } catch {
    return SECRET_KEY_PATTERN.test(data) ? '«redacted»' : data;
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * How an MP instance authenticates.
 *  - {@link MPCredentials} — service-account username/password; the lib mints a `client_credentials`
 *    token and refreshes it near expiry.
 *  - {@link MPBearerAuth} — a caller-supplied bearer (e.g. a signed-in user's token), so calls run AS
 *    that user rather than the service account. The caller owns the token's lifetime: `getToken` is
 *    awaited on every request and may return a cached token or refresh one.
 */
export type MPCredentials = { username: string; password: string; };
export type MPBearerAuth = { getToken: () => string | Promise<string>; };
export type MPAuth = MPCredentials | MPBearerAuth;

const createTokenGetter = (auth: MPAuth, timeout?: number) => {
  // A caller-supplied bearer is used verbatim — the lib neither mints nor caches it.
  if ('getToken' in auth) {
    return async () => {
      const supplied = await auth.getToken();
      if (!supplied) throw new Error('mp-js-api: getToken() returned an empty token');
      return supplied;
    };
  }

  let token: AccessToken | undefined;

  return async () => {
    // If the token is near expiration, get a new one.
    if (!token || token.expiration - 60000 < Date.now()) {
      const tokenRes = await axios.post<TokenData>(
        `${MP_BASE_URL}/oauth/connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'http://www.thinkministry.com/dataplatform/scopes/all',
        }).toString(),
        { auth, timeout }
      );
      const [, payload] = tokenRes.data.access_token.split('.');
      try {
        const jsonPayload: { exp: number; } = JSON.parse(
          Buffer.from(payload, 'base64url').toString()
        );
        token = {
          digest: tokenRes.data.access_token,
          expiration: jsonPayload.exp * 1000,
        };
        return token.digest;
      } catch (err) {
        console.error(err);
      }
    } else {
      return token.digest;
    }
  };
};

export const createApiBase = ({ auth, messaging, timeout = 30000 }: {
  auth: MPAuth;
  /**
   * Resilience for MP's non-concurrency-safe messaging endpoints (/communications, /messages,
   * /texts). Defaults: concurrency 1 (fully serialized), 4 deadlock retries, 150ms base backoff.
   */
  messaging?: { concurrency?: number; retries?: number; retryBaseDelayMs?: number; };
  /** Per-request timeout (ms) applied to every MP call and the token fetch. Default 30000. */
  timeout?: number;
}): MPApiBase => {
  /**
   * Gets MP oauth token.
   * @returns token
   */
  const getToken = createTokenGetter(auth, timeout);
  const api = axios.create({
    baseURL: MP_BASE_URL,
    timeout,
  });

  // MP's /communications, /messages and /texts endpoints are NOT concurrency-safe: overlapping
  // requests deadlock in SQL Server (HTTP 500 "Transaction … was deadlocked on lock resources …
  // chosen as the deadlock victim. Rerun the transaction."). We serialize these writes through a
  // limiter (default concurrency 1) so they cannot deadlock each other, and retry the transient
  // deadlock with exponential backoff + jitter to survive deadlocks against other MP consumers.
  const messagingRetries = messaging?.retries ?? 4;
  const messagingRetryBaseMs = messaging?.retryBaseDelayMs ?? 150;
  const messagingLimit = createLimiter(messaging?.concurrency ?? 1);
  const sendResilient = <T>(run: () => Promise<T>): Promise<T> =>
    messagingLimit(async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await run();
        } catch (err) {
          if (attempt >= messagingRetries || !isDeadlockError(err)) throw err;
          const backoff = messagingRetryBaseMs * 2 ** attempt;
          await sleep(backoff + Math.floor(Math.random() * messagingRetryBaseMs));
        }
      }
    });

  const get = async <T = any, R = AxiosResponse<T, any>>(
    url: string,
    config?: AxiosRequestConfig
  ) =>
    api.get<T, R>(url, {
      ...config,
      headers: {
        ...config?.headers,
        Authorization: `Bearer ${await getToken()}`,
      },
    });

  const post = async <T extends Record<string, any>, R = AxiosResponse<T, any>>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ) =>
    api.post<T, R>(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        Authorization: `Bearer ${await getToken()}`,
      },
    });

  const put = async <T extends Record<string, any>, R = AxiosResponse<T, any>>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ) =>
    api.put<T, R>(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        Authorization: `Bearer ${await getToken()}`,
      },
    });

  const del = async <T = any, R = AxiosResponse<T, any>>(
    url: string,
    config?: AxiosRequestConfig
  ) =>
    api.delete<T, R>(url, {
      ...config,
      headers: {
        ...config?.headers,
        Authorization: `Bearer ${await getToken()}`,
      },
    });

  const getOne: APIGetOneInstance = async <T extends Record<string, any>>({ id, path, mpQuery, config }: APIGetParameter & { id: number; }) => {
    try {
      const url = `${path}/${id}` + stringifyURLParams(mpQuery);
      const res = await get<T>(url, config);
      return res.data[0] ? convertToCamelCase<T>(res.data[0]) : undefined;
    }
    catch (err) {
      return { error: getError(err) };
    }
  };

  const getMany: APIGetMultipleInstance = async <T extends Record<string, any>>({ path, mpQuery, config }: APIGetParameter): Promise<T[] | { error: ErrorDetails; }> => {
    try {
      const url = path + '/get';
      // MP's read body is its PascalCase `QueryParameters` model, NOT snake_cased columns — see
      // toQueryParameters. Snake-casing it turned `orderBy` into `Order_By`, which MP silently
      // ignored, so no read this client ever made was actually ordered.
      const data = mpQuery && toQueryParameters(mpQuery);
      const res = await post<T[]>(url, data, config);
      return res.data.map(record => convertToCamelCase<T>(record));
    }
    catch (err) {
      return { error: getError(err) };
    }
  };


  const createOne: APICreateOneInstance = async <T extends Record<string, any>>({ path, mpQuery, data: payload, config }: APICreateOneParameter) => {
    const query = stringifyURLParams(mpQuery);
    const data = [convertToSnakeCase<Partial<T>>(payload)];
    const url = path + query;
    try {
      const res = await post<T>(url, data, config);
      return convertToCamelCase<T>(res.data[0]);
    }
    catch (err) {
      return { error: getError(err) };
    }

  };


  const createMany: APICreateManyInstance = async <T extends Record<string, any>>({ path, mpQuery, data: payload, config }: APICreateManyParameter) => {
    const query = stringifyURLParams(mpQuery);
    const data = payload.map(p => convertToSnakeCase<Partial<T>>(p));
    const url = path + query;
    try {
      const res = await post(url, data, config);
      return res.data.map(record => convertToCamelCase<T>(record));
    }
    catch (err) {
      return { error: getError(err) };
    }
  };

    const updateMany: APIUpdateInstance = async <T extends Record<string, any>>({ path, mpQuery, data: payload, config }: APIUpdateParameter) => {
    const query = stringifyURLParams(mpQuery);
    const data = payload.map(r => convertToSnakeCase<Partial<T>>(r));
    const url = path + query;
    try {
      const res = await put(url, data, config);
      return res.data.map(record => convertToCamelCase<T>(record));
    }
    catch (err) {
      return { error: getError(err) };
    }
  };

  // MP batch-deletes via POST /tables/{table}/delete with a DeleteParameters body ({ Ids, Select?,
  // UserId? }) and returns the deleted records. The DELETE /tables/{table} verb instead wants a
  // repeated `?id=1&id=2` query (collectionFormat "multi") — NOT `?$IDs=1,2,3`, which MP ignores,
  // matching no records and returning 200 with an empty array (a silent no-op). The POST form also
  // avoids URL-length limits on large batches. Contract verified against the instance swagger
  // (/swagger/docs/v1). Body keys are PascalCase and sent verbatim (no snake_case conversion).
  const deleteMany: APIDeleteInstance = async <T extends Record<string, any>>({ path, ids, mpQuery, config }: APIDeleteParameter) => {
    const body = {
      Ids: ids,
      ...(mpQuery?.select && { Select: mpQuery.select }),
      ...(mpQuery?.userId && { UserId: mpQuery.userId }),
    };
    try {
      const res = await post<T[]>(`${path}/delete`, body, config);
      return res.data.map(record => convertToCamelCase<T>(record));
    }
    catch (err) {
      return { error: getError(err) };
    }
  };

  const createFile: APICreateFileInstance = async ({ path, mpQuery, data: payload, config }: APICreateFileParameter) => {
    const query = stringifyURLParams(mpQuery);
    // const data = [convertToSnakeCase<Partial<T>>(payload)];
    const data = payload;
    const url = path + query;
    try {
      const res = await post(url, data, config);
      return res.data[0];
    }
    catch (err) {
      return { error: getError(err) };
    }
  };

  const updateFile: APICreateFileInstance = async <T extends Record<string, any>>({ path, mpQuery, data: payload, config }: APICreateFileParameter) => {
    const query = stringifyURLParams(mpQuery);
    // const data = [convertToSnakeCase<Partial<T>>(payload)];
    const data = payload;
    const url = path + query;
    try {
      const res = await put(url, data, config);
      return convertToCamelCase<T>(res.data[0]);
    }
    catch (err) {
      return { error: getError(err) };
    }
  };



/**
 * The keys whose values must never leave this library inside an error.
 *
 * `ErrorDetails.data` carries the OUTGOING request body so a failed write can be diagnosed — which is
 * exactly what makes it dangerous on the credential endpoints: a rejected `set-user-password` would
 * otherwise hand the caller the member's plaintext password, and callers log error objects whole.
 */
  const getError = function (error: AxiosError): ErrorDetails {
    return {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      method: error.config?.method,
      url: error.config?.url,
      data: redactCredentials(error.config?.data),
      reason: (error.response?.data as any)?.Message,
    };
  };

  // Communications API: POST /communications
  // Serialized + deadlock-retried via sendResilient (endpoint is not concurrency-safe).
  const sendCommunication: APISendCommunicationInstance = async (data, config) => {
    try {
      const payload = convertToPascalCase(data);
      const res = await sendResilient(() => post<Communication>('/communications', payload, config));
      return convertFromPascalCase<Communication>(res.data);
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  // Messages API: POST /messages
  const sendMessage: APISendMessageInstance = async (data, config) => {
    try {
      const payload = convertToPascalCase(data);
      const res = await sendResilient(() => post<Communication>('/messages', payload, config));
      return convertFromPascalCase<Communication>(res.data);
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  // Texts API: POST /texts
  const sendText: APISendTextInstance = async (data, config) => {
    try {
      const payload = convertToPascalCase(data);
      const res = await sendResilient(() => post<Communication>('/texts', payload, config));
      return convertFromPascalCase<Communication>(res.data);
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  // Procedures API: GET /procs
  const getProcedures: APIGetProceduresInstance = async (search, config) => {
    try {
      const url = search ? `/procs?$search=${encodeURIComponent(search)}` : '/procs';
      const res = await get<ProcedureInfo[]>(url, config);
      return res.data.map(proc => convertFromPascalCase<ProcedureInfo>(proc));
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  // Procedures API: POST /procs/{procedure}
  const executeProcedure: APIExecuteProcedureInstance = async <T = Record<string, any>>(
    procedureName: string,
    input?: Record<string, any>,
    config?: AxiosRequestConfig
  ) => {
    try {
      const url = `/procs/${encodeURIComponent(procedureName)}`;
      const res = await post<T[][]>(url, input, config);
      return res.data;
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  // Users API: GET /users?$name=&$logOnName=
  //
  // DOLLAR-PREFIXED, and measured that way: `?logOnName=mpadmin` returns all 104 users while
  // `?$logOnName=mpadmin` returns 1 and `?$logOnName=zzz` returns 0. MP does not reject a parameter it
  // cannot bind, it ignores it — so the unprefixed spelling reads as "no filter", which looks like a
  // working call returning everything. The query is still built here rather than through
  // stringifyURLParams, because that helper escapes `%` and would eat the `*` wildcards.
  const findUsers: APIFindUsersInstance = async (search, config) => {
    const params = new URLSearchParams();
    if (search?.name) params.set('$name', search.name);
    if (search?.logOnName) params.set('$logOnName', search.logOnName);
    // MP has nothing to match on without a term and answers with the whole user list; that is a
    // caller mistake, so it fails here rather than quietly returning every user in the domain.
    if (![...params.keys()].length) throw new Error('findUsers requires a name or logOnName to search for');

    try {
      const res = await get<UserIdentifier[]>(`/users?${params.toString()}`, config);
      return res.data.map(user => convertFromPascalCase<UserIdentifier>(user));
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  // Users API: GET /users/{userId}
  //
  // A user that does not exist comes back as HTTP 200 with a body of literal `null` — MP declares no
  // 404 here — so "not found" is `undefined`, exactly as getOne models it. Typing it as UserInfo would
  // hand callers a null that their `'error' in result` check throws on.
  const getUser: APIGetUserInstance = async (userId, config) => {
    if (!Number.isInteger(userId) || userId <= 0) throw new Error(`getUser requires a positive user id, got: ${userId}`);

    try {
      const res = await get<UserInfo | null>(`/users/${userId}`, config);
      return res.data ? convertFromPascalCase<UserInfo>(res.data) : undefined;
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  // Users API: PUT /users/{userId}
  // A DTO, not a table row: MP spells these keys PascalCase (FirstName), so the capital-snake
  // converter the table writes use would produce First_Name and bind to nothing.
  const updateUser: APIUpdateUserInstance = async (userId, data, config) => {
    if (!Number.isInteger(userId) || userId <= 0) throw new Error(`updateUser requires a positive user id, got: ${userId}`);

    try {
      const res = await put<UserInfo>(`/users/${userId}`, convertToPascalCase(data), config);
      return convertFromPascalCase<UserInfo>(res.data);
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  // Users API: POST /users/{userId}/set-user-password
  //
  // MP answers with an operation-status payload rather than the user record. That payload is RETURNED
  // rather than dropped: a 2xx carrying a refusal is exactly how this library previously recorded a
  // communication as 'sent' that MP had thrown away, and a caller that cannot see the status has no way
  // to tell a set password from a rejected one. The new password is never echoed back.
  const setUserPassword: APISetUserPasswordInstance = async (userId, password, config) => {
    if (!Number.isInteger(userId) || userId <= 0) throw new Error(`setUserPassword requires a positive user id, got: ${userId}`);
    if (!password?.newPassword) throw new Error('setUserPassword requires a newPassword');

    try {
      const res = await post<Record<string, any>>(
        `/users/${userId}/set-user-password`,
        convertToPascalCase(password),
        config
      );
      return { success: true, status: res.data ?? undefined };
    } catch (err) {
      return { error: getError(err as AxiosError) };
    }
  };

  return {
    get,
    put,
    post,
    del,
    getOne,
    getMany,
    createOne,
    createMany,
    updateMany,
    deleteMany,
    createFile,
    updateFile,
    getError,
    sendCommunication,
    sendMessage,
    sendText,
    getProcedures,
    executeProcedure,
    findUsers,
    getUser,
    updateUser,
    setUserPassword,
  };
};





interface TokenData {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

interface AccessToken {
  digest: string;
  expiration: number;
}

// Every parameter MP's read endpoint accepts (swagger: the QueryParameters model). `having`, `userId`
// and `globalFilterId` were missing here — and would have been silently dropped even if passed, since
// the old snake_case conversion mangled every multi-word name.
export type MPGetQuery = {
  select?: string;
  filter?: string;
  orderBy?: string;
  groupBy?: string;
  having?: string;
  top?: number;
  skip?: number;
  distinct?: boolean;
  userId?: number;
  globalFilterId?: number;
};

export type MPCreateQuery = {
  userId?: number;
  select?: string;
};

export type MPCreateFileQuery = {
  description?: string;
  default?: boolean;
  longestDimension?: number;
  userId?: number;
};

export type MPGetFileQuery = {
  thumbnail?: boolean;
};

export type MPUpdateQuery = MPCreateQuery & { allowCreate: boolean; };

interface APIGetParameter {
  path: string;
  mpQuery?: MPGetQuery;
  config?: AxiosRequestConfig;
}

interface APICreateOneParameter {
  path: string;
  data: Record<string, any>,
  mpQuery?: MPCreateQuery;
  config?: AxiosRequestConfig;
};
interface APICreateManyParameter {
  path: string;
  data: Record<string, any>[],
  mpQuery?: MPCreateQuery;
  config?: AxiosRequestConfig;
};
interface APICreateFileParameter {
  path: string;
  data: Record<string, any>,
  mpQuery?: MPCreateFileQuery;
  config?: AxiosRequestConfig;
};
interface APIUpdateParameter {
  path: string;
  data: Record<string, any>[],
  mpQuery?: MPUpdateQuery;
  config?: AxiosRequestConfig;
};
interface APIDeleteParameter {
  path: string;
  ids: number[];
  mpQuery?: MPCreateQuery;
  config?: AxiosRequestConfig;
};

export type DateTimeIsoString = `${number}-${number}-${number}T${number}:${number}:${number}`;