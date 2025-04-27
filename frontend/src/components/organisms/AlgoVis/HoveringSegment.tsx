import { ReactElement } from "react";
import { useAtomValue } from "jotai/index";
import { segmentHoverAtom } from "lib/atoms";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useTimeSeries, useTimeSeriesData } from "lib/hooks";
import { Bucket, SegmentProjected } from "../../../types";
import { findClosestDate } from "lib/helper/util";

export default function HoveringSegment({ segment, bucket }: { segment: SegmentProjected; bucket: Bucket }): ReactElement {
  const values_transformed = segment.values.map((v, index) => ({ value: v, idx: index }));
  const timeSeriesData = useTimeSeriesData(segment.TID.$oid, { n_segments: 1000, channel: segment.channel });
  const timeSeries = useTimeSeries(segment.TID.$oid);
  const timestamps = timeSeriesData.map(ts => ts.timestamp);
  const segment_start = findClosestDate(timestamps, segment.start.$date);
  const segment_end = findClosestDate(timestamps, segment.end.$date);


  return <div>
    <div className="w-full flex items-center justify-center flex-col">
      <p className={"font-semibold text-center"}>Currently Hovering</p>
      <p>Start: {segment.start.$date}</p>
      <p>End: {segment.end.$date}</p>
      {bucket.classification_granularity !== "full" && <ResponsiveContainer width="100%" height={200}>
        <LineChart data={values_transformed}>
          <XAxis dataKey="idx" hide={true} angle={-45} tick={false} stroke="black"/>
          <YAxis domain={["auto", "auto"]} hide={true} type="number" allowDataOverflow yAxisId="1" stroke="black"/>
          <Line type="monotone" dataKey={`value`} stroke="black" strokeWidth={2} dot={false} isAnimationActive={false} yAxisId="1"/>
        </LineChart>
      </ResponsiveContainer>}
      {timeSeries && <p className={"font-semibold text-center"}>{timeSeries.name} ({segment.channel})</p>}
      <ResponsiveContainer width="100%" height={bucket.classification_granularity !== "full" ? 100 : 300}>
        <LineChart data={timeSeriesData}>
          <XAxis dataKey="timestamp" angle={-45} tick={false}/>
          <YAxis domain={["auto", "auto"]} type="number" allowDataOverflow yAxisId="1"/>
          <Line type="monotone" dataKey={`value`} stroke="black" strokeWidth={2} dot={false} isAnimationActive={false} yAxisId="1"/>
          {bucket.classification_granularity !== "full" && <ReferenceArea yAxisId="1" x1={segment_start} x2={segment_end} strokeOpacity={0.3} fillOpacity={0.3} fill={"#FF0000"}/>}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>;
}