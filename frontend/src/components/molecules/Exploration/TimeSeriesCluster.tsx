import { ReactElement, useEffect, useRef, useState } from "react";
import { Dendrogram, DendrogramTimeSeries, TimeSeriesClusterSemanticZoomState, TimeSeriesListSettingsType } from "../../../types";
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import TimeSeriesCard from "components/molecules/Cards/TimeSeriesCard";
import React from "react";
import { useSetAtom } from "jotai/index";
import { somSemanticZoomAtom } from "lib/atoms";
import { useNavigate } from "react-router";
import { getDValues, getSubTrees, getAllLeafs } from "lib/helper/dendrogram";

export default function TimeSeriesCluster({ BID, cluster, settings, pushTsSubCluster, min, max }: {
  BID: string;
  cluster: Dendrogram<DendrogramTimeSeries>;
  settings: TimeSeriesListSettingsType;
  pushTsSubCluster: (c: Dendrogram<DendrogramTimeSeries>) => void;
  min: number;
  max: number;
}): ReactElement {
  const setSemanticZoomState = useSetAtom(somSemanticZoomAtom);
  const zoomRef = useRef<ReactZoomPanPinchRef>(null);
  const navigate = useNavigate();

  const all_distance_values = [0, ...getDValues(cluster)].sort((a, b) => a - b);
  const d_value = all_distance_values[Math.max(0, all_distance_values.length - (settings.cluster * settings.cluster))];
  const clusters = getSubTrees<DendrogramTimeSeries>(cluster, d_value);

  const font_sizes: { [size: number]: number } = { 2: 13, 3: 13, 4: 12, 5: 11, 6: 10, 7: 9 };
  const grid_settings: { [size: number]: TimeSeriesClusterSemanticZoomState } = {
    2: { lineChartInteractive: true, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 1, heatmapCellsX: 40, heatmapCellsY: 20 },
    3: { lineChartInteractive: true, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 3, heatmapCellsX: 30, heatmapCellsY: 15 },
    4: { lineChartInteractive: false, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 5, heatmapCellsX: 20, heatmapCellsY: 10 },
    5: { lineChartInteractive: false, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 7, heatmapCellsX: 15, heatmapCellsY: 7 },
    6: { lineChartInteractive: false, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 9, heatmapCellsX: 12, heatmapCellsY: 6 },
    7: { lineChartInteractive: false, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 11, heatmapCellsX: 10, heatmapCellsY: 5 },
  };

  useEffect(() => {
    setSemanticZoomState(grid_settings[settings.cluster]);
    if(zoomRef.current) zoomRef.current.resetTransform();
  }, [settings.cluster]);

  const cardClick = (sub_cluster: Dendrogram<DendrogramTimeSeries>): void => {
    const leafs = getAllLeafs(sub_cluster);
    if(leafs.length > 1) pushTsSubCluster(sub_cluster);
    else navigate(`/buckets/${BID}/timeSeries/${leafs[0].TID}`);
  };

  const updateSemanticZoomState = (scale: number): void => {
    if(settings.cluster === 3) {
      if(scale > 1.5) setSemanticZoomState(grid_settings[2]);
      else setSemanticZoomState(grid_settings[3]);
    }
    if(settings.cluster === 4) {
      if(scale > 2) setSemanticZoomState(grid_settings[2]);
      else if(scale > 1.4) setSemanticZoomState(grid_settings[3]);
      else setSemanticZoomState(grid_settings[4]);
    }
    if(settings.cluster === 5) {
      if(scale > 2.6) setSemanticZoomState(grid_settings[2]);
      else if(scale > 1.8) setSemanticZoomState(grid_settings[3]);
      else if(scale > 1.4) setSemanticZoomState(grid_settings[4]);
      else setSemanticZoomState(grid_settings[5]);
    }
    if(settings.cluster === 6) {
      if(scale > 3) setSemanticZoomState(grid_settings[2]);
      else if(scale > 2.2) setSemanticZoomState(grid_settings[3]);
      else if(scale > 1.6) setSemanticZoomState(grid_settings[4]);
      else if(scale > 1.2) setSemanticZoomState(grid_settings[5]);
      else setSemanticZoomState(grid_settings[6]);
    }
    if(settings.cluster === 7) {
      if(scale > 3.6) setSemanticZoomState(grid_settings[2]);
      else if(scale > 2.4) setSemanticZoomState(grid_settings[3]);
      else if(scale > 1.8) setSemanticZoomState(grid_settings[4]);
      else if(scale > 1.4) setSemanticZoomState(grid_settings[5]);
      else if(scale > 1.2) setSemanticZoomState(grid_settings[6]);
      else setSemanticZoomState(grid_settings[7]);
    }
  };


  return (
    <TransformWrapper ref={zoomRef} maxScale={20} smooth={false} disablePadding={true} onTransformed={(ref, state) => updateSemanticZoomState(state.scale)}>
      <TransformComponent contentStyle={{ width: "100%", height: "100%" }} wrapperStyle={{ width: "100%", height: "100%" }}>
        <div
          className={`grid w-full h-full ${settings.cluster < 5 ? "gap-4" : "gap-1"} p-4`}
          style={{
            gridTemplateColumns: `repeat(${settings.cluster}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${settings.cluster}, minmax(0, 1fr))`,
          }}
        >
          {clusters.map((sub_tree, clusterIdx) => (
            <div key={`cell-${clusterIdx}`} className="w-full h-full">
              <TimeSeriesCard
                BID={BID}
                settings={settings}
                simple={false}
                tsList={getAllLeafs<DendrogramTimeSeries>(sub_tree).map(d => d.TID)}
                handleClick={() => cardClick(sub_tree)}
                min={min}
                max={max}
              />
            </div>
          ))}
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}