import { ReactElement } from "react";
import { useTimeSeries } from "lib/hooks";
import TimeSeriesView from "components/organisms/TimeSeriesView";
import { Bucket } from "../../types";

export default function TimeSeriesViewWrapper({ bucket, TID }: { bucket: Bucket; TID: string }): ReactElement {
  const ts = useTimeSeries(TID);

  if(!ts) return <></>;

  return <TimeSeriesView bucket={bucket} timeSeries={ts} />;
}