import React, { ReactElement } from "react";
import { useBucketAlgorithms, useTimeSeries, useTimeSeriesListData } from "lib/hooks";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import { TimeSeriesClusterSemanticZoomState, TimeSeriesListSettingsType, TimeSeriesVis } from "../../../types";
import { useAtomValue, useSetAtom } from "jotai/index";
import { somSemanticZoomAtom, timeSeriesPopupAtom } from "lib/atoms";
import { AnomalyScoreHeatmap } from "components/molecules/Charts/AnomalyScoreHeatmap";
import { LineChartServerRender } from "components/molecules/Charts/LineChartServerRender";
import { HorizonChart } from "components/molecules/Charts/HorizonChart";
import { TimeSeriesHeatmap } from "components/molecules/Charts/TimeSeriesHeatmap";
import AlgorithmSensitivity from "components/molecules/Charts/AlgorithmSensitivity";
import { LineChartSingle } from "components/molecules/Charts/LineChartSingle";


type TimeSeriesClusterCardProps = {
  settings: TimeSeriesListSettingsType;
  tsList: string[];
  handleClick?: () => void;
  simple: boolean;
  ignoreZoomState?: boolean;
  min?: number;
  max?: number;
  BID: string;
};

const TSName = ({ TID }: { TID: string }): ReactElement => {
  const ts = useTimeSeries(TID);

  if(!ts) return <></>;
  return <>{ts.name}</>;
};

export default function TimeSeriesCard({ settings, tsList, handleClick, simple, min, max, ignoreZoomState, BID }: TimeSeriesClusterCardProps): ReactElement {
  const data = useTimeSeriesListData(tsList, settings.channel, 1000, BID);
  const algorithms = useBucketAlgorithms(BID);
  const semanticZoomState = useAtomValue(somSemanticZoomAtom);
  const zoomState: TimeSeriesClusterSemanticZoomState = ignoreZoomState ? { lineChartInteractive: false, lineChartFontSize: 13, horizonBands: 5, heatmapCellsX: 10, heatmapCellsY: 5 } : semanticZoomState
  const setTsAtom = useSetAtom(timeSeriesPopupAtom);

  if(!data) return <CenteredLoadingSpinner/>;

  const performClickAction = (): void => {
    if(tsList.length === 1) setTsAtom(tsList[0]);
    else if(handleClick) handleClick();
  };

  return (
    <div className="w-full h-full relative bg-white shadow-xl rounded-lg transition hover:ring-4 ring-indigo-700 ring-offset-2 flex flex-col justify-start items-center overflow-hidden" onClick={() => performClickAction()}>
      {!simple && <div className={`${tsList.length > 1 ? "bg-indigo-700" : "bg-indigo-200"} text-white text-center font-semibold w-full h-[10%] grid place-items-center relative group`}>
        <svg
          height="100%"
          width="100%"
          viewBox="0 0 100 75"
          preserveAspectRatio="xMinYMid meet"
        >
          <text
            x="50%"
            y="45"
            font-size="60"
            text-anchor="left"
            dominant-baseline="middle"
            fill={tsList.length > 1 ? "white" : "#283593"}
          > {tsList.length > 1 ? <>{tsList.length} time series</> : <TSName TID={tsList[0]}/>}
          </text>
        </svg>
        <AlgorithmSensitivity algorithms={algorithms} algoSensitivity={data.sensitivity}/>
      </div>}
      <div className="w-full" style={{ height: simple ? "100%" : "85%" }}>
        {settings.visualization === TimeSeriesVis.LINE && tsList.length === 1 && <LineChartSingle TID={tsList[0]} channel={settings.channel} fontSize={zoomState.lineChartFontSize} displayAxis={zoomState.lineChartInteractive}/>}
        {settings.visualization === TimeSeriesVis.LINE && tsList.length > 1 && <LineChartServerRender data={data} channel={settings.channel} displayAxis={zoomState.lineChartInteractive}/>}
        {settings.visualization === TimeSeriesVis.HORIZON && <HorizonChart time_series={data.barycenter_values} n_segments={zoomState.horizonBands} min={min} max={max}/>}
        {settings.visualization === TimeSeriesVis.HEATMAP && <TimeSeriesHeatmap time_series={data.barycenter_values} segments_x={zoomState.heatmapCellsX} segments_y={zoomState.heatmapCellsY} min={min} max={max}/>}
      </div>
      {!simple && <div className="w-full h-[5%]">
        <AnomalyScoreHeatmap scores={data.barycenter_scores} min={settings.scoreMin} max={settings.scoreMax}/>
      </div>}
    </div>
  );
}