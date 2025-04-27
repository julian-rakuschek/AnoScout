import { ReactElement, useEffect, useState } from "react";
import { AlgoVisOCNN } from "../../../../types";
import { Slider } from "@mui/material";

export default function OCNNSettings({ setAlgoSettings }: { setAlgoSettings: (a: AlgoVisOCNN) => void }): ReactElement {
  const [k, setK] = useState(2);
  const [j, setJ] = useState(2);
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    setAlgoSettings({ k, j, ratio });
  }, [k, j, ratio]);

  return <div>
    <p className="font-semibold text-indigo-600">One Class Nearest Neighbor</p>
    <p className={"text-sm"}>The OCNN algorithm classifies segments in the time series based on their distance to the nearest normal segment. More precisely, for each segment the j nearest normal segments are
      determined. Afterward, the k nearest normal segments of the previously found j segments are searched. Finally, the distance between the segments is computed and the distance ratio between input - j and j - k is
      computed, if this exceeds a threshold, the segment is classified as an anomaly.</p>
    <div className={"grid grid-cols-5 place-items-center mt-4 "}>
      <p className={"col-span-1 font-bold text-indigo-600"}>J</p>
      <Slider
        className={"col-span-4"}
        sx={{ color: "#4f46e5" }}
        min={1} max={10} step={1} value={j}
        onChange={(event, newValue) => setJ(newValue as number)}
        onChangeCommitted={(event, newValue) => setJ(newValue as number)}
        valueLabelDisplay="auto"
      />
    </div>
    <div className={"grid grid-cols-5 place-items-center"}>
      <p className={"col-span-1 font-bold text-indigo-600"}>K</p>
      <Slider
        className={"col-span-4"}
        sx={{ color: "#4f46e5" }}
        min={1} max={10} step={1} value={k}
        onChange={(event, newValue) => setK(newValue as number)}
        onChangeCommitted={(event, newValue) => setK(newValue as number)}
        valueLabelDisplay="auto"
      />
    </div>
    <div className={"grid grid-cols-5 place-items-center"}>
      <p className={"col-span-1 font-bold text-indigo-600"}>Ratio</p>
      <Slider
        className={"col-span-4"}
        sx={{ color: "#4f46e5" }}
        min={0.1} max={10} step={0.01} value={ratio}
        onChange={(event, newValue) => setRatio(newValue as number)}
        onChangeCommitted={(event, newValue) => setRatio(newValue as number)}
        valueLabelDisplay="auto"
      />
    </div>
  </div>;
}