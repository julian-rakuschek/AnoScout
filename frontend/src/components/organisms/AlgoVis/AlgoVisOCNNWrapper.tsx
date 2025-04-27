import { ReactElement } from "react";
import { useProjectedSegments } from "lib/hooks";
import { AlgoVisOCNN, Bucket } from "../../../types";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import OCNNScatter from "components/organisms/AlgoVis/scatter/OCNNScatter";

export default function AlgoVisOCNNWrapper({ bucket, channel, params }: { bucket: Bucket; channel: string; params: AlgoVisOCNN }): ReactElement {
  const projected = useProjectedSegments(bucket._id.$oid, channel, params.j, params.k, 10);

  return <div className="h-full grow">
    {!projected && <CenteredLoadingSpinner/>}
    {projected && <OCNNScatter ratio={params.ratio} projected={projected} />}
  </div>
}