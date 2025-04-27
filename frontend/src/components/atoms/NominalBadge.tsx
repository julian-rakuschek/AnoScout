import { ReactElement } from "react";
import { useTimeSeriesNominals } from "lib/hooks";

export default function NominalBadge({ TID }: { TID: string }): ReactElement {
  const nominals = useTimeSeriesNominals(TID);

  if(nominals.length === 0) return <></>;

  return <div className="absolute top-2 left-2 rounded-lg bg-green-200 text-green-700 py-0.5 px-4 text-center text-xs">Normal</div>;
}