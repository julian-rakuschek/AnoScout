import { Bucket } from "../../../types";
import { useBucketAnomalies, useBucketNominals, useTimeSeriesAnomalies, useTimeSeriesNominals } from "lib/hooks";
import AnomalyListTimeseries from "components/organisms/Lists/AnomalyListTimeseries";

export default function BucketManualMarkings({ bucket }: { bucket: Bucket }): JSX.Element {
  const anomalies = useBucketAnomalies(bucket._id.$oid, false, true);
  const nominals = useBucketNominals(bucket._id.$oid, true);

  return <>{anomalies && <AnomalyListTimeseries anomalies={anomalies} nominals={nominals} items_per_page={8} />}</>
}