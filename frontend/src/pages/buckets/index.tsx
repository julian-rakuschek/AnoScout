import { DefaultPageWithBoundaries } from "components/organisms/DefaultPage";
import BucketList from "components/organisms/Lists/BucketList";

export default function Home(): JSX.Element {
  return (
    <DefaultPageWithBoundaries>
      <div className="defaultInset">
        <p className="text-3xl font-bold">Buckets</p>
        <BucketList />
      </div>
    </DefaultPageWithBoundaries>
  );
}