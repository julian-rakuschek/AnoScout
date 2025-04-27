export type ErrorResponse = { success: false; message: string; details?: string[] };
export type AppResponse<T> = { success: true } & T | ErrorResponse;
export type DefaultAppResponse = AppResponse<unknown>;
export type ListAppResponse<T> = AppResponse<{ rows: T[] }>;

export type Diff<T, U> = T extends U ? never : T;
export type Successful<T> = Diff<T, { success: false }>;
export type Failed<T> = Diff<T, { success: true }>;

export type ObjectId = {
  $oid: string;
};

export type SchedulerBucketStatus = {
  message: string;
  current: number;
  total: number;
  error?: string;
};

export type SchedulerQueue = string[];


export type Classification = {
  dateTrunc: string;
  granularity: string;
  algo: ObjectId;
  channel: string;
  TID: ObjectId;
};

export type ClassificationPerSegment = {
  truncatedTimestamp: { $date: string };
  start: { $date: string };
  end: { $date: string };
  algos: Classification[];
}[];

export type AlgorithmParameter = {
  type: "integer" | "float" | "boolean" | "enum";
  min?: number;
  max?: number;
  values?: string[] | number[];
  description: string;
  optional?: boolean;
  value: number | string | boolean | null;
};

export type AlgorithmParameters = {
  [parameter: string]: AlgorithmParameter;
};

export type Algorithm = {
  name: string;
  weight: number;
  algorithm: string;
  parameters: AlgorithmParameters;
  type: "scoring" | "classification";
  BID: ObjectId;
  _id: ObjectId;
};

export type Bucket = {
  _id: ObjectId;
  name: string;
  smoothing_window: number;
  threshold: number;
  type: "scoring" | "classification";
  classification_granularity: null | string;
  classification_ensemble: string;
};

export type BucketUpdate = {
  id: string;
  name?: string;
  smoothing_window?: number;
  threshold?: number;
  classification_ensemble?: string;
};

export type Histogram = {
  from: number;
  to: number;
  amount: number;
}[];

export type BucketMinMax = {
  min: number;
  max: number;
  hist: Histogram;
};

export type TimeSeries = {
  _id: ObjectId;
  name: string;
  BID: ObjectId;
  is_reference: boolean;
  channels: string[];
  anomaly_percentage?: number;
};

export type TimeSeriesUpdate = {
  id: string;
  name?: string;
  is_ref_toggle?: boolean;
};

export type TimeSeriesQuery = {
  channel: string;
  from?: string;
  to?: string;
  n_segments?: number;
};

export type TimeSeriesDataPoint = {
  timestamp: string;
  timestamp_string?: string;
  value: number;
  scores: { [algo: string]: number };
  ensemble: number;
  ensemble_processed: number;
};

export type AlgorithmSensitivityType = {algo: string; ratio: number}[];

export type TimeSeriesListData = {
  barycenter_values: number[];
  barycenter_scores: number[];
  [ts: string]: number[];
} & {
  sensitivity: AlgorithmSensitivityType;
};

export type Anomaly = {
  _id: ObjectId;
  TID: ObjectId;
  timeSeriesName?: string;
  channel: string;
  keep: boolean;
  manual: boolean;
  start: { $date: string };
  end: { $date: string };
  start_string: string;
  end_string: string;
  length: number;
  score: number;
  length_score: number;
  rating: number;
  bookmark: boolean;
  views: number;
  ts_data?: TimeSeriesDataPoint[];
};

export type Nominal = {
  _id: ObjectId;
  TID: ObjectId;
  channel: string;
  date: string;
  start: { $date: string };
  end: { $date: string };
  ts_data?: TimeSeriesDataPoint[];
};

export type AnomalyUpdate = {
  rating?: number;
  keep?: boolean;
  bookmark?: boolean;
};

export type ScatterPoint = {
  _id: ObjectId;
  TID: string;
  length: number;
  score: number;
  length_score: number;
  projected: { x: number; y: number };
  views: number;
  views_norm: number;
  rating: number;
  values?: number[];
};

export type Ratings = {
  [AID: string]: number;
};


export enum ToastType {
  Info = "Info",
  Success = "Success",
  Warning = "Warning",
  Error = "Error",
}

export type ToastDto = {
  type: ToastType;
  message: string;
};


export type AddNominalArea = {
  TID: string;
  channel: string;
  date: string | null;
};

export type AddAnomaly = {
  TID: string;
  channel: string;
  start: string;
  end: string;
  notify: boolean;
  label: string;
};

export type DendrogramAnomaly = {
  AID: string;
  score: number;
  length: number;
  rating: number;
  length_score: number;
};

export type DendrogramTimeSeries = {
  TID: string;
  name: string;
};

export type Dendrogram<T = DendrogramAnomaly | DendrogramTimeSeries> = {
  id: number;
  dist?: number;
  meta?: T;
  left?: Dendrogram<T>;
  right?: Dendrogram<T>;
};


export type Dissimilarities = [string, string[]][];
export type RecommenderResult = [number, ObjectId][];
export type ClusterClassLookup = { [AID: string]: number };

export enum ScatterColorings {
  SEVERITY,
  RATINGS,
  VIEWS,
  RECOMMENDER,
  CLUSTERING,
  CLUSTER_RECOMMENDATIONS
}

export enum ScatterArrangement {
  SEVERITY,
  PROJECTION
}

export enum RecAlgo {
  SEVERITY,
  ICBF
}

export enum Heatmap {
  SEVERITY,
  ANOMALIES,
  ALGO_DISAGREEMENT,
  CLUSTER
}

export enum Tabs {
  TS_LIST,
  TS_CLUSTER,
  ALGOVIS,
  ANOMALY_LIST,
  ANOMALY_CLUSTER
}

export const enum TimeSeriesInteractionMode {
  NONE,
  ZOOM,
  ANNOTATE
}

export const enum ALGOVIS {OCNN, KDE}

export type AnomalyExplorerSettings = {
  channel: string | null;
  heatmap: Heatmap;
  scatterColoring: ScatterColorings;
  scatterPointArrangement: ScatterArrangement;
  scatterConvexHull: boolean;
  scatterDisableZoom: boolean;
  recommenderAlgorithm: RecAlgo;
  nClusters: number;
  showOnlyUnrated: boolean;
  hideNegative: boolean;
  nDissimilar: number;
};

export type AlgoVisParams = {
  [key: string]: number;
};

export type AlgoVisOCNN = {
  j: number;
  k: number;
  ratio: number;
};

export type AlgoVisKDE = {
  bandwidth: number;
  level: number;
};

export type SegmentProjected = {
  x: number;
  y: number;
  normal: boolean;
  start: { $date: string };
  end: { $date: string };
  TID: ObjectId;
  channel: string;
  values: number[];
};

export type OCNNSegment = SegmentProjected & {
  dbr: number[];
  ratio: number;
  paths: number[][];
};

export type KDESegment = SegmentProjected & {
  dbr: number[];
  class: number;
  component: number;
};

export type KDEResult = {
  xx: number[][];
  yy: number[][];
  zz: number[][];
  components: number[][];
  normal_components: number[];
  segments: KDESegment[];
};

export type SOMGrid = string[][][];

export type TimeSeriesDataList = {
  ts_list: string[];
  values: number[][];
  barycenter: number[];
};

export enum TimeSeriesVis {
  LINE, HEATMAP, HORIZON
}

export type TimeSeriesListSettingsType = {
  cluster: number;
  visualization: TimeSeriesVis;
  channel: string;
  scoreMin: number;
  scoreMax: number;
};

export type TimeSeriesClusterSemanticZoomState = {
  lineChartInteractive: boolean;
  lineChartFontSize: number;
  horizonBands: number;
  heatmapCellsX: number;
  heatmapCellsY: number;
};