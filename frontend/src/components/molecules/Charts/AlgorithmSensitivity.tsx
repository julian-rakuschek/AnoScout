import React, { ReactElement } from "react";
import { Algorithm, AlgorithmSensitivityType } from "../../../types";
import { createColorsArray } from "lib/helper/color";
import { interpolateRainbow } from "d3-scale-chromatic";

export default function AlgorithmSensitivity({ algorithms, algoSensitivity }: { algorithms: Algorithm[]; algoSensitivity: AlgorithmSensitivityType }): ReactElement {
  const algorithmColors = createColorsArray(algorithms.length, { start: 0.1, end: 1, reverse: false, interpolateFunc: interpolateRainbow });

  const getAlgoColor = (AlgoID: string): string => {
    const algo = algorithms.find(a => a._id.$oid === AlgoID);
    if(!algo) return "gray";
    const algoIndex = algorithms.indexOf(algo);
    return algorithmColors[algoIndex];
  };

  const getAlgoName = (AlgoID: string): string => {
    const algo = algorithms.find(a => a._id.$oid === AlgoID);
    if(!algo) return "Unknown";
    return algo.name;
  };

  return <>
    <div className={"absolute top-0 right-2 flex flex-row justify-around items-end h-full"}>
      {algoSensitivity.map(a => <div
        className={"bg-teal-800"}
        style={{
          height: `${a.ratio * 100}%`,
          width: "10px",
          backgroundColor: getAlgoColor(a.algo),
        }}></div>)}
    </div>
    <div className={"hidden group-hover:block absolute top-0 right-0 bg-white p-2 shadow-lg"}>
      {algoSensitivity.map(a => <div style={{ color: getAlgoColor(a.algo) }}>
        {Math.round(a.ratio * 100)}% {getAlgoName(a.algo)}
      </div>)}
    </div>
  </>;
}