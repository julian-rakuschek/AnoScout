import React, { ReactElement, useState } from "react";
import AnomalyScatterPlot from "components/molecules/Exploration/AnomalyScatterPlot";
import ScatterColorLegend from "components/atoms/ScatterColorLegend";
import AnomalyTimeSeries from "components/molecules/TimeSeries/AnomalyTimeSeries";
import AnomalyRecommenderList from "components/organisms/Lists/AnomalyRecommenderList";
import { Bucket, AnomalyExplorerSettings, ScatterPoint } from "../../../types";
import { useAtomValue } from "jotai/index";
import { selectedAnomalyAtom } from "lib/atoms";

export default function AnomalyList({ bucket, settings }: { bucket: Bucket; settings: AnomalyExplorerSettings }): ReactElement {
  const [filteredData, setFilteredData] = useState<ScatterPoint[] | undefined>(undefined);
  const selected = useAtomValue(selectedAnomalyAtom);
  
  return <div className="grid grid-cols-3 w-full">
    <div className="flex flex-col col-span-1">
      <div className="h-[500px]">
        <AnomalyScatterPlot
          bucket={bucket}
          settings={settings}
          setFiltered={setFilteredData}
        />
      </div>
      <ScatterColorLegend coloring={settings.scatterColoring}/>
      <div className="h-[200px] mt-4">
        {selected !== "" && <AnomalyTimeSeries AID={selected} BID={bucket._id.$oid}/>}
      </div>
    </div>
    <div className="col-span-2 h-full">
      <AnomalyRecommenderList
        bucket={bucket}
        recMethod={settings.recommenderAlgorithm}
        hideNegativeRated={settings.hideNegative}
        onlyShowUnrated={settings.showOnlyUnrated}
        filteredData={filteredData}
      />
    </div>
  </div>
}