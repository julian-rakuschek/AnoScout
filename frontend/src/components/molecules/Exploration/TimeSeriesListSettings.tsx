import { ReactElement, useEffect } from "react";
import { BucketMinMax, TimeSeriesListSettingsType, TimeSeriesVis } from "../../../types";
import { Slider } from "@mui/material";
import TimeSeriesValuesDistribution from "components/molecules/Exploration/TimeSeriesValuesDistribution";
import ScoreDistribution from "components/molecules/ScoreDistribution";
import { useBucket, useBucketChannels } from "lib/hooks";
import Select from "react-select";
import { shap_color_gradient, viridis_color_gradient } from "lib/helper/color";

export enum LISTTYPE {
  GRID,
  CLUSTER
}


export default function TimeSeriesListSettings({ BID, channels, settings, setSettings, bucket_min_max, list_type }: {
  BID: string;
  settings: TimeSeriesListSettingsType;
  setSettings: (s: TimeSeriesListSettingsType) => void;
  bucket_min_max: BucketMinMax;
  channels: string[];
  list_type: LISTTYPE;
}): ReactElement {
  const style_grid_size_button_inactive = "bg-white cursor-default rounded-md shadow-md px-3 py-1 transition hover:bg-indigo-600 hover:text-white text-sm";
  const style_grid_size_button_active = "bg-indigo-700 text-white cursor-default rounded-md shadow-md px-3 py-1 text-sm";
  const bucket = useBucket(BID);

  const setGridSize = (s: number): void => {
    setSettings({ ...settings, cluster: s });
  };

  const setChartType = (v: TimeSeriesVis): void => {
    setSettings({ ...settings, visualization: v });
  };

  return <div className={"h-full w-full flex flex-col items-center gap-2 px-2 text-left"}>
    {list_type === LISTTYPE.GRID && <>
      <p className={"font-semibold text-lg text-left w-full"}>Time Series Grid</p>
      <p className="w-full text-left text-sm">
        Each card shows one time series. The indicator in the top right shows the algorithm sensitivity for the corresponding time series.
        The bar below the time series indicates the ensemble score across the time series.
      </p>
    </>}
    {list_type === LISTTYPE.CLUSTER && <>
      <p className={"font-semibold text-lg text-left w-full"}>Time Series Cluster</p>
      <p className="w-full text-left text-sm">
        In this view, all time series are clustered by their similarity.
        Click on a card to further inspect elements within the cluster.
        Use the mouse wheel to zoom in to cards.
      </p>
    </>}
    <p className={"text-left font-semibold w-full"}>Channel</p>
    <select
      value={settings.channel}
      onChange={e => setSettings({ ...settings, channel: e.target.value })}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
    >
      {channels.map(channel => (
        <option key={channel} value={channel}>
          {channel}
        </option>
      ))}
    </select>
    {list_type === LISTTYPE.CLUSTER && <>
      <p className={"text-left font-semibold w-full"}>Grid Size</p>
      <div className={"w-full flex flex-row flex-wrap gap-2 justify-start"}>
        <div className={settings.cluster === 3 ? style_grid_size_button_active : style_grid_size_button_inactive} onClick={() => setGridSize(3)}>3 x 3</div>
        <div className={settings.cluster === 4 ? style_grid_size_button_active : style_grid_size_button_inactive} onClick={() => setGridSize(4)}>4 x 4</div>
        <div className={settings.cluster === 5 ? style_grid_size_button_active : style_grid_size_button_inactive} onClick={() => setGridSize(5)}>5 x 5</div>
        <div className={settings.cluster === 6 ? style_grid_size_button_active : style_grid_size_button_inactive} onClick={() => setGridSize(6)}>6 x 6</div>
        <div className={settings.cluster === 7 ? style_grid_size_button_active : style_grid_size_button_inactive} onClick={() => setGridSize(7)}>7 x 7</div>
      </div>
    </>}
    <p className={"text-left font-semibold w-full"}>Chart Type</p>
    <div className={"w-full flex flex-row flex-wrap gap-2 justify-start"}>
      <div className={settings.visualization === TimeSeriesVis.LINE ? style_grid_size_button_active : style_grid_size_button_inactive} onClick={() => setChartType(TimeSeriesVis.LINE)}>Line
      </div>
      <div className={settings.visualization === TimeSeriesVis.HORIZON ? style_grid_size_button_active : style_grid_size_button_inactive}
           onClick={() => setChartType(TimeSeriesVis.HORIZON)}>Horizon
      </div>
      <div className={settings.visualization === TimeSeriesVis.HEATMAP ? style_grid_size_button_active : style_grid_size_button_inactive}
           onClick={() => setChartType(TimeSeriesVis.HEATMAP)}>Heatmap
      </div>
    </div>
    <p className={"text-left font-semibold w-full"}>Value Distribution</p>
    <p className={"text-xs text-black/80"}>Applies only when using horizon or heatmap visualization.</p>
    <div className={"w-full h-[100px]"}>
      <TimeSeriesValuesDistribution bucket_min_max={bucket_min_max}/>
    </div>
    <div className="grid grid-cols-4 place-items-center w-full">
      <span className="text-sm text-gray-700 col-span-1">{bucket_min_max.min.toFixed(2)}</span>
      <div className="w-full h-[10px] col-span-2" style={{ background: viridis_color_gradient }}></div>
      <span className="text-sm text-gray-700 col-span-1">{bucket_min_max.max.toFixed(2)}</span>
    </div>
    {bucket && bucket.type === "scoring" && <>
      <p className={"text-left font-semibold w-full"}>Score Distribution</p>
      <ScoreDistribution BID={BID} channel={settings.channel} updateFunction={(min, max) => setSettings({ ...settings, scoreMin: min, scoreMax: max })}/>
      <div className="grid grid-cols-4 place-items-center w-full">
        <span className="text-sm text-gray-700 col-span-1">0 (normal)</span>
        <div className="w-full h-[10px] col-span-2" style={{ background: shap_color_gradient }}></div>
        <span className="text-sm text-gray-700 col-span-1">1 (anomaly)</span>
      </div>
    </>}
  </div>;
}