import { ReactElement } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export default function TimeSeriesTooltip({ values, min, max }: { values: number[]; min: number; max: number }): ReactElement {
  const values_transformed = values.map((v, index) => ({ value: v, idx: index }));

  return <div className="bg-white rounded-lg shadow-xl w-[300px] h-[200px] flex items-center justify-center">
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={values_transformed}>
        <XAxis dataKey="idx" hide={true} angle={-45} tick={false} stroke="black"/>
        <YAxis domain={[min, max]} hide={true} type="number" allowDataOverflow yAxisId="1" stroke="black"/>
        <Line type="monotone" dataKey={`value`} stroke="black" dot={false} isAnimationActive={false} yAxisId="1"/>,
      </LineChart>
    </ResponsiveContainer>
  </div>;
}