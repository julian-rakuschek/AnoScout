import { useParams } from "react-router-dom";
import { DefaultPageWithBoundaries } from "components/organisms/DefaultPage";
import { useBucket, useBucketChannels, useTimeSeriesList } from "lib/hooks";
import TimeSeriesList from "components/organisms/Lists/TimeSeriesList";
import React, { useState } from "react";
import { AnomalyExplorerSettings, Heatmap, RecAlgo, ScatterArrangement, ScatterColorings, Tabs } from "../../../types";
import AlgoVis from "components/organisms/AlgoVis/AlgoVis";
import TimeSeriesClusterWrapper from "components/molecules/Exploration/TimeSeriesClusterWrapper";
import AnomalyList from "components/organisms/Lists/AnomalyList";
import AnomalyClusterView from "components/molecules/Exploration/AnomalyClusterView";
import { AnomalyExplorerSettingsMenuWrapper } from "components/organisms/Management/AnomalyExplorerSettingsWrapper";
import TabControlPanel from "components/organisms/TabControlPanel";
import TimeSeriesPopup from "components/organisms/Popups/TimeSeriesPopup";

const defaultAnomalyExplorerSettings: AnomalyExplorerSettings = {
  channel: null,
  heatmap: Heatmap.SEVERITY,
  hideNegative: false,
  nClusters: 4,
  nDissimilar: 3,
  recommenderAlgorithm: RecAlgo.SEVERITY,
  scatterColoring: ScatterColorings.CLUSTERING,
  scatterConvexHull: false,
  scatterDisableZoom: false,
  scatterPointArrangement: ScatterArrangement.PROJECTION,
  showOnlyUnrated: false,
};


export default function ListTimeSeriesPage(): JSX.Element {
  const { bucketId } = useParams();
  if(bucketId == null) return <></>;
  const channels = useBucketChannels(bucketId);
  const bucket = useBucket(bucketId);
  const timeSeriesList = useTimeSeriesList(bucketId);
  const [tab, setTab] = useState<Tabs>(Tabs.TS_LIST);
  const [anomalyExplorerSettings, setAnomalyExplorerSettings] = useState(defaultAnomalyExplorerSettings);

  return (
    <DefaultPageWithBoundaries>
      {bucket &&
        <>
          <div className="flex flex-col grow w-full">
            <TabControlPanel bucket={bucket} timeSeriesList={timeSeriesList} tab={tab} setTab={setTab}/>
            <div className="flex grow">
              {tab === Tabs.TS_LIST && channels.length > 0 && <TimeSeriesList bucket={bucket} timeSeriesList={timeSeriesList} channels={channels} defaultChannel={channels[0]}/>}
              {tab === Tabs.TS_CLUSTER && channels.length > 0 && <TimeSeriesClusterWrapper BID={bucketId} channels={channels} defaultChannel={channels[0]}/>}
              {tab === Tabs.ALGOVIS && <AlgoVis bucket={bucket}/>}
              {tab === Tabs.ANOMALY_LIST && <AnomalyList settings={anomalyExplorerSettings} bucket={bucket}/>}
            </div>
          </div>
          {tab === Tabs.ANOMALY_CLUSTER && <AnomalyClusterView settings={anomalyExplorerSettings} bucket={bucket}/>}
          {(tab === Tabs.ANOMALY_LIST || tab === Tabs.ANOMALY_CLUSTER) && <div className="fixed right-5 bottom-5 z-50">
            <AnomalyExplorerSettingsMenuWrapper bucket={bucket} settings={anomalyExplorerSettings} setSettings={setAnomalyExplorerSettings} tab={tab} />
          </div>}
          <TimeSeriesPopup bucket={bucket} />
        </>}
    </DefaultPageWithBoundaries>
  );
}