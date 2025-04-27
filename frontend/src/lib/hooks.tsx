import { ApiRoutes } from "lib/api/ApiRoutes";
import { useQueryFetch, useQueryFetchWithRefetch } from "lib/api/api";
import * as types from "../types";

export const useBuckets = (): types.Bucket[] => {
  const data = useQueryFetch(ApiRoutes.getBucketList);
  return data ?? [];
};

export const useBucket = (bucket?: string): types.Bucket | undefined => {
  if(bucket === undefined) return undefined;
  return useQueryFetch(ApiRoutes.getBucket, { params: { bucket } });
};

export const useBucketAlgorithms = (bucket: string): types.Algorithm[] => {
  return useQueryFetch(ApiRoutes.getBucketAlgorithms, { params: { bucket } }) ?? [];
};

export const useBucketChannels = (BID: string): string[] => {
  return useQueryFetch(ApiRoutes.bucketChannels, { params: { BID } }) ?? [];
};

export const useBucketMinMax = (BID: string, channel: string): types.BucketMinMax | undefined => {
  return useQueryFetch(ApiRoutes.getBucketMinMax, { params: { bucket: BID, channel: channel } });
};

export const useTimeSeriesList = (bucket: string): types.TimeSeries[] => {
  if(bucket === "") return [];
  const data = useQueryFetch(ApiRoutes.getTsList, { params: { bucket } });
  return data ?? [];
};

export const useTimeSeries = (TID?: string): types.TimeSeries | undefined => {
  if(TID === undefined) return undefined;
  return useQueryFetch(ApiRoutes.getTs, { params: { TID } });
};

export const useTimeSeriesData = (TID: string, query?: types.TimeSeriesQuery): types.TimeSeriesDataPoint[] => {
  const data = useQueryFetch(ApiRoutes.queryTs, { params: { TID }, queryParams: query });
  return data ?? [];
};

export const useTimeSeriesListData = (ts_list: string[], channel: string, n_segments: number, BID: string ): types.TimeSeriesListData | undefined => {
  return useQueryFetch(ApiRoutes.queryTsList, { data: ts_list, queryParams: { channel, n_segments, BID } }, true, undefined, `tsList${ts_list.join("_")}`);
};

export const useTimeSeriesDataRefetch = (TID: string, query?: types.TimeSeriesQuery): { data: types.TimeSeriesDataPoint[]; refetch: () => void } => {
  const { data, refetch } = useQueryFetchWithRefetch(ApiRoutes.queryTs, { params: { TID }, queryParams: query });
  return { data: data ?? [], refetch: refetch };
};

export const useTimeSeriesZoomLevel = (TID: string, from?: string, to?: string): number => {
  const data = useQueryFetch(ApiRoutes.getTsZoomLevel, { params: { TID }, queryParams: { from, to } });
  return data ?? 0;
};

export const useTimeSeriesAnomalies = (TID: string, include_ts_data: boolean = false): types.Anomaly[] => {
  const data = useQueryFetch(ApiRoutes.getAnomaliesTimeseries, { params: { TID }, queryParams: { include_ts_data } });
  return data ?? [];
};

export const useBucketAnomalies = (BID: string, include_ts_data: boolean = false, only_manual: boolean = false, only_bookmarked: boolean = false): types.Anomaly[] | undefined => {
  return useQueryFetch(ApiRoutes.getAnomaliesBucket, {
    params: { BID },
    queryParams: { include_ts_data, only_manual, only_bookmarked },
  });
};

export const useTimeSeriesScatter = (BID: string): types.ScatterPoint[] => {
  const data = useQueryFetch(ApiRoutes.getScatterPoints, { params: { BID } });
  return data ?? [];
};

export const useAnomaly = (AID: string, extension: number = 2, enabled: boolean = true): types.Anomaly | undefined => {
  return useQueryFetch(ApiRoutes.getAnomaly, { params: { AID }, queryParams: { extension } }, enabled);
};

export const useTimeSeriesNominals = (TID: string, include_ts_data: boolean = false): types.Nominal[] => {
  const data = useQueryFetch(ApiRoutes.getNominalsTimeseries, { params: { TID }, queryParams: { include_ts_data } });
  return data ?? [];
};

export const useBucketNominals = (BID: string, include_ts_data: boolean = false): types.Nominal[] => {
  const data = useQueryFetch(ApiRoutes.getNominalsBucket, { params: { BID }, queryParams: { include_ts_data } });
  return data ?? [];
};

export const useNominal = (NID: string, include_ts_data: boolean = false): types.Nominal | undefined => {
  return useQueryFetch(ApiRoutes.getNominal, { params: { NID }, queryParams: { include_ts_data } });
};

export const useUserMarkingsTimeseries = (TID: string, include_ts_data: boolean = false): { anomalies: types.Anomaly[]; nominals: types.Nominal[] } => {
  const anomalies = useQueryFetch(ApiRoutes.getAnomaliesTimeseries, { params: { TID }, queryParams: { include_ts_data } }) ?? [];
  const nominals = useQueryFetch(ApiRoutes.getNominalsTimeseries, { params: { TID }, queryParams: { include_ts_data } }) ?? [];
  return {
    anomalies: anomalies.filter(a => a.manual),
    nominals: nominals,
  };
};

export const useAnomalyClustering = (BID: string): types.Dendrogram<types.DendrogramAnomaly> | undefined => {
  return useQueryFetch(ApiRoutes.getAnomalyClustering, { params: { BID } });
};

export const useRatings = (BID: string): types.Ratings => {
  const res = useQueryFetch(ApiRoutes.getRatings, { params: { BID } });
  if(res) return res;
  return {};
};

export const useDissimilarities = (BID: string, k?: number, only_unrated?: boolean): types.Dissimilarities => {
  const data = useQueryFetch(ApiRoutes.getDissimilarities, { params: { BID }, queryParams: { k, only_unrated } });
  return data ?? [];
};

export const useRecommendations = (BID: string, method: types.RecAlgo): types.RecommenderResult | undefined => {
  const method_string = method === types.RecAlgo.ICBF ? "collab" : "severities";
  return useQueryFetch(ApiRoutes.getRecommendations, { params: { BID: BID, method: method_string } });
};

export const useHeatmap = (BID: string, channel: string, mode: types.Heatmap): number[][] | undefined => {
  const heatmapLookup = (heatmapType: types.Heatmap): string => {
    switch(heatmapType) {
      case types.Heatmap.SEVERITY:
        return "score";
      case types.Heatmap.ALGO_DISAGREEMENT:
        return "std";
      case types.Heatmap.ANOMALIES:
        return "labels";
      default:
        return "score";
    }
  };
  return useQueryFetch(ApiRoutes.getHeatmap, { params: { BID: BID, channel: channel, mode: heatmapLookup(mode) } });
};

export const useBinaryAnomalyTS = (AID: string, segments?: number): number[] => {
  return useQueryFetch(ApiRoutes.binaryAnomalyTS, { params: { AID }, queryParams: { segments } }) ?? [];
};

export const useClassifications = (TID: string, channel: string): types.Classification[] => {
  return useQueryFetch(ApiRoutes.getAllClassifications, { params: { TID }, queryParams: { channel } }) ?? [];
};

export const useSegmentClassifications = (TID: string, channel: string): types.ClassificationPerSegment => {
  return useQueryFetch(ApiRoutes.getSegmentClassifications, { params: { TID }, queryParams: { channel } }) ?? [];
};

export const useProjectedSegments = (BID: string, channel: string, j: number, k: number, n_prototypes: number): types.OCNNSegment[] | undefined => {
  return useQueryFetch(ApiRoutes.getOCNN, { params: { BID, channel }, queryParams: { k, j, n_prototypes } });
};

export const useKDE = (BID: string, channel: string, bandwidth: number, threshold: number, padding: number): { data: types.KDEResult | undefined; isFetching: boolean } => {
  const { data, isFetching } = useQueryFetchWithRefetch(ApiRoutes.getKDE, { params: { BID, channel }, queryParams: { bandwidth, threshold, padding } });
  return { data, isFetching };
};

export const useTimeSeriesClustering = (BID: string, channel: string): types.Dendrogram<types.DendrogramTimeSeries> | undefined => {
  return useQueryFetch(ApiRoutes.getBucketTimeSeriesClustering, { params: { bucket: BID, channel: channel } });
};

export const useScoreDistribution = (BID: string, channel: string): types.Histogram | undefined => {
  return useQueryFetch(ApiRoutes.getBucketScoreDistribution, { params: { bucket: BID, channel: channel } });
};