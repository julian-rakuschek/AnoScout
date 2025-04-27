import { ReactElement, useEffect, useState } from "react";
import { AlgoVisKDE } from "../../../../types";
import { Slider } from "@mui/material";

export default function KDESettings({ setAlgoSettings }: { setAlgoSettings: (a: AlgoVisKDE) => void }): ReactElement {
  const [bandwidth, setBandwidth] = useState(7);
  const [level, setLevel] = useState(0.8);

  useEffect(() => {
    setAlgoSettings({ bandwidth, level });
  }, []);

  return <div>
    <p className="font-semibold text-indigo-600">Kernel Density Estimator</p>
    <p className={"text-sm"}>
      The KDE algorithm estimates a density function of the projected point cloud with a user-defined bandwidth.
      A level is used to define components, that is, regions of points in the cloud.
      If the component contains a segment marked as normal, all segments within the component are classified as normal.
    </p>
    <div className={"grid grid-cols-5 place-items-center mt-4 "}>
      <p className={"col-span-1 font-bold text-indigo-600"}>Bandwidth</p>
      <Slider
        className={"col-span-4"}
        sx={{ color: "#4f46e5" }}
        min={1} max={10} step={0.1} value={bandwidth}
        onChange={(event, newValue) => setBandwidth(newValue as number)}
        onChangeCommitted={(event, newValue) => {
          setBandwidth(newValue as number);
          setAlgoSettings({ bandwidth, level });
        }}
        valueLabelDisplay="auto"
      />
    </div>
    <div className={"grid grid-cols-5 place-items-center"}>
      <p className={"col-span-1 font-bold text-indigo-600"}>Level</p>
      <Slider
        className={"col-span-4"}
        sx={{ color: "#4f46e5" }}
        min={0} max={1} step={0.01} value={level}
        onChange={(event, newValue) => setLevel(newValue as number)}
        onChangeCommitted={(event, newValue) => {
          setLevel(newValue as number);
          setAlgoSettings({ bandwidth, level });
        }}
        valueLabelDisplay="auto"
      />
    </div>
  </div>;
}