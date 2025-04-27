import { ReactElement } from "react";
import { Bucket, TimeSeries } from "../../../types";
import { useBucketAlgorithms, useSegmentClassifications, useTimeSeriesData } from "lib/hooks";
import { createColorsArray } from "lib/helper/color";
import { interpolateTurbo } from "d3-scale-chromatic";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { findClosestDate } from "lib/helper/util";

export type AnomalyClassificationProps = {
  bucket: Bucket;
  timeSeries: TimeSeries;
  selectedChannel: string;
  canEdit: boolean;
  start_date?: string;
  end_date?: string;
};

export default function AnomalyClassifications({ bucket, timeSeries, selectedChannel, canEdit, start_date, end_date }: AnomalyClassificationProps): ReactElement {
  const queryClient = useQueryClient();
  const classificationsPerSegment = useSegmentClassifications(timeSeries._id.$oid, selectedChannel);
  const algorithms = useBucketAlgorithms(bucket._id.$oid);
  const timeSeriesData = useTimeSeriesData(timeSeries._id.$oid, { n_segments: 1000, from: start_date, to: end_date, channel: selectedChannel });

  if(timeSeriesData.length === 0 || algorithms.length === 0) return <></>;

  const min_value = parseFloat(timeSeriesData.toSorted((a, b) => a.value - b.value)[0].value.toFixed(2));
  const max_value = parseFloat(timeSeriesData.toSorted((a, b) => a.value - b.value)[timeSeriesData.length - 1].value.toFixed(2));
  const algorithmColors = createColorsArray(algorithms.length, { start: 0.1, end: 1, reverse: false, interpolateFunc: interpolateTurbo });
  const timestamps = timeSeriesData.map(ts => ts.timestamp);


  const getColor = (key: string): string => {
    const algo = algorithms.map(a => a.name).indexOf(key);
    return algo !== -1 ? algorithmColors[algo] : "#e0e0e0";
  };

  const filterByAlgo = (algo_id: string): { start: string; end: string }[] => {
    const segments: { start: string; end: string }[] = [];
    classificationsPerSegment.forEach(segment => {
      const needle = segment.algos.find(a => a.algo.$oid === algo_id);
      if(needle) {
        segments.push({ start: findClosestDate(timestamps, segment.start.$date), end: findClosestDate(timestamps, segment.end.$date) });
      }
    });
    return segments;
  };

  const ensembleClassification = (classification_ensemble: string): { start: string; end: string }[] => {
    const segments: { start: string; end: string }[] = [];
    classificationsPerSegment.forEach(segment => {
      const majority_vote = (segment.algos.length / algorithms.length) > 0.5;
      const max_vote = segment.algos.length >= 1;
      if((classification_ensemble === "majority" && majority_vote) || (classification_ensemble === "max" && max_vote)) {
        segments.push({ start: findClosestDate(timestamps, segment.start.$date), end: findClosestDate(timestamps, segment.end.$date) });
      }
    });
    return segments;
  };

  const formatTS = (value: string, name: string): [string, string] => {
    return [value, name.split(".")[1]];
  };

  const update_bucket_classification_ensemble = async (new_ensemble_setting: string): Promise<void> => {
    await ApiRoutes.updateBucket.fetch({
      data: { id: bucket._id.$oid, classification_ensemble: new_ensemble_setting },
    });
    await queryClient.invalidateQueries();
  };

  if(bucket.classification_granularity === "full") {
    return <div>
      <p className="font-semibold">Algorithms classifying this time series as anomalous:</p>
      {algorithms.map((algo, idx) => <p>{filterByAlgo(algo._id.$oid).length > 0 && algo.name}</p>)}
    </div>;
  }


  return <div>
    {algorithms.map((algo, idx) =>
      <>
        <span className="font-semibold" style={{ color: getColor(algo.name) }}>{algo.name} {algo.name !== algo.algorithm && <span>({algo.algorithm})</span>}</span>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeSeriesData} margin={{ top: 5, bottom: 5 }}>
            <XAxis dataKey="timestamp" angle={-45} tick={false}/>
            <YAxis type="number" allowDataOverflow yAxisId="1" domain={[min_value, max_value]}/>
            <Line
              type="monotone" dataKey={`value`}
              stroke={"black"}
              strokeWidth={2}
              yAxisId="1"
              isAnimationActive={false}
              dot={false}
            />
            <Tooltip formatter={formatTS}/>
            {filterByAlgo(algo._id.$oid).map(segment =>
              <ReferenceArea yAxisId="1" x1={segment.start} x2={segment.end} strokeOpacity={0.3} fillOpacity={0.3} fill={getColor(algo.name)}/>,
            )}
          </LineChart>
        </ResponsiveContainer>
      </>,
    )}
    <hr className={"border-black/80 my-3"}/>
    <div className="flex flex-row justify-between">
      <span className="font-semibold">Ensemble Classification</span>
      {canEdit && <div className="flex flex-row gap-2">
        <button onClick={() => update_bucket_classification_ensemble("majority")}
          className={`rounded-md px-3 py-1 text-sm font-medium ${bucket.classification_ensemble === "majority" ? "text-indigo-700 bg-indigo-100" : "text-gray-500 hover:text-gray-700"}`}>Majority Vote
        </button>
        <button onClick={() => update_bucket_classification_ensemble("max")}
          className={`rounded-md px-3 py-1 text-sm font-medium ${bucket.classification_ensemble === "max" ? "text-indigo-700 bg-indigo-100" : "text-gray-500 hover:text-gray-700"}`} aria-current="page">Max Vote
          (Logical OR)
        </button>
      </div>}
      {!canEdit && <span>{bucket.classification_ensemble === "majority" ? "Majority Vote" : "Max Vote (Logical OR)"}</span>}
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={timeSeriesData} margin={{ top: 5, bottom: 5 }}>
        <XAxis dataKey="timestamp" angle={-45} tick={false}/>
        <YAxis type="number" allowDataOverflow yAxisId="1"/>
        <Line
          type="monotone" dataKey={`value`}
          stroke={"black"}
          strokeWidth={2}
          yAxisId="1"
          isAnimationActive={false}
          dot={false}
        />
        <Tooltip formatter={formatTS}/>
        {ensembleClassification(bucket.classification_ensemble).map(segment =>
          <ReferenceArea yAxisId="1" x1={segment.start} x2={segment.end} strokeOpacity={0.3} fillOpacity={0.3} fill={"indigo"}/>,
        )}
      </LineChart>
    </ResponsiveContainer>
  </div>;

}