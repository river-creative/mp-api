import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { URLSearchParams } from 'url';
import { convertToCamelCase, convertToSnakeCase, escapeApostrophes, stringifyURLParams, toCapitalSnakeCase } from './utils/converters';


export type APIGetOneInstance = <T extends Record<string, any>>({ id, path, mpQuery, config }: APIGetParameter & { id: number; }) => Promise<T | undefined | { error: ErrorDetails; }>;
export type APIGetMultipleInstance = <T extends Record<string, any>>({ path, mpQuery, config }: APIGetParameter & { mpQuery: MPGetQuery; }) => Promise<T[] | { error: ErrorDetails; }>;
export type APICreateOneInstance = <T extends Record<string, any>>({ path, mpQuery, data, config }: APICreateOneParameter) => Promise<T | { error: ErrorDetails; }>;
export type APICreateManyInstance = <T extends Record<string, any>>({ path, mpQuery, data, config }: APICreateManyParameter) => Promise<T[] | { error: ErrorDetails; }>;
export type APICreateFileInstance = <T extends Record<string, any>>({ path, mpQuery, data, config }: APICreateFileParameter) => Promise<T | { error: ErrorDetails; }>;
export type APIUpdateInstance = <T extends Record<string, any>>({ path, mpQuery, data, config }: APIUpdateParameter) => Promise<T[] | { error: ErrorDetails; }>;


export interface MPApiBase {
  getOne: APIGetOneInstance;
  getMany: APIGetMultipleInstance;
  createOne: APICreateOneInstance;
  createMany: APICreateManyInstance;
  updateMany: APIUpdateInstance;
  createFile: APICreateFileInstance;
  updateFile: APICreateFileInstance;
  get: AxiosInstance['get'];
  post: AxiosInstance['post'];
  put: AxiosInstance['put'];
  getError: (error: AxiosError) => ErrorDetails;
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


const createTokenGetter = (auth: { username: string; password: string; }) => {
  let token: AccessToken | undefined;

  return async () => {
    // If the token is near expiration, get a new one.
    if (!token || token.expiration - 60000 < Date.now()) {
      const tokenRes = await axios.post<TokenData>(
        'https://mp.revival.com/ministryplatformapi/oauth/connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'http://www.thinkministry.com/dataplatform/scopes/all',
        }).toString(),
        { auth }
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

export const createApiBase = ({ auth }: { auth: { username: string; password: string; }; }): MPApiBase => {
  /**
   * Gets MP oauth token.
   * @returns token
   */
  const getToken = createTokenGetter(auth);
  const api = axios.create({
    baseURL: 'https://mp.revival.com/ministryplatformapi',
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
      const url = path + '/get'; //+ stringifyURLParams(mpQuery);
      const data = mpQuery && escapeApostrophes(convertToSnakeCase<MPGetQuery>(mpQuery));
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



  const getError = function (error: AxiosError): ErrorDetails {
    return {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      method: error.config?.method,
      url: error.config?.url,
      data: error.config?.data,
      reason: (error.response?.data as any)?.Message,
    };
  };

  return {
    get,
    put,
    post,
    getOne,
    getMany,
    createOne,
    createMany,
    updateMany,
    createFile,
    updateFile,
    getError
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

export type MPGetQuery = {
  select?: string;
  filter?: string;
  orderBy?: string;
  groupBy?: string;
  top?: number;
  skip?: number;
  distinct?: boolean;
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

export type DateTimeIsoString = `${number}-${number}-${number}T${number}:${number}:${number}`;