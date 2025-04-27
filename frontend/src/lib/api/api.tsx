import { AppResponse } from "../../types";
import { ApiRoute } from "lib/api/ApiRoute";
import { getResolvedUrl, IRequestObject } from "lib/api/QueryHelpers";
import { QueryKey, QueryObserverResult, RefetchOptions, useQueries, useQuery, UseQueryOptions, useSuspenseQuery } from "@tanstack/react-query";

export type MultiRequestPart<TRequestData, TRequestParams, TQueryParams, TResponse extends AppResponse<any>> =
  { apiRoute: ApiRoute<TRequestData, TRequestParams, TQueryParams, TResponse>; requestObject?: IRequestObject<TRequestData, TRequestParams, TQueryParams> };

function getQueryParams<TRequestData, TRequestParams, TQueryParams, TResponse extends AppResponse<any>>(requestObj: MultiRequestPart<TRequestData, TRequestParams, TQueryParams, TResponse>): UseQueryOptions<TResponse> {
  const { apiRoute, requestObject = {} } = requestObj;

  const queryKey: QueryKey = [getResolvedUrl(apiRoute.url, requestObject, true)];
  const enabled = true;

  // console.log(queryKey);

  async function queryFn(): Promise<TResponse> {
    return apiRoute.fetch(requestObject);
  }

  return {
    enabled,
    queryFn,
    queryKey,
  };
}

// eslint-disable-next-line max-params
export function useQueryFetch<TRequestData, TRequestParams, TQueryParams, TResponse>(
  apiRoute: ApiRoute<TRequestData, TRequestParams, TQueryParams, TResponse>,
  requestObject: IRequestObject<TRequestData, TRequestParams, TQueryParams> = {},
  enabled: boolean = true,
  refetchInterval?: number,
  customQueryKey?: string
): TResponse | undefined {

  const { data } = useQueryFetchWithRefetch(apiRoute, requestObject, enabled, refetchInterval, customQueryKey);
  return data;
}

// eslint-disable-next-line max-params
export function useQueryFetchWithLoading<TRequestData, TRequestParams, TQueryParams, TResponse>(
  apiRoute: ApiRoute<TRequestData, TRequestParams, TQueryParams, TResponse>,
  requestObject: IRequestObject<TRequestData, TRequestParams, TQueryParams> = {},
  enabled: boolean = true,
  refetchInterval?: number,
  customQueryKey?: string
): { data: TResponse | undefined; isLoading: boolean } {

  const { data, isFetching } = useQueryFetchWithRefetch(apiRoute, requestObject, enabled, refetchInterval, customQueryKey);
  return { data, isLoading: isFetching };
}

// eslint-disable-next-line max-params
export function useQueryFetchWithRefetch<TRequestData, TRequestParams, TQueryParams, TResponse>(
  apiRoute: ApiRoute<TRequestData, TRequestParams, TQueryParams, TResponse>,
  requestObject: IRequestObject<TRequestData, TRequestParams, TQueryParams> = {},
  enabled: boolean = true,
  refetchInterval?: number,
  customQueryKey?: string
): { data: TResponse | undefined; refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<TResponse>>; isFetching: boolean } {

  let queryParams = getQueryParams<TRequestData, TRequestParams, TQueryParams, TResponse>({ apiRoute, requestObject });
  if (customQueryKey) queryParams.queryKey = [customQueryKey]
  const { data, error, refetch, isFetching } = useQuery({ ...queryParams, retry: false, refetchInterval: refetchInterval, enabled: enabled });

  if(error)
    throw error;

  return { data, refetch, isFetching };
}
