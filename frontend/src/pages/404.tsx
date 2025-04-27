import { DefaultPageWithBoundaries } from "components/organisms/DefaultPage";

export default function FourOhFour(): JSX.Element {
  return (
    <DefaultPageWithBoundaries>
      <div className="grow flex flex-col justify-center items-center gap-y-8">
        <div className="text-3xl font-semibold text-center">404 - This page does not exist</div>
      </div>
    </DefaultPageWithBoundaries>
  );
}
