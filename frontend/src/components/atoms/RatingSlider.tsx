import { useEffect, useState } from "react";
import { hexToRgba } from "lib/helper/color";

export const colorMap: {[key: number]: string} = {
  "-5": "#276419",
  "-4": "#276419",
  "-3": "#6aaa35",
  "-2": "#6aaa35",
  "-1": "#6aaa35",
  "0": "#304ffe",
  "1": "#ff9800",
  "2": "#ff9800",
  "3": "#ff9800",
  "4": "#f44336",
  "5": "#f44336",
};

const labelMap: {[key: number]: string} = {
  "-5": "Nominal",
  "-4": "Nominal",
  "-3": "Irrelevant",
  "-2": "Irrelevant",
  "-1": "Irrelevant",
  "0": "Unrated",
  "1": "Verified",
  "2": "Verified",
  "3": "Verified",
  "4": "Important",
  "5": "Important",
};

export default function RatingSlider({ selected, initRating, updateRating, compact }: { selected: boolean; initRating: number; updateRating: (value: number) => void; compact?: boolean }): JSX.Element {
  const [value, setValue] = useState(initRating);

  useEffect(() => {
    setValue(initRating);
  }, [initRating]);

  return <div className={`${selected ? "white-slider" : "indigo-slider"} ${compact ? "grid grid-cols-2 gap-x-3" : "flex flex-col"} gap-y-1 justify-center items-center`}>
    <div className={`${compact ? "px-1 py-0" : "px-3 py-1"} rounded-lg whitespace-nowrap text-sm justify-center text-center overflow-hidden`} style={{
      backgroundColor: hexToRgba(colorMap[value], selected ? 0.8 : 0.2, true) as string,
      color: selected ? "white" : hexToRgba(colorMap[value], 1, true) as string,
    }}>
      <p>{value} {labelMap[value]}</p>
    </div>
    <input type="range" min={-5} max={5} step={1} value={value} onChange={e => setValue(parseInt(e.target.value))} onMouseUp={() => updateRating(value)}/>
  </div>;
}