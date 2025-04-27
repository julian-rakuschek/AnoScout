import { useBuckets } from "lib/hooks";
import BucketCard from "components/molecules/Cards/BucketCard";

export default function BucketList(): JSX.Element {
  const buckets = useBuckets().sort();

  return <div className="flex flex-row flex-wrap gap-6 mt-3">
    {buckets.map(bucket => <BucketCard bucket={bucket} key={bucket._id.$oid} />)}
    <BucketCard />
  </div>;
}