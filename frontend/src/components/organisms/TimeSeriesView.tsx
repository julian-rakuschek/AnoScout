import { Bucket, TimeSeries, TimeSeriesInteractionMode, ToastType } from "../../types";
import TimeSeriesChart from "components/molecules/TimeSeries/TimeSeriesChart";
import React, { useState } from "react";
import { useTimeSeriesAnomalies, useTimeSeriesNominals, useTimeSeriesZoomLevel } from "lib/hooks";
import ChannelSelection from "components/atoms/ChannelSelection";
import { classNames } from "lib/helper/util";
import Select from "react-select";
import AnomalyScores, { AnomalyDisplayOption, anomalyScoresDisplayOptions } from "components/molecules/TimeSeries/AnomalyScores";
import AnomalyListTimeseries from "components/organisms/Lists/AnomalyListTimeseries";
import AnomalyClassifications from "components/molecules/TimeSeries/AnomalyClassifications";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useSetAtom } from "jotai/index";
import { toastAtom } from "lib/atoms";
import { useQueryClient } from "@tanstack/react-query";

export default function TimeSeriesView({ bucket, timeSeries }: { bucket: Bucket; timeSeries: TimeSeries }): JSX.Element {
  const [selectedChannel, setSelectedChannel] = useState<string>(timeSeries.channels[0]);
  const [zoomArea, setZoomArea] = useState<[string, string] | [undefined, undefined]>([undefined, undefined]);
  const zoomLevel = useTimeSeriesZoomLevel(timeSeries._id.$oid, zoomArea[0], zoomArea[1]);
  const [mode, setMode] = useState(TimeSeriesInteractionMode.ZOOM);
  const [scoresDisplayMode, setScoresDisplayMode] = useState<AnomalyDisplayOption>(anomalyScoresDisplayOptions[0]);
  const anomalies = useTimeSeriesAnomalies(timeSeries._id.$oid, false).filter(anomaly => anomaly.channel === selectedChannel);
  const nominals = useTimeSeriesNominals(timeSeries._id.$oid, true).filter(nominal => nominal.channel === selectedChannel);
  const setToast = useSetAtom(toastAtom);
  const queryClient = useQueryClient();

  const onZoom = (new_left: string, new_right: string): void => {
    setZoomArea([new_left, new_right]);
  };

  const zoomOut = (): void => {
    setZoomArea([undefined, undefined]);
  };

  const markFullNormal = async (): Promise<void> => {
    const res = await ApiRoutes.addNominalArea.fetch({
      data: {
        TID: timeSeries._id.$oid,
        channel: selectedChannel,
        date: null,
      },
    });
    if(res.success) {
      setToast({ message: res.action === "add" ? "Time series marked as normal" : "Revoked normal status", type: ToastType.Success });
      await queryClient.invalidateQueries();
    } else {
      setToast({ message: "Could not add normal time series!", type: ToastType.Error });
    }
  };

  const removeNormal = async (): Promise<void> => {
    if(nominals.length === 0) return;
    const res = await ApiRoutes.deleteNominal.fetch({
      params: { NID: nominals[0]._id.$oid },
    });
    if(res.success) {
      setToast({ message: "Time series normal status removed!", type: ToastType.Success });
      await queryClient.invalidateQueries();
    } else {
      setToast({ message: "Could remove time series normal status", type: ToastType.Error });
    }
  };

  return <div className="flex flex-col items-center p-4 gap-4">
    <div className="grid grid-cols-3 w-full">
      <div className="place-self-start">
        <ChannelSelection selectableChannels={timeSeries.channels} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel}/>
      </div>
      {mode === TimeSeriesInteractionMode.ZOOM && <div className="flex flex-row justify-center items-center gap-x-3">
        {zoomLevel === 0 && <p>Select an area to zoom in.</p>}
        {zoomLevel > 0 && <>
          <p>Zoom Level: {zoomLevel * 100}%</p>
          <button onClick={() => zoomOut()} className="px-2 py-1 bg-gray-200 rounded-xl cursor-default hover:bg-gray-300">Reset Zoom</button>
        </>}
      </div>}
      {mode === TimeSeriesInteractionMode.ANNOTATE &&
        <div className="flex flex-row justify-center items-center"><p>Hover the line chart and click on a segment to mark it as normal. Click on it again to remove the normal marking.</p></div>}
      {bucket.type === "classification" &&
        <div className="flex space-x-4 place-self-end">
          <div className={classNames(
            mode === TimeSeriesInteractionMode.ZOOM ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:text-gray-700",
            "flex justify-center items-center px-3 py-1 rounded-md text-sm font-medium cursor-default",
          )} onClick={() => setMode(TimeSeriesInteractionMode.ZOOM)}>Zoom
          </div>
          {bucket.classification_granularity !== "full" && <div className={classNames(
            mode === TimeSeriesInteractionMode.ANNOTATE ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:text-gray-700",
            "flex justify-center items-center px-3 py-1 rounded-md text-sm font-medium cursor-default",
          )} onClick={() => setMode(TimeSeriesInteractionMode.ANNOTATE)}>Annotate
          </div>}
          {bucket.classification_granularity === "full" && <div className={classNames(
            nominals.length > 0 ? "bg-teal-100 text-teal-700" : "text-gray-500 hover:text-gray-700",
            "flex justify-center items-center px-3 py-1 rounded-md text-sm font-medium cursor-default",
          )} onClick={() => nominals.length > 0 ? removeNormal() : markFullNormal()}>
            {nominals.length > 0 ? "Time series marked as normal (click to remove normal status)" : "Mark entire time series as normal"}
          </div>}
        </div>}
    </div>

    <div className="w-full h-[300px]">
      <TimeSeriesChart bucket={bucket} timeSeries={timeSeries} selectedChannel={selectedChannel} interactionMode={mode} onZoom={onZoom} start_date={zoomArea[0]} end_date={zoomArea[1]}/>
    </div>
    {(bucket.type === "scoring" || bucket.classification_granularity !== "full") && <div className="w-full flex flex-row justify-between">
      {bucket.type === "scoring" && <p className="font-semibold">Anomaly Scores</p>}
      {bucket.type === "classification" && <p className="font-semibold">Classifications</p>}
      <Select
        closeMenuOnSelect={true}
        defaultValue={scoresDisplayMode}
        value={scoresDisplayMode}
        options={anomalyScoresDisplayOptions}
        isMulti={false}
        isSearchable={false}
        onChange={o => setScoresDisplayMode(o!)}
      />
    </div>}
    <div className="w-full">
      {bucket.type === "scoring" &&
        <AnomalyScores bucket={bucket} timeSeries={timeSeries} displayOption={scoresDisplayMode.value} readOnly={true} selectedChannel={selectedChannel} start_date={zoomArea[0]} end_date={zoomArea[1]}/>}
      {bucket.type === "classification" && <AnomalyClassifications canEdit={false} bucket={bucket} timeSeries={timeSeries} selectedChannel={selectedChannel} start_date={zoomArea[0]} end_date={zoomArea[1]}/>}
    </div>
    {(bucket.type === "scoring" || bucket.classification_granularity !== "full") && <AnomalyListTimeseries anomalies={anomalies} nominals={nominals} items_per_page={4}/>}
  </div>;
}