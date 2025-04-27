import { ReactElement } from "react";
import TimeSeriesCard from "components/molecules/Cards/TimeSeriesCard";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { Dendrogram, DendrogramAnomaly, DendrogramTimeSeries, TimeSeriesListSettingsType, TimeSeriesVis } from "../../../types";
import { getAllLeafs } from "lib/helper/dendrogram";

type TimeSeriesClusterStackProps =  {
  settings: TimeSeriesListSettingsType;
  clusterStack: Dendrogram<DendrogramTimeSeries>[];
  setClusterStack: (c: Dendrogram<DendrogramTimeSeries>[]) => void;
  min: number;
  max: number;
  BID: string;
};

export default function TimeSeriesClusterStack({ BID, settings, clusterStack, setClusterStack, min, max }: TimeSeriesClusterStackProps): ReactElement {
  return <div className={"w-full flex flex-col items-center gap-2 px-2"}>
    <p className={"font-semibold text-lg"}>Zooming Path</p>
    <div className="bg-indigo-700 rounded-lg text-white w-full text-center py-2 font-semibold cursor-default transition hover:scale-105" onClick={() => setClusterStack([])}>Initial Overview</div>
    {clusterStack.map((stack, index) =>
      <>
        <ChevronDownIcon className={"text-indigo-600 w-10"} />
        <div className={"w-full h-[100px]"}>
          <TimeSeriesCard
            BID={BID}
            tsList={getAllLeafs<DendrogramTimeSeries>(stack).map(d => d.TID)}
            settings={settings}
            simple={true}
            handleClick={() => {setClusterStack(clusterStack.slice(0, index + 1));}}
            max={max} min={min}
          />
        </div>
      </>,
    )}
  </div>;
}