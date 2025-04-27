import axios, { Method } from "axios";
import { DefaultAppResponse } from "../../types";
import { getRequestConfig, IRequestObject } from "lib/api/QueryHelpers";

export const axiosClient = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
  withCredentials: true,
});

export class ApiRoute<TRequestData, TRequestParams, TQueryParams, TResponse = DefaultAppResponse> {

  constructor(public readonly method: Method, public readonly url: string) {
  }

  public async fetch(requestObject: IRequestObject<TRequestData, TRequestParams, TQueryParams> = {}): Promise<TResponse> {
    const { method, url } = this;
    try {
      const config = getRequestConfig(method, url, requestObject);

      const { data } = await axiosClient.request<TResponse>(config);
      return data;
    } catch(error) {
      throw error;
    }
  }
}