import { Bucket, AnomalyExplorerSettings, ScatterArrangement, ScatterColorings, ScatterPoint } from "../../../types";
import { CartesianGrid, Cell, Label, ReferenceArea, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { useAtom } from "jotai";
import { hoveringAnomalyAtom, selectedAnomalyAtom } from "lib/atoms";
import React, { useEffect, useState } from "react";
import { CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useAnomalyClustering, useRecommendations, useTimeSeriesScatter } from "lib/hooks";
import { getAnomalyClusterLookup } from "lib/helper/dendrogram";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import ConvexHull from "components/atoms/ConvexHull";
import { calcMinMax, DataMinMax, decimalFormatter, getColor, getConvexHullColor, getConvexHulls, getDataKey, getPosition } from "lib/helper/scatter";
import AnomalyTooltip from "components/molecules/Cards/AnomalyTooltip";

type ScatterProps = {
  bucket: Bucket;
  settings: AnomalyExplorerSettings;
  setFiltered?: (data: ScatterPoint[]) => void;
  hideAxis: boolean;
};


const defaultMinMax: DataMinMax = { x_min: null, x_max: null, y_min: null, y_max: null };
const PADDING = 0.1;

export default function AnomalyScatterPlot({ bucket, settings, setFiltered, hideAxis }: ScatterProps): JSX.Element {
  const bucketId = bucket._id.$oid;
  const scatterPoints = useTimeSeriesScatter(bucketId);
  const dendrogram = useAnomalyClustering(bucketId);
  const recommendations = useRecommendations(bucketId, settings.recommenderAlgorithm);
  const [hovering, setHovering] = useAtom(hoveringAnomalyAtom);
  const [selected, setSelected] = useAtom(selectedAnomalyAtom);
  const [filteredData, setFilteredData] = useState(scatterPoints);
  const [zoomArea, setZoomArea] = useState<DataMinMax>(defaultMinMax);
  const [isZooming, setIsZooming] = useState(false);
  const [dataMinMax, setDataMinMax] = useState<DataMinMax>(defaultMinMax);

  useEffect(() => {
    setFilteredData(scatterPoints);
    setZoomArea(defaultMinMax);
  }, [scatterPoints.length]);

  useEffect(() => {
    setDataMinMax(calcMinMax(filteredData, settings, PADDING));
    if(setFiltered) setFiltered(filteredData);
  }, [filteredData, settings.scatterPointArrangement]);

  if(dendrogram === undefined || !recommendations) return <div className="w-full h-full flex justify-center items-center">
    <CenteredLoadingSpinner/>
  </div>;

  const cluster_lookup = getAnomalyClusterLookup(dendrogram, settings.nClusters);
  const cluster_lookup_sorted = getAnomalyClusterLookup(dendrogram, settings.nClusters, recommendations);
  const convex_hulls = getConvexHulls(filteredData, dendrogram, settings.nClusters);

  function handleMouseDown(nextState?: CategoricalChartState): void {
    setIsZooming(!settings.scatterDisableZoom);
    const { chartX, chartY, xValue, yValue } = nextState ?? {};
    if(!settings.scatterDisableZoom) setZoomArea({ x_min: xValue ?? null, y_min: yValue ?? null, x_max: xValue ?? null, y_max: yValue ?? null });
  }

  // Update zoom end coordinates
  function handleMouseMove(e: CategoricalChartState): void {
    if(isZooming) {
      setZoomArea(prev => ({ ...prev, x_max: e.xValue ?? null, y_max: e.yValue ?? null }));
    }
  }

  // When zooming stops, update with filtered data points
  // Ignore if not enough zoom
  function handleMouseUp(e: CategoricalChartState): void {
    if(!isZooming) return;
    setIsZooming(false);
    let { x_min, y_min, x_max, y_max } = zoomArea;
    if(!x_min || !y_min || !x_max || !y_max || !dataMinMax.y_max || !dataMinMax.y_min || !dataMinMax.x_max || !dataMinMax.x_min) return;
    if(x_min > x_max) [x_min, x_max] = [x_max, x_min];
    if(y_min > y_max) [y_min, y_max] = [y_max, y_min];
    const zoom_total_area = Math.abs(x_min - x_max) * Math.abs(y_min - y_max);
    const chart_total_area = Math.abs(dataMinMax.x_max - dataMinMax.x_min) * Math.abs(dataMinMax.y_max - dataMinMax.y_min);
    if(zoom_total_area / chart_total_area <= 0.001) return;
    const dataPointsInRange = filteredData.filter(point => {
      if(!x_min || !y_min || !x_max || !y_max) return false;
      const pos = getPosition(point, settings.scatterPointArrangement);
      return pos[0] >= x_min && pos[0] <= x_max && pos[1] >= y_min && pos[1] <= y_max;
    });
    setFilteredData(dataPointsInRange);
    setZoomArea(defaultMinMax);
  }

  const handleSelect = (AID: string): void => {
    setSelected(AID);
    void ApiRoutes.increaseViewcount.fetch({ params: { AID } });
  };

  return <div className="w-full h-full flex flex-col pl-2">
    {!settings.scatterDisableZoom && <div className="flex flex-row justify-center px-5">
      {filteredData.length === scatterPoints.length ?
        <p className="text-black/60">Mark an area to zoom in</p> :
        <button
          onClick={() => setFilteredData(scatterPoints)}
          className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-200 transition"
        >
          Reset Zoom
        </button>
      }
    </div>}
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <CartesianGrid/>
        <XAxis hide={hideAxis} type="number" dataKey={getDataKey(settings.scatterPointArrangement)[0]} domain={[dataMinMax.x_min ?? "dataMin", dataMinMax.x_max ?? "dataMax"]} tickFormatter={(value, index) => decimalFormatter(value)}>
          {settings.scatterPointArrangement === ScatterArrangement.SEVERITY && <Label value="Anomaly Length" offset={-3} position="insideBottom"/>}
        </XAxis>
        <YAxis hide={hideAxis} type="number" dataKey={getDataKey(settings.scatterPointArrangement)[1]} domain={[dataMinMax.y_min ?? "dataMin", dataMinMax.y_max ?? "dataMax"]} tickFormatter={(value, index) => decimalFormatter(value)}>
          {settings.scatterPointArrangement === ScatterArrangement.SEVERITY && <Label value="Anomaly Score" offset={0} position="insideLeft" angle={-90}/>}
        </YAxis>
        {isZooming && (
          <ReferenceArea
            x1={zoomArea.x_min ?? undefined}
            x2={zoomArea.x_max ?? undefined}
            y1={zoomArea.y_min ?? undefined}
            y2={zoomArea.y_max ?? undefined}
          />
        )}
        {settings.scatterConvexHull &&
          (settings.scatterColoring === ScatterColorings.CLUSTERING || settings.scatterColoring === ScatterColorings.CLUSTER_RECOMMENDATIONS) &&
          settings.scatterPointArrangement === ScatterArrangement.PROJECTION && convex_hulls.map(ch =>
          <ReferenceArea
            x1={dataMinMax.x_min ?? undefined}
            x2={dataMinMax.x_max ?? undefined}
            y1={dataMinMax.y_min ?? undefined}
            y2={dataMinMax.y_max ?? undefined}
            shape={
              <ConvexHull points={ch} color={
                getConvexHullColor(
                  ch[0].id, settings.scatterColoring,
                  settings.scatterColoring === ScatterColorings.CLUSTER_RECOMMENDATIONS ? cluster_lookup_sorted : cluster_lookup,
                  settings.nClusters,
                )}/>
            }
          />,
        )}
        <Scatter name="Anomalies" data={filteredData} fill="#8884d8" isAnimationActive={false}>
          {filteredData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getColor(
                entry, settings.scatterColoring, recommendations,
                settings.scatterColoring === ScatterColorings.CLUSTER_RECOMMENDATIONS ? cluster_lookup_sorted : cluster_lookup,
                settings.nClusters,
              )}
              strokeWidth={2}
              stroke={(entry._id.$oid === selected || entry._id.$oid === hovering) ? "red" : ""}
              onMouseUp={() => handleSelect(entry._id.$oid)}
              onClick={() => handleSelect(entry._id.$oid)}
              onMouseOver={() => setHovering(entry._id.$oid)}
              onMouseOut={() => setHovering("")}
            />
          ))}
        </Scatter>
        <Tooltip content={<AnomalyTooltip  AID={hovering}/>} cursor={false} />
      </ScatterChart>
    </ResponsiveContainer>
  </div>;
}