import { useAnomaly } from "lib/hooks";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { findClosestDate } from "lib/helper/util";
import { useSetAtom } from "jotai/index";
import { timeSeriesPopupAtom } from "lib/atoms";

export default function AnomalyTimeSeries({ AID, BID }: { AID: string; BID: string }): JSX.Element {
  const anomaly = useAnomaly(AID);
  const timestamps = anomaly?.ts_data?.map(t => t.timestamp_string!) ?? [];
  const setTsAtom = useSetAtom(timeSeriesPopupAtom);

  const start = findClosestDate(timestamps, anomaly?.start_string ?? "");
  const end = findClosestDate(timestamps, anomaly?.end_string ?? "");

  return (
    <div className="w-full h-full flex flex-col justify-center items-center gap-y-1">
      {anomaly && <>
        <div onClick={() => setTsAtom(anomaly.TID.$oid)} className="w-fit flex flex-row gap-x-2 justify-center items-center py-1 px-3 rounded-lg cursor-default bg-indigo-100 text-indigo-700 text-sm transition hover:bg-indigo-200">
          View Timeseries
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={anomaly.ts_data}>
            <XAxis dataKey="timestamp_string" angle={-45} tick={false}/>
            <YAxis domain={["auto", "auto"]} type="number" allowDataOverflow yAxisId="1"/>
            <Tooltip/>
            <Line type="monotone" dataKey={`value`} stroke="black" dot={false} isAnimationActive={false} yAxisId="1"/>,
            <ReferenceArea yAxisId="1" x1={start} x2={end} fillOpacity={0.3} fill="#FF0000"/>
          </LineChart>
        </ResponsiveContainer>
      </>}
    </div>
  );
}