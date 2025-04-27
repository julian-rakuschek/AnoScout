import { Bucket } from "../../../types";
import { useBucketAlgorithms } from "lib/hooks";
import AlgorithmCard from "components/molecules/Cards/AlgorithmCard";
import AlgorithmAddPopup from "components/organisms/Popups/AlgorithmAddPopup";

export default function BucketAlgorithms({ bucket }: { bucket: Bucket }): JSX.Element {
  const algorithms = useBucketAlgorithms(bucket._id.$oid);

  return <div className="grid grid-cols-2 gap-4">
    {algorithms.map(algo => <AlgorithmCard algorithm={algo} />)}
    <AlgorithmAddPopup bucket={bucket} />
  </div>;
}