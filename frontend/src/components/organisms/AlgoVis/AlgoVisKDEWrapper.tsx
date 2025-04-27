import { ReactElement } from "react";
import { useKDE, useProjectedSegments } from "lib/hooks";
import { AlgoVisKDE, AlgoVisOCNN, Bucket } from "../../../types";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import OCNNScatter from "components/organisms/AlgoVis/scatter/OCNNScatter";
import KDEScatter from "components/organisms/AlgoVis/scatter/KDEScatter";

const padding = 0.2;

export default function AlgoVisKDEWrapper({ bucket, channel, params }: { bucket: Bucket; channel: string; params: AlgoVisKDE }): ReactElement {
  const { data, isFetching } = useKDE(bucket._id.$oid, channel, params.bandwidth, params.level, padding);

  return <div className="h-full grow">
    {(!data || isFetching) && <CenteredLoadingSpinner/>}
    {data && !isFetching && <KDEScatter kdeResult={data} padding={padding} channel={channel} params={params} bucketId={bucket._id.$oid} />}
  </div>;
}