import { ReactElement, useState } from "react";
import { useBucketMinMax, useTimeSeriesClustering } from "lib/hooks";
import TimeSeriesCluster from "components/molecules/Exploration/TimeSeriesCluster";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import TimeSeriesClusterStack from "components/molecules/Exploration/TimeSeriesClusterStack";
import { Dendrogram, DendrogramTimeSeries, TimeSeriesListSettingsType, TimeSeriesVis } from "../../../types";
import DendrogramViewer from "components/molecules/Exploration/DendrogramViewer";
import TimeSeriesListSettings, { LISTTYPE } from "components/molecules/Exploration/TimeSeriesListSettings";

export default function TimeSeriesClusterWrapper({ BID, channels, defaultChannel }: { BID: string; channels: string[]; defaultChannel: string }): ReactElement {
  const [clusterStack, setClusterStack] = useState<Dendrogram<DendrogramTimeSeries>[]>([]);
  const [settings, setSettings] = useState<TimeSeriesListSettingsType>({ cluster: 3, channel: defaultChannel, visualization: TimeSeriesVis.LINE, scoreMin: 0, scoreMax: 1 });
  const cluster = useTimeSeriesClustering(BID, settings.channel);
  const bucket_min_max = useBucketMinMax(BID, settings.channel);

  if(!bucket_min_max) return <CenteredLoadingSpinner />;

  return (
    <div className={"w-full h-full grid grid-cols-12 "}>
      <div className={"col-span-2 flex flex-col items-center pb-5"}>
        <TimeSeriesClusterStack BID={BID} settings={settings} clusterStack={clusterStack} setClusterStack={setClusterStack} min={bucket_min_max.min} max={bucket_min_max.max}/>
        <div className={"w-[200px] h-[200px] mt-5"}>
          {cluster && <DendrogramViewer data={cluster} selectedBranch={clusterStack.length > 0 ? clusterStack[clusterStack.length - 1] : cluster} width={250} height={250}/>}
        </div>
      </div>
      <div className={"col-span-8 h-[700px]"}>
        {cluster && <TimeSeriesCluster
          BID={BID} settings={settings}
          cluster={clusterStack.length === 0 ? cluster : clusterStack[clusterStack.length - 1]} pushTsSubCluster={(c: Dendrogram<DendrogramTimeSeries>) => setClusterStack([...clusterStack, c])}
          min={bucket_min_max.min} max={bucket_min_max.max}
        />}
        {!cluster && <CenteredLoadingSpinner/>}
      </div>
      <div className="col-span-2">
        <TimeSeriesListSettings BID={BID} list_type={LISTTYPE.CLUSTER} channels={channels} setSettings={setSettings} settings={settings} bucket_min_max={bucket_min_max}/>
      </div>
    </div>
  );
}
