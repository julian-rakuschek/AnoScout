import { Line, LineChart, ReferenceArea, ResponsiveContainer, TooltipProps, XAxis, YAxis } from "recharts";
import { useAnomaly, useTimeSeries, useTimeSeriesAnomalies, useTimeSeriesData, useTimeSeriesNominals } from "lib/hooks";
import { Bucket, TimeSeries } from "../../../types";
import { findClosestDate, isoToUTC } from "lib/helper/util";
import { SHAPcolors } from "lib/helper/color";

export default function TileCardTimeSeriesPreview({ bucket, timeSeries }: { bucket: Bucket; timeSeries: TimeSeries }): JSX.Element {
  const timeSeriesData = useTimeSeriesData(timeSeries._id.$oid, { n_segments: 1000, channel: timeSeries.channels[0] });
  const timestamps = timeSeriesData.map(ts => ts.timestamp);
  const anomalies = useTimeSeriesAnomalies(timeSeries._id.$oid).filter(a => a.channel === timeSeries.channels[0]);
  const nominals = useTimeSeriesNominals(timeSeries._id.$oid).filter(n => n.channel === timeSeries.channels[0]);

  return <div className="bg-white w-full h-[80px] flex items-center justify-center">
    {timeSeriesData.length > 0 && <ResponsiveContainer width="100%" height={80}>
      <LineChart data={timeSeriesData}>
        <XAxis dataKey="timestamp" hide={true} angle={-45} tick={false} stroke="black"/>
        <YAxis domain={["auto", "auto"]} hide={true} type="number" allowDataOverflow yAxisId="1" stroke="black"/>
        <Line type="monotone" dataKey={`value`} stroke="black" dot={false} isAnimationActive={false} yAxisId="1"/>
        {anomalies.map(a => <ReferenceArea yAxisId="1" x1={findClosestDate(timestamps, a.start.$date)} x2={findClosestDate(timestamps, a.end.$date)} strokeOpacity={0.3} fillOpacity={0.3} fill={"#FF0000"}/>)}
        {nominals.map(n => <ReferenceArea yAxisId="1" x1={findClosestDate(timestamps, n.start.$date)} x2={findClosestDate(timestamps, n.end.$date)} strokeOpacity={0.3} fillOpacity={0.3} fill={"#00FF00"}/>)}
      </LineChart>
    </ResponsiveContainer>}
  </div>;
}