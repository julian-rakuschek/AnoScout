import { Bucket, TimeSeries, TimeSeriesListSettingsType, TimeSeriesVis } from "../../../types";
import React, { useEffect, useState } from "react";
import { useBucketMinMax } from "lib/hooks";
import TimeSeriesCard from "components/molecules/Cards/TimeSeriesCard";
import TimeSeriesListSettings, { LISTTYPE } from "components/molecules/Exploration/TimeSeriesListSettings";
import Pagination from "components/atoms/Pagination";

const items_per_page = 12;

export default function TimeSeriesList({ bucket, timeSeriesList, channels, defaultChannel }: { bucket: Bucket; timeSeriesList: TimeSeries[]; channels: string[]; defaultChannel: string }): JSX.Element {
  const [settings, setSettings] = useState<TimeSeriesListSettingsType>({ cluster: 1, channel: defaultChannel, visualization: TimeSeriesVis.LINE, scoreMin: 0, scoreMax: 1 });
  const bucket_min_max = useBucketMinMax(bucket._id.$oid, settings.channel);
  const [currentPage, setPage] = useState(1);
  const indexInPage = (index: number): boolean => {
    return index >= (currentPage - 1) * items_per_page && index < currentPage * items_per_page;
  };
  const pagesCount = Math.ceil(timeSeriesList.length / items_per_page);

  useEffect(() => {
    setPage(1);
  }, [pagesCount]);

  return <div className={"w-full h-full grid grid-cols-12"}>

    <div className={"col-span-10 h-full"}>
      <div className="grid grid-cols-3 place-items-center p-2 gap-3">
        {bucket_min_max && timeSeriesList.map((t, index) => indexInPage(index) ? <div className={"h-[150px] w-full"}><TimeSeriesCard
          BID={bucket._id.$oid}
          settings={settings}
          simple={false}
          tsList={[t._id.$oid]}
          min={bucket_min_max.min}
          max={bucket_min_max.max}
          ignoreZoomState={true}
        /></div> : null)}
      </div>
      <div className="w-full pt-5">
        <Pagination currentPage={currentPage} pagesCount={pagesCount} setPage={setPage}/>
      </div>
    </div>
    <div className="col-span-2">
      {bucket_min_max && <TimeSeriesListSettings list_type={LISTTYPE.GRID} BID={bucket._id.$oid} channels={channels} setSettings={setSettings} settings={settings} bucket_min_max={bucket_min_max}/>}
    </div>
  </div>;
}