import { Bucket, Dendrogram, AnomalyExplorerSettings, RecommenderResult } from "../../../types";
import { findAnomalyClusterIndex, getSortedAnomalyClusters } from "lib/helper/dendrogram";
import { createColorsArray, hexToRgba } from "lib/helper/color";
import { interpolateTurbo } from "d3-scale-chromatic";
import AnomalyCard, { AnomalyCardType } from "components/molecules/Cards/AnomalyCard";
import { useAtomValue } from "jotai/index";
import { selectedAnomalyAtom } from "lib/atoms";
import React, { useEffect } from "react";
import AnomalyTimeSeries from "components/molecules/TimeSeries/AnomalyTimeSeries";
import { AutoSizer, Grid, GridCellProps, List, ListRowProps, WindowScroller } from "react-virtualized";
import { useAnomalyClustering, useBucketAlgorithms, useRecommendations } from "lib/hooks";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";


const listRef = React.createRef<List>();

export default function AnomalyClusterView({ bucket, settings }: { bucket: Bucket; settings: AnomalyExplorerSettings }): JSX.Element {
  const BID = bucket._id.$oid;
  const selected = useAtomValue(selectedAnomalyAtom);
  const dendrogram = useAnomalyClustering(BID);
  const recommendations = useRecommendations(BID, settings.recommenderAlgorithm);
  const scoringAlgos = useBucketAlgorithms(bucket._id.$oid).filter(a => a.type === "scoring");
  const rowHeight = 180 + 20 * scoringAlgos.length;

  useEffect(() => {
    if(selected && selected !== "") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selected]);

  if(!dendrogram || !recommendations) return <div className="w-full h-full flex justify-center items-center">
    <CenteredLoadingSpinner/>
  </div>;

  const clusters = getSortedAnomalyClusters(dendrogram, settings, recommendations);
  const colors = createColorsArray(clusters.length, { start: 0, end: 1, reverse: true, interpolateFunc: interpolateTurbo });

  const scrollToSelected = (): void => {
    if(!selected || selected === "") return;
    const idx = findAnomalyClusterIndex(clusters, selected);
    if(!idx) return;
    const offset = listRef.current?.getOffsetForRow({ index: idx[0] });
    if(offset) window.scrollTo({ top: offset + window.innerHeight, behavior: "smooth" });
  };


  function rowRenderer({ key, index, style }: ListRowProps): JSX.Element {
    const cluster = clusters[index] ?? [];

    function horizontalListRenderer({ columnIndex, key, rowIndex, style }: GridCellProps): JSX.Element {
      const item = columnIndex < cluster.length ? cluster[columnIndex] : undefined;

      return (
        <div style={style} key={key}>
          <div className="w-full h-full p-2" >
            {item && <AnomalyCard
              compact={true}
              key={item.AID}
              AID={item.AID}
              cardType={AnomalyCardType.RECOMMENDER}
              hideLocationIndicator={bucket.type === "classification"}
            />}
          </div>
        </div>
      );
    }


    return (
      <div key={key} style={{ backgroundColor: colors[index] as string, ...style }}>
        <AutoSizer disableHeight>
          {({ width }) => (
            <Grid
              rowCount={1}
              rowHeight={rowHeight}
              columnCount={cluster.length}
              columnWidth={400}
              height={rowHeight}
              width={width}
              cellRenderer={horizontalListRenderer}
            />
          )}
        </AutoSizer>
      </div>
    );
  }

  return <>
    <div className="flex flex-col w-full">
      {clusters.find(a1 => a1.find(a => a.AID === selected)) && <div className="h-[200px]">
        <AnomalyTimeSeries AID={selected} BID={BID}/>
      </div>}
      {selected && selected !== "" && <div className="fixed bottom-4 right-4 bg-indigo-200 text-indigo-700 px-3 py-1 rounded-lg cursor-default z-50" onClick={() => scrollToSelected()}>Scroll to selected anomaly</div>}
    </div>
    <WindowScroller scrollElement={window}>
      {({ height, isScrolling, onChildScroll, scrollTop }) => (
        <div className="flex flex-grow flex-shrink">
          <AutoSizer disableHeight>
            {({ width }) => (
              <List
                ref={listRef}
                rowCount={clusters.length}
                rowHeight={rowHeight}
                autoHeight
                height={height}
                width={width}
                rowRenderer={rowRenderer}
                isScrolling={isScrolling}
                onScroll={onChildScroll}
                scrollTop={scrollTop}
              />
            )}
          </AutoSizer>
        </div>
      )}
    </WindowScroller>
  </>;
}