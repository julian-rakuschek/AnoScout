import { ClusterClassLookup, Dendrogram, AnomalyExplorerSettings, RecommenderResult, ScatterArrangement, ScatterColorings, ScatterPoint } from "../../types";
import { interpolatePlasma, interpolateRainbow, interpolateTurbo, interpolateViridis } from "d3-scale-chromatic";
import { colorMap } from "components/atoms/RatingSlider";
import { getClusters, getDValues } from "lib/helper/dendrogram";
import { makeHull } from "lib/convexHull";
import { createColorsArray } from "lib/helper/color";
import { SHAPcolors } from "lib/helper/color";

export type DataMinMax = {
  x_min: number | null;
  x_max: number | null;
  y_min: number | null;
  y_max: number | null;
};

export const decimalFormatter = (value: number): string => {
  return String(Math.round(value * 100) / 100);
};

export const getColor = (point: ScatterPoint, colorMode: ScatterColorings, recommendations: RecommenderResult, cluster_class_lookup: ClusterClassLookup, nClusters: number): string => {
  const recommender_index = recommendations.find(r => r[1].$oid === point._id.$oid);
  const cluster_class = cluster_class_lookup[point._id.$oid];
  const colorsTurbo = createColorsArray(nClusters, { start: 0, end: 1, reverse: true, interpolateFunc: interpolateTurbo });
  const colorsRainbow = createColorsArray(nClusters, { start: 0, end: 1, reverse: true, interpolateFunc: interpolateRainbow });

  switch(colorMode) {
    case ScatterColorings.SEVERITY:
      return SHAPcolors(point.length_score);
    case ScatterColorings.RATINGS:
      return colorMap[point.rating];
    case ScatterColorings.VIEWS:
      return interpolateViridis(point.views_norm);
    case ScatterColorings.RECOMMENDER:
      return SHAPcolors(recommender_index ? recommender_index[0] : 0);
    case ScatterColorings.CLUSTERING:
      return colorsRainbow[cluster_class];
    case ScatterColorings.CLUSTER_RECOMMENDATIONS:
      return colorsTurbo[cluster_class];
    default:
      return SHAPcolors(point.length_score);
  }
};

export const getPosition = (point: ScatterPoint, pointArrangement: ScatterArrangement): [number, number] => {
  switch(pointArrangement) {
    case ScatterArrangement.SEVERITY:
      return [point.length, point.score];
    case ScatterArrangement.PROJECTION:
      return [point.projected.x, point.projected.y];
    default:
      return [point.length, point.score];
  }
};

export const getDataKey = (pointArrangement: ScatterArrangement): [string, string] => {
  switch(pointArrangement) {
    case ScatterArrangement.SEVERITY:
      return ["length", "score"];
    case ScatterArrangement.PROJECTION:
      return ["projected.x", "projected.y"];
    default:
      return ["length", "score"];
  }
};

export const calcMinMax = (data: ScatterPoint[], settings: AnomalyExplorerSettings, padding: number): DataMinMax => {
  const x_vals: number[] = data.map(point => getPosition(point, settings.scatterPointArrangement)[0]);
  const y_vals: number[] = data.map(point => getPosition(point, settings.scatterPointArrangement)[1]);
  const x_span = Math.abs(Math.max.apply(Math, x_vals) - Math.min.apply(Math, x_vals));
  const y_span = Math.abs(Math.max.apply(Math, y_vals) - Math.min.apply(Math, y_vals));
  return {
    x_min: Math.min.apply(Math, x_vals) - x_span * padding,
    x_max: Math.max.apply(Math, x_vals) + x_span * padding,
    y_min: Math.min.apply(Math, y_vals) - y_span * padding,
    y_max: Math.max.apply(Math, y_vals) + y_span * padding,
  };
};

export const getConvexHulls = (data: ScatterPoint[], dendrogram: Dendrogram, nClusters: number): {x: number; y: number; id: string}[][] => {
  const dVals = getDValues(dendrogram).sort((a, b) => a - b);
  const clusters = getClusters(dendrogram, dVals[dVals.length - nClusters]);
  const filtered_clusters = clusters.map(c => c.filter(a => data.find(s => s._id.$oid === a.AID)));
  const points = filtered_clusters
    .filter(c => c.length > 2)
    .map(c => c.map(a => data.find(s => s._id.$oid === a.AID)))
    .map(c => c.filter((item): item is ScatterPoint => !!item).map(a => {return { x: a.projected.x, y: a.projected.y, id: a._id.$oid }; }));
  return points.map(p => makeHull(p));
};

export const getConvexHullColor = (representativeId: string, colorMode: ScatterColorings, cluster_class_lookup: ClusterClassLookup, nClusters: number): string => {
  const cluster = cluster_class_lookup[representativeId];
  const colorsPlasma = createColorsArray(nClusters, { start: 0, end: 1, reverse: true, interpolateFunc: interpolateTurbo });
  const colorsRainbow = createColorsArray(nClusters, { start: 0, end: 1, reverse: true, interpolateFunc: interpolateRainbow });

  switch(colorMode) {
    case ScatterColorings.CLUSTERING:
      return colorsRainbow[cluster];
    case ScatterColorings.CLUSTER_RECOMMENDATIONS:
      return colorsPlasma[cluster];
    default:
      return colorsRainbow[cluster];
  }
};