import { AxiosRequestConfig, Method } from 'axios';

type IApiRequest = {
  [key: string]: any | undefined;
};

type ExtractRouteParams<T extends string> = string extends T
  ? Record<string, string>
  : T extends `${infer Start}:${infer Param}/${infer Rest}`
    ? { [k in Param | keyof ExtractRouteParams<Rest>]: string | number }
    : T extends `${infer Start}:${infer Param}`
      ? { [k in Param]: string }
      : Record<string, undefined>;

function transformParamsForURL<C extends string>(url: C, params: ExtractRouteParams<C>, queryParams?: IApiRequest): string {
  let ret = url as string;

  for(const [param, value] of Object.entries(params)) {
    if(!ret.includes(`:${param}`)) {
      throw Error(`Parameter ":${param}" is NOT part of route "${url}"`);
    }
    ret = ret.replace(RegExp(`:${param}\\b`), `${value}`);
  }
  if (queryParams) {
    ret += "?";
    for(const [param, value] of Object.entries(queryParams)) {
      ret += `${param}=${value}&`
    }
  }

  return ret;
}

export function getResolvedUrl<TRequestData, TRequestParams, TQueryParams>(url: string, object: IRequestObject<TRequestData, TRequestParams, TQueryParams>, includeQueryParams: boolean = false): string {
  return object.params != null ? transformParamsForURL(url, object.params as IApiRequest, includeQueryParams ? object.queryParams as IApiRequest : undefined) : url;
}

export interface IRequestObject<TData, TParams, TQuery> {
  queryParams?: TQuery;
  axiosConfig?: AxiosRequestConfig;
  data?: TData;
  formData?: boolean;
  params?: TParams;
}

export function getRequestConfig<TRequestData, TRequestParams, TQueryParams>(
  method: Method,
  url: string,
  object: IRequestObject<TRequestData, TRequestParams, TQueryParams>,
  csrfToken?: string,
): AxiosRequestConfig {
  return {
    data: object.data ?? undefined,
    params: object.queryParams ?? undefined,
    method: method,
    url: getResolvedUrl(url, object),
    headers: { "x-csrf-token": csrfToken },
  };
}