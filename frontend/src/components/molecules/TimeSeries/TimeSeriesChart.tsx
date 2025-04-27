import { Bucket, TimeSeries, TimeSeriesInteractionMode, ToastType } from "../../../types";
import { useEffect, useState } from "react";
import { useTimeSeriesAnomalies, useTimeSeriesData, useTimeSeriesNominals, useUserMarkingsTimeseries } from "lib/hooks";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { interpolateWarm } from "d3-scale-chromatic";
import { createColorsArray } from "lib/helper/color";
import { useAtomValue } from "jotai";
import { findClosestDate, isoToUTC } from "lib/helper/util";
import { selectedAnomalyAtom, selectedNominalAtom } from "lib/atoms";
import dayjs from "dayjs";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useSetAtom } from "jotai/index";
import { toastAtom } from "lib/atoms";
import { useQueryClient } from "@tanstack/react-query";
import { OpUnitType } from "dayjs";

type TimeSeriesChartProps = {
  bucket: Bucket;
  timeSeries: TimeSeries;
  selectedChannel: string;
  interactionMode: TimeSeriesInteractionMode;
  start_date?: string;
  end_date?: string;
  onZoom?: (left: string, right: string) => void;
};

export default function TimeSeriesChart({ bucket, timeSeries, selectedChannel, interactionMode, start_date, end_date, onZoom }: TimeSeriesChartProps): JSX.Element {
  const [refAreaLeft, setRefAreaLeft] = useState<string>("");
  const [refAreaRight, setrefAreaRight] = useState<string>("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [anomalyHighlight, setAnomalyHighlight] = useState<[string, string]>(["", ""]);
  const selectedAnomaly = useAtomValue(selectedAnomalyAtom);
  const selectedNominal = useAtomValue(selectedNominalAtom);
  const timeSeriesData = useTimeSeriesData(timeSeries._id.$oid, { n_segments: 1000, from: start_date, to: end_date, channel: selectedChannel });
  const timestamps = timeSeriesData.map(ts => ts.timestamp);
  const markings = useUserMarkingsTimeseries(timeSeries._id.$oid, false);
  const anomalies = useTimeSeriesAnomalies(timeSeries._id.$oid, false).filter(anomaly => anomaly.channel === selectedChannel);
  const nominals = useTimeSeriesNominals(timeSeries._id.$oid, true).filter(nominal => nominal.channel === selectedChannel);
  const segmentTimestamps = timeSeriesData.map(ts => ({ timestamp: ts.timestamp, dayjsObj: dayjs(ts.timestamp).startOf(bucket.classification_granularity as OpUnitType) }));
  const setToast = useSetAtom(toastAtom);
  const queryClient = useQueryClient();
  useEffect(() => {
    const highlight = getHighlight();
    setAnomalyHighlight(highlight);
    resetSelection();
  }, [anomalies.length, nominals.length, selectedAnomaly, selectedNominal]);

  useEffect(() => {
    resetSelection();
  }, [start_date, end_date]);

  const select = (): void => {
    if(refAreaLeft === refAreaRight || refAreaRight === "") {
      setRefAreaLeft("");
      setrefAreaRight("");
      return;
    }
    if(refAreaLeft > refAreaRight) {
      const temp = refAreaLeft;
      setRefAreaLeft(refAreaRight);
      setrefAreaRight(temp);
    }
    if(onZoom) onZoom(refAreaLeft, refAreaRight);
  };

  const setHoverSegmentHighlight = (label: string): void => {
    if(label === "") {
      setRefAreaLeft("");
      setrefAreaRight("");
      return;
    }
    const label_days = dayjs(label).startOf(bucket.classification_granularity as OpUnitType);
    const filtered = segmentTimestamps.filter(s => s.dayjsObj.isSame(label_days));
    if(filtered.length >= 2) {
      setRefAreaLeft(filtered[0].timestamp);
      setrefAreaRight(filtered[filtered.length - 1].timestamp);
    }
  };

  const saveSegment = async (date: string): Promise<void> => {
    const res = await ApiRoutes.addNominalArea.fetch({
      data: {
        TID: timeSeries._id.$oid,
        channel: selectedChannel,
        date: date,
      },
    });
    if(res.success) {
      setToast({ message: res.action === "add" ? "Segment marked as normal" : "Segment normal status removed", type: ToastType.Success });
      await queryClient.invalidateQueries();
    } else {
      setToast({ message: "Could not add normal segment!", type: ToastType.Error });
    }
  };

  const resetSelection = (): void => {
    setRefAreaLeft("");
    setrefAreaRight("");
  };

  const getHighlight = (): [string, string] => {
    const anomaly = anomalies.find(a => a._id.$oid === selectedAnomaly);
    if(anomaly) {
      return [findClosestDate(timestamps, anomaly.start.$date), findClosestDate(timestamps, anomaly.end.$date)];
    }

    const nominal = nominals.find(a => a._id.$oid === selectedNominal);
    if(nominal) {
      return [findClosestDate(timestamps, nominal.start.$date), findClosestDate(timestamps, nominal.end.$date)];
    }
    return ["", ""];
  };

  const formatTS = (value: string, name: string): [string, string] => {
    return [value, name.split(".")[1]];
  };

  if(!selectedChannel) return <div>
    <p className="text-black/80 text-center">Select one or more channels to render the time series.</p>
  </div>;

  return <ResponsiveContainer width="100%" height="100%">
    <LineChart
      data={timeSeriesData}
      margin={{ top: 5, bottom: 5 }}
      onMouseDown={e => {
        setIsSelecting(true);
        if(interactionMode === TimeSeriesInteractionMode.ZOOM) setRefAreaLeft(e.activeLabel ?? "");
      }}
      onMouseMove={e => {
        if(interactionMode === TimeSeriesInteractionMode.ANNOTATE) setHoverSegmentHighlight(e.activeLabel ?? "");
        if(interactionMode === TimeSeriesInteractionMode.ZOOM && isSelecting) setrefAreaRight(e.activeLabel ?? "");
      }}
      onMouseUp={() => {
        setIsSelecting(false);
        if(interactionMode === TimeSeriesInteractionMode.ZOOM) select();
      }}
      onClick={async e => {
        if(interactionMode === TimeSeriesInteractionMode.ANNOTATE && (e.activeLabel != null)) await saveSegment(e.activeLabel);
      }}
    >
      <XAxis dataKey="timestamp" angle={-45} tick={false}/>
      <YAxis domain={["auto", "auto"]} type="number" allowDataOverflow yAxisId="1"/>
      <Tooltip formatter={formatTS}/>
      <Line type="monotone" dataKey={`value`} stroke={"black"} dot={false} isAnimationActive={false} animationDuration={300} yAxisId="1" key={`value`}/>,
      {interactionMode === TimeSeriesInteractionMode.ZOOM && refAreaLeft && refAreaRight &&
        <ReferenceArea yAxisId="1" x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fillOpacity={0.3} fill={"#000000"}/>
      }
      {interactionMode === TimeSeriesInteractionMode.ANNOTATE && refAreaLeft && refAreaRight &&
        <ReferenceArea yAxisId="1" x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fillOpacity={0.3} fill={"#00FF00"}/>
      }
      <ReferenceArea yAxisId="1" x1={anomalyHighlight[0]} x2={anomalyHighlight[1]} fillOpacity={0.3} fill="#FF0000"/>
      {bucket.classification_granularity !== "full" && nominals.map(nominal =>
        <ReferenceArea yAxisId="1" x1={findClosestDate(timestamps, nominal.start.$date)} x2={findClosestDate(timestamps, nominal.end.$date)} fillOpacity={0.1} fill="#00FF00"/>,
      )}
      {markings.anomalies.map(anomaly =>
        <ReferenceArea yAxisId="1" x1={isoToUTC(anomaly.start.$date)} x2={isoToUTC(anomaly.end.$date)} fillOpacity={0.1} fill="#0000FF"/>,
      )}
    </LineChart>
  </ResponsiveContainer>;
}