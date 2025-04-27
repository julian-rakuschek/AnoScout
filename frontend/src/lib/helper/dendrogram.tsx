import { ClusterClassLookup, Dendrogram, DendrogramAnomaly, DendrogramTimeSeries, AnomalyExplorerSettings, RecommenderResult } from "../../types";
import * as dns from "node:dns";

export function getDValues(dendrogram: Dendrogram): number[] {
  let left = [] as number[];
  let right = [] as number[];

  if(dendrogram.left) left = [...getDValues(dendrogram.left)];
  if(dendrogram.right) right = [...getDValues(dendrogram.right)];
  if(dendrogram.dist !== undefined) return [...left, dendrogram.dist, ...right];
  return [...left, ...right];
}

export function getAllLeafs<TimeSeriesOrAnomaly>(dendrogram: Dendrogram<TimeSeriesOrAnomaly>): TimeSeriesOrAnomaly[] {
  let left = [] as TimeSeriesOrAnomaly[];
  let right = [] as TimeSeriesOrAnomaly[];

  if(dendrogram.left) left = [...getAllLeafs(dendrogram.left)];
  if(dendrogram.right) right = [...getAllLeafs(dendrogram.right)];
  let ret: TimeSeriesOrAnomaly[] = [...left, ...right];
  if(!dendrogram.left && !dendrogram.right && dendrogram.meta !== undefined) ret = [dendrogram.meta, ...ret];
  return ret;
}

export function isIDinTree<TimeSeriesOrAnomaly>(dendrogram: Dendrogram<TimeSeriesOrAnomaly>, nodeID: number): boolean {
  if(dendrogram.id === nodeID) return true;

  if(dendrogram.left) {
    const branch_result = isIDinTree(dendrogram.left, nodeID);
    if(branch_result) return true;
  }

  if(dendrogram.right) {
    const branch_result = isIDinTree(dendrogram.right, nodeID);
    if(branch_result) return true;
  }

  return false;
}

export function getClusters<TimeSeriesOrAnomaly>(dendrogram: Dendrogram<TimeSeriesOrAnomaly>, d: number): TimeSeriesOrAnomaly[][] {
  if((dendrogram.dist !== undefined) && dendrogram.dist > d) {
    const leftNodes = dendrogram.left ? getClusters<TimeSeriesOrAnomaly>(dendrogram.left, d) : [];
    const rightNodes = dendrogram.right ? getClusters<TimeSeriesOrAnomaly>(dendrogram.right, d) : [];
    return [...leftNodes, ...rightNodes];
  }
  return [getAllLeafs<TimeSeriesOrAnomaly>(dendrogram)];
}

export function getSubTrees<TimeSeriesOrAnomaly>(dendrogram: Dendrogram<TimeSeriesOrAnomaly>, d: number): Dendrogram<TimeSeriesOrAnomaly>[] {
  if((dendrogram.dist !== undefined) && dendrogram.dist > d) {
    const leftNodes = dendrogram.left ? getSubTrees<TimeSeriesOrAnomaly>(dendrogram.left, d) : [];
    const rightNodes = dendrogram.right ? getSubTrees<TimeSeriesOrAnomaly>(dendrogram.right, d) : [];
    return [...leftNodes, ...rightNodes];
  }
  return [dendrogram];
}

export function findAnomalyClusterIndex(clusters: DendrogramAnomaly[][], needle: string): [number, number] | undefined {
  for(let i = 0; i < clusters.length; i++) {
    for(let j = 0; j < clusters[i].length; j++) {
      if(clusters[i][j].AID === needle) return [i, j];
    }
  }
  return undefined;
}

export function getAnomalyClusterLookup(dendrogram: Dendrogram<DendrogramAnomaly>, nClusters: number, recommendations?: RecommenderResult): ClusterClassLookup {
  const dVals = getDValues(dendrogram).sort((a, b) => a - b);
  const clusters = recommendations
    ? getSortedAnomalyClusters(dendrogram, { nClusters: nClusters, hideNegative: false, showOnlyUnrated: false }, recommendations)
    : getClusters(dendrogram, dVals[dVals.length - nClusters]);
  const cluster_dict: { [key: string]: number } = {};
  clusters.forEach((c, idx) => c.forEach(a => {
    cluster_dict[a.AID] = idx;
  }));
  return cluster_dict;
}

export function getSortedAnomalyClusters(dendrogram: Dendrogram<DendrogramAnomaly>, settings: {nClusters: number; hideNegative: boolean; showOnlyUnrated: boolean}, recommendations: RecommenderResult): DendrogramAnomaly[][] {
  function averagePosition(c: DendrogramAnomaly[]): number {
    const positions = c.map(a => recommendations.find(r => r[1].$oid === a.AID)![0]);
    return positions.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / positions.length;
  }

  const dVals = getDValues(dendrogram).sort((a, b) => a - b);
  const clusters = getClusters(dendrogram, dVals[dVals.length - settings.nClusters]);
  const clusters_filtered = clusters.map(
    cluster => cluster.filter(a => (settings.hideNegative ? a.rating > -1 : true) && (settings.showOnlyUnrated ? a.rating === 0 : true)),
  ).filter(c => c.length > 0);
  clusters_filtered.forEach(c => c.sort((a, b) => recommendations.find(r => r[1].$oid === b.AID)![0] - recommendations.find(r => r[1].$oid === a.AID)![0]));
  clusters_filtered.sort((a, b) => averagePosition(b) - averagePosition(a));
  return clusters_filtered;
}
