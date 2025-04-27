import { Line, LineChart, ResponsiveContainer, TooltipProps, XAxis, YAxis } from "recharts";
import { useAnomaly } from "lib/hooks";

export default function AnomalyTooltip({ AID }: { AID: string }): JSX.Element {
  const anomaly = useAnomaly(AID, 0, true);

  return <div className="bg-white rounded-lg shadow-xl w-[200px] h-[100px] flex items-center justify-center">
    {anomaly && <ResponsiveContainer width="100%" height={100}>
      <LineChart data={anomaly.ts_data}>
        <XAxis dataKey="timestamp_string" hide={true} angle={-45} tick={false} stroke="black"/>
        <YAxis domain={["auto", "auto"]} hide={true} type="number" allowDataOverflow yAxisId="1" stroke="black"/>
        <Line type="monotone" dataKey={`value`} stroke="black" dot={false} isAnimationActive={false} yAxisId="1"/>,
      </LineChart>
    </ResponsiveContainer>}
  </div>;
}