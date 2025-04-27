import { Bucket, TimeSeries, ToastType } from "../../../types";
import { useBucketAlgorithms, useTimeSeriesData } from "lib/hooks";
import { ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { createColorsArray } from "lib/helper/color";
import { interpolateTurbo } from "d3-scale-chromatic";
import { Slider } from "@mui/material";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useSetAtom } from "jotai/index";
import { toastAtom } from "lib/atoms";
import { useQueryClient } from "@tanstack/react-query";

export enum SCORE_DISPLAY {
  ONLY_AVG,
  AVG_AND_SCORES_ONE_PLOT,
  AVG_AND_SCORES_MULTI_PlOT,
  ONLY_POST
}

export type AnomalyDisplayOption = { value: SCORE_DISPLAY; label: string };

export const anomalyScoresDisplayOptions: AnomalyDisplayOption[] = [
  { value: SCORE_DISPLAY.ONLY_POST, label: "Show only post-processed ensemble score" },
  { value: SCORE_DISPLAY.ONLY_AVG, label: "Show only unprocessed ensemble score" },
  { value: SCORE_DISPLAY.AVG_AND_SCORES_ONE_PLOT, label: "Show ensemble score and each algorithm's output in one plot" },
  { value: SCORE_DISPLAY.AVG_AND_SCORES_MULTI_PlOT, label: "Show ensemble score and each algorithm's output in multiple plots" },
];

export type AnomalyScoresProps = {
  bucket: Bucket;
  timeSeries: TimeSeries;
  displayOption: SCORE_DISPLAY;
  readOnly: boolean;
  selectedChannel: string;
  start_date?: string;
  end_date?: string;
};

export default function AnomalyScores({ bucket, timeSeries, displayOption, readOnly, selectedChannel, start_date, end_date }: AnomalyScoresProps): JSX.Element {
  const algorithms = useBucketAlgorithms(bucket._id.$oid);
  const timeSeriesData = useTimeSeriesData(timeSeries._id.$oid, { n_segments: 1000, from: start_date, to: end_date, channel: selectedChannel });
  const algorithmColors = createColorsArray(algorithms.length, { start: 0.1, end: 1, reverse: false, interpolateFunc: interpolateTurbo });
  const [algoWeights, setAlgoWeights] = useState<number[]>(algorithms.map(a => a.weight));
  const setToast = useSetAtom(toastAtom);
  const queryClient = useQueryClient();

  const getEnsembleKey = (): string => {
    switch(displayOption) {
      case SCORE_DISPLAY.ONLY_AVG:
        return `ensemble`;
      case SCORE_DISPLAY.AVG_AND_SCORES_ONE_PLOT:
        return `ensemble`;
      case SCORE_DISPLAY.AVG_AND_SCORES_MULTI_PlOT:
        return `ensemble`;
      case SCORE_DISPLAY.ONLY_POST:
        return `ensemble_processed`;
    }
  };

  const getColor = (key: string): string => {
    const algo = algorithms.map(a => a.name).indexOf(key);
    return algo !== -1 ? algorithmColors[algo] : "#e0e0e0";
  };


  const handleWeight = async (weight: number, idx: number, save: boolean): Promise<void> => {
    const algoWeightsCopy = [...algoWeights];
    algoWeightsCopy[idx] = weight;
    setAlgoWeights(algoWeightsCopy);
    if(save) {
      const res = await ApiRoutes.updateAlgorithmWeight.fetch({
        params: { algoId: algorithms[idx]._id.$oid, weight: weight },
      });
      if(res.success) setToast({ message: "Settings updated!", type: ToastType.Success });
      else setToast({ message: "Could not save settings!", type: ToastType.Error });
      await queryClient.invalidateQueries();
    }
  };

  return <div>
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={timeSeriesData} margin={{ top: 5, bottom: 5 }}>
        <XAxis dataKey="timestamp" angle={-45} tick={false}/>
        <YAxis type="number" allowDataOverflow yAxisId="1"/>
        <Line type="monotone" dataKey={getEnsembleKey()}
          dot={false} fill={"black"} stroke={"black"} strokeWidth={2} opacity={displayOption === SCORE_DISPLAY.AVG_AND_SCORES_ONE_PLOT ? 0.7 : 1} isAnimationActive={false} yAxisId="1"/>
        {displayOption === SCORE_DISPLAY.AVG_AND_SCORES_ONE_PLOT && algorithms.map((algo, idx) =>
          <Line
            key={`score.${algo._id.$oid}`}
            type="monotone" dataKey={`scores.${algo._id.$oid}`}
            stroke={algorithmColors[idx]} dot={false} isAnimationActive={false}
            yAxisId="1"
            strokeWidth={2}
          />,
        )}
        <ReferenceLine
          yAxisId="1" y={bucket.threshold} stroke="red" strokeWidth={1}
        />
      </ComposedChart>
    </ResponsiveContainer>
    {displayOption === SCORE_DISPLAY.AVG_AND_SCORES_MULTI_PlOT && algorithms.map((algo, idx) =>
      <>
        <div className="flex w-full flex-row justify-between">
          <div className="flex items-center gap-x-3">
            <span className="font-semibold" style={{ color: getColor(algo.name) }}>{algo.name} {algo.name !== algo.algorithm && <span>({algo.algorithm})</span>}</span>
          </div>
          {!readOnly && <div className="grid grid-cols-5 justify-center items-center gap-x-5">
            <span className="text-black/80 col-span-1">Weight</span>
            <div className="col-span-3 flex justify-center items-center">
              <Slider
                sx={{ color: getColor(algo.name) }}
                min={0} max={1} step={0.01} value={algoWeights[idx]}
                onChange={(event, newValue) => handleWeight(newValue as number, idx, false)}
                onChangeCommitted={(event, newValue) => handleWeight(newValue as number, idx, true)}
                valueLabelDisplay="auto"
              />
            </div>
            <span className="text-black/80 col-span-1">{algo.weight}</span>
          </div>}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeSeriesData} margin={{ top: 5, bottom: 5 }}>
            <XAxis dataKey="timestamp" angle={-45} tick={false}/>
            <YAxis type="number" allowDataOverflow yAxisId="1"/>
            <Line
              key={`score.${algo._id.$oid}`}
              type="monotone" dataKey={`scores.${algo._id.$oid}`}
              stroke={getColor(algo.name)}
              strokeWidth={2}
              yAxisId="1"
              isAnimationActive={false}
              dot={false}
            />
            <ReferenceLine
              yAxisId="1" y={bucket.threshold} stroke="red" strokeWidth={1}
            />
          </LineChart>
        </ResponsiveContainer>
      </>,
    )}
  </div>;
}