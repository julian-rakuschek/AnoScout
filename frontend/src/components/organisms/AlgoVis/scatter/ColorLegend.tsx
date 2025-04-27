import { ReactElement } from "react";
import { ALGOVIS } from "../../../../types";
import { StarIcon } from "@heroicons/react/16/solid";

export default function ColorLegend({ algo }: { algo: ALGOVIS }): ReactElement {
  return <div className="flex flex-col bg-white rounded-lg shadow-xl justify-center items-center gap-2 p-2">
    {algo === ALGOVIS.OCNN && <>
      <div className="flex flex-row w-full items-center gap-2"><StarIcon  className={"w-5 h-5 text-[#1a237e]"} /><div>Segment marked as normal</div></div>
      <div className="flex flex-row w-full items-center gap-2"><div className={"w-5 h-5 bg-[#9fa8da] rounded-full"}></div><div>Segment classified as normal</div></div>
      <div className="flex flex-row w-full items-center gap-2"><div className={"w-5 h-5 bg-[#ec407a] rounded-full"}></div><div>Segment classified as abnormal</div></div>
    </>}
    {algo === ALGOVIS.KDE && <>
      <div className="flex flex-row w-full items-center gap-2"><StarIcon  className={"w-5 h-5 text-[#ef6c00]"} /><div>Segment marked as normal</div></div>
      <div className="flex flex-row w-full items-center gap-2"><div className={"w-5 h-5 bg-[#283593] rounded-full"}></div><div>Segment classified as normal</div></div>
      <div className="flex flex-row w-full items-center gap-2"><div className={"w-5 h-5 bg-[#d81b60] rounded-full"}></div><div>Segment classified as abnormal</div></div>
    </>}
  </div>;
}