import { ApiRoute } from "lib/api/ApiRoute";
import * as types from "../../types";

// ApiRoute types:
// TRequestData, TRequestParams, TQueryParams, TResponse
//
// (1) TRequestData = Post data
// (2) TRequestParams = things that go into the url, e.g. /mongodb/data/:bucket then TRequestParams would be {bucket: string}
// (3) TQueryParams = Everything that comes after the url, e.g. /some?query=value, then TQueryParams would be {query: string}
// (4) TResponse = Response object

export const bucketRoutes = {
  getBucketList: new ApiRoute<undefined, undefined, undefined, types.Bucket[]>("GET", "/db/bucket/list"),
  getBucket: new ApiRoute<undefined, { bucket: string }, undefined, types.Bucket>("GET", "/db/bucket/:bucket"),
  createBucket: new ApiRoute<{ name: string; type: "scoring" | "classification"; classification_granularity: null | string }, undefined, undefined, types.DefaultAppResponse>("POST", "/db/bucket/create"),
  updateBucket: new ApiRoute<types.BucketUpdate, undefined, undefined, types.DefaultAppResponse>("POST", "/db/bucket/update"),
  deleteBucket: new ApiRoute<{ id: string }, undefined, undefined, types.DefaultAppResponse>("DELETE", "/db/bucket/delete"),
  bucketChannels: new ApiRoute<undefined, { BID: string }, undefined, string[]>("GET", "/db/bucket/channels/:BID"),
  getBucketAlgorithms: new ApiRoute<undefined, { bucket: string }, undefined, types.Algorithm[]>("GET", "/db/bucket/:bucket/algorithms"),
  addBucketAlgorithms: new ApiRoute<{ name: string; algo: string; params?: {[key: string]: string | number} }, { bucket: string }, undefined, types.DefaultAppResponse>("POST", "/db/bucket/:bucket/algorithms"),
  deleteBucketAlgorithm: new ApiRoute<undefined, { algoId: string }, undefined, types.DefaultAppResponse>("DELETE", "/db/algorithms/:algoId"),
  updateAlgorithmWeight: new ApiRoute<undefined, { algoId: string; weight: number }, undefined, types.DefaultAppResponse>("POST", "/db/algorithms/:algoId/weight/:weight"),
  updateAlgorithmParams: new ApiRoute<types.AlgorithmParameters, { algoId: string }, undefined, types.DefaultAppResponse>("POST", "/db/algorithms/:algoId/params"),
  getBucketTimeSeriesClustering: new ApiRoute<string[], { bucket: string; channel: string }, undefined, types.Dendrogram<types.DendrogramTimeSeries>>("GET", "/db/bucket/:bucket/cluster/:channel"),
  getBucketMinMax: new ApiRoute<undefined, { bucket: string; channel: string }, undefined, types.BucketMinMax>("GET", "/db/bucket/:bucket/minmax/:channel"),
  getBucketScoreDistribution: new ApiRoute<undefined, { bucket: string; channel: string }, undefined, types.Histogram>("GET", "/db/bucket/:bucket/score_distribution/:channel"),
};

export const tsRoutes = {
  getTsList: new ApiRoute<undefined, { bucket: string }, undefined, types.TimeSeries[]>("GET", "/db/ts/list/:bucket"),
  getTs: new ApiRoute<undefined, { TID: string }, undefined, types.TimeSeries>("GET", "/db/ts/:TID"),
  getTsChannels: new ApiRoute<undefined, { TID: string }, undefined, string[]>("GET", "/db/ts/channels/:TID"),
  getTsZoomLevel: new ApiRoute<undefined, { TID: string }, { from: string; to: string }, number>("GET", "/db/ts/zoomlevel/:TID"),
  queryTs: new ApiRoute<undefined, { TID: string }, types.TimeSeriesQuery, types.TimeSeriesDataPoint[]>("GET", "/db/ts/query/:TID"),
  queryTsList: new ApiRoute<string[], { TID: string }, { channel: string; n_segments: number; BID: string }, types.TimeSeriesListData>("POST", "/db/ts/query/list"),
  queryTsListImage: new ApiRoute<string[], { TID: string }, { channel: string; n_segments: number }, types.TimeSeriesListData>("POST", "/db/ts/query/list/image"),
  updateTs: new ApiRoute<types.TimeSeriesUpdate, undefined, undefined, types.DefaultAppResponse>("POST", "/db/ts/update"),
  deleteTs: new ApiRoute<{ id: string }, undefined, undefined, types.DefaultAppResponse>("DELETE", "/db/ts/delete"),
};

export const queueRoutes = {
  queueStatus: new ApiRoute<undefined, undefined, undefined, string[]>("GET", "/queue"),
  enqueueBucket: new ApiRoute<undefined, { bucket: string }, undefined, types.DefaultAppResponse>("POST", "/queue/enqueue/:bucket"),
  schedulerBucketStatus: new ApiRoute<undefined, { bucket: string }, undefined, types.SchedulerBucketStatus>("GET", "/queue/status/:bucket"),
  schedulerResetStatus: new ApiRoute<undefined, { bucket: string }, undefined, types.DefaultAppResponse>("POST", "/queue/reset/:bucket"),
};

export const anomalyRoutes = {
  extractAnomalies: new ApiRoute<undefined, { BID: string }, undefined, types.DefaultAppResponse>("POST", "/anomalies/extract/:BID"),
  getAnomaliesBucket: new ApiRoute<undefined, { BID: string }, { include_ts_data?: boolean; only_manual?: boolean; only_bookmarked?: boolean }, types.Anomaly[]>("GET", "/anomalies/bucket/:BID"),
  getAnomaliesTimeseries: new ApiRoute<undefined, { TID: string }, { include_ts_data?: boolean }, types.Anomaly[]>("GET", "/anomalies/ts/:TID"),
  updateAnomaly: new ApiRoute<types.AnomalyUpdate, { AID: string }, undefined, types.DefaultAppResponse>("POST", "/anomalies/anomaly/update/:AID"),
  deleteAnomaly: new ApiRoute<undefined, { AID: string }, undefined, types.DefaultAppResponse>("DELETE", "/anomalies/anomaly/:AID"),
  getAnomaly: new ApiRoute<undefined, { AID: string }, { extension?: number }, types.Anomaly>("GET", "/anomalies/anomaly/:AID"),
  getScatterPoints: new ApiRoute<undefined, { BID: string }, undefined, types.ScatterPoint[]>("GET", "/anomalies/scatter/:BID"),
  addAnomaly: new ApiRoute<types.AddAnomaly, undefined, undefined, types.DefaultAppResponse>("POST", "/anomalies/anomaly/add"),
  getAnomalyClustering: new ApiRoute<undefined, { BID: string }, undefined, types.Dendrogram<types.DendrogramAnomaly>>("GET", "/anomalies/cluster/:BID"),
  resetRatings: new ApiRoute<undefined, { BID: string }, undefined, types.DefaultAppResponse>("POST", "/anomalies/anomaly/reset/:BID"),
  resetViews: new ApiRoute<undefined, { BID: string }, undefined, types.DefaultAppResponse>("POST", "/anomalies/views/reset/:BID"),
  increaseViewcount: new ApiRoute<undefined, { AID: string }, undefined, types.DefaultAppResponse>("POST", "/anomalies/anomaly/view/:AID"),
  getRatings: new ApiRoute<undefined, { BID: string }, undefined, types.Ratings>("GET", "/anomalies/ratings/:BID"),
  getDissimilarities: new ApiRoute<undefined, { BID: string }, {k?: number; only_unrated?: boolean}, types.Dissimilarities>("GET", "/anomalies/dissimilarities/:BID"),
  getRecommendations: new ApiRoute<undefined, { BID: string; method: string }, undefined, types.RecommenderResult>("GET", "/anomalies/recommender/:method/:BID"),
  getHeatmap: new ApiRoute<undefined, { BID: string; channel: string; mode: "score" | "std" | "labels" }, undefined, number[][]>("GET", "/anomalies/heatmap/:BID/:channel/:mode"),
  binaryAnomalyTS: new ApiRoute<undefined, { AID: string }, { segments: number }, number[]>("GET", "/anomalies/binary/:AID"),
};

export const classificationRoutes = {
  getAllClassifications: new ApiRoute<undefined, { TID: string }, { channel: string }, types.Classification[]>("GET", "/db/ts/classifications/:TID"),
  getSegmentClassifications: new ApiRoute<undefined, { TID: string }, { channel: string }, types.ClassificationPerSegment>("GET", "/db/ts/classifications/:TID/segments"),
};

export const nominalsRoutes = {
  getNominalsBucket: new ApiRoute<undefined, { BID: string }, { include_ts_data?: boolean }, types.Nominal[]>("GET", "/anomalies/nominals/bucket/:BID"),
  getNominalsTimeseries: new ApiRoute<undefined, { TID: string }, { include_ts_data?: boolean }, types.Nominal[]>("GET", "/anomalies/nominals/ts/:TID"),
  getNominal: new ApiRoute<undefined, { NID: string }, { include_ts_data?: boolean }, types.Nominal>("GET", "/anomalies/nominal/:NID"),
  addNominalArea: new ApiRoute<types.AddNominalArea, undefined, undefined, types.DefaultAppResponse & {action: string}>("POST", "/anomalies/nominal/add"),
  deleteNominal: new ApiRoute<undefined, { NID: string }, undefined, types.DefaultAppResponse>("DELETE", "/anomalies/nominal/:NID"),
  deleteNominalByDate: new ApiRoute<{ TID: string; channel: string; date: string }, undefined, undefined, types.DefaultAppResponse>("DELETE", "/anomalies/nominal/date"),
};

export const algoVisRoutes = {
  getOCNN: new ApiRoute<undefined, { BID: string; channel: string }, { k: number; j: number; n_prototypes: number }, types.OCNNSegment[]>("GET", "/algovis/OCNN/:BID/:channel"),
  getKDE: new ApiRoute<undefined, { BID: string; channel: string }, { bandwidth: number; threshold: number; padding: number }, types.KDEResult>("GET", "/algovis/KDE/:BID/:channel"),
};

export const ApiRoutes = {
  ...bucketRoutes,
  ...tsRoutes,
  ...queueRoutes,
  ...anomalyRoutes,
  ...nominalsRoutes,
  ...classificationRoutes,
  ...algoVisRoutes,
};