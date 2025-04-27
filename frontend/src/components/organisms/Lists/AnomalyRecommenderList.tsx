import { Anomaly, Bucket, RecAlgo, ScatterPoint } from "../../../types";
import { useAtomValue } from "jotai/index";
import { selectedAnomalyAtom } from "lib/atoms";
import React, { forwardRef, useEffect, useRef } from "react";
import { useBucketAlgorithms, useBucketAnomalies, useRecommendations } from "lib/hooks";
import { GridComponents, VirtuosoGrid } from "react-virtuoso";
import AnomalyCard, { AnomalyCardType } from "components/molecules/Cards/AnomalyCard";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import { interpolateTurbo } from "d3-scale-chromatic";
import { SHAPcolors } from "lib/helper/color";

type RecommenderListProps = {
  bucket: Bucket;
  recMethod: RecAlgo;
  onlyShowUnrated: boolean;
  hideNegativeRated: boolean;
  filteredData?: ScatterPoint[];
};

const gridComponents: GridComponents = {
  List: forwardRef(({ style, children, ...props }, ref) => (
    <div ref={ref} {...props} className="flex flex-wrap justify-center" style={style}>{children}</div>
  )),
  Item: ({ children, ...props }) => (
    <div {...props} className="w-[300px] flex p-4">{children}</div>
  ),
};


export default function AnomalyRecommenderList({ bucket, recMethod, onlyShowUnrated, hideNegativeRated, filteredData }: RecommenderListProps): JSX.Element {
  const bucketId = bucket._id.$oid;
  const selected = useAtomValue(selectedAnomalyAtom);
  let anomalies = useBucketAnomalies(bucketId, false);
  const scoringAlgos = useBucketAlgorithms(bucketId).filter(a => a.type === "scoring");
  const recommendations = useRecommendations(bucketId, recMethod);
  const virtuoso = useRef(null);

  useEffect(() => {
    if(!anomalies) return;
    const index = !selected ? 0 : anomalies.map(a => a._id.$oid).indexOf(selected);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    virtuoso.current.scrollToIndex(index);
  }, [selected]);

  if(!recommendations || anomalies === undefined) return <div className="w-full h-full flex justify-center items-center"><CenteredLoadingSpinner/></div>;

  anomalies = recommendations.map(r => anomalies.find(a => a._id.$oid === r[1].$oid)!);
  anomalies = anomalies.filter(a => (hideNegativeRated ? a.rating > -1 : true) && (onlyShowUnrated ? a.rating === 0 : true));
  if(filteredData) anomalies = anomalies.filter(a => filteredData.find(s => s._id.$oid === a._id.$oid));

  return (
    <VirtuosoGrid
      ref={virtuoso}
      totalCount={anomalies.length}
      components={gridComponents}
      itemContent={index =>
        <div className="w-full overflow-hidden shadow-lg" style={{ height: 180 + 20 * scoringAlgos.length }}>
          <AnomalyCard hideLocationIndicator={bucket.type === "classification"} key={anomalies[index]._id.$oid} AID={anomalies[index]._id.$oid} cardType={AnomalyCardType.RECOMMENDER} compact color={
            filteredData ? SHAPcolors(filteredData.find(s => s._id.$oid === anomalies[index]._id.$oid)?.length_score ?? 0) : undefined
          }/>
        </div>
      }
    />
  );
}