import { DefaultPageWithBoundaries } from "components/organisms/DefaultPage";
import LandingPageAnimation from "components/organisms/LandingPageAnimation";
import { Link } from "react-router-dom";

export default function Home(): JSX.Element {
  return (
    <DefaultPageWithBoundaries menuDarkMode>
      <div className="landing-page-gradient grow flex flex-col items-center justify-center">
        <p className="text-white text-8xl font-bold">AnoScout</p>
        <p className="text-white text-xl">Find anomalies in your dataset</p>
        <Link to={"/buckets"} className="px-2 py-1 bg-white rounded-lg text-indigo-600 cursor-pointer mt-5 transition hover:text-white hover:bg-indigo-700">View Buckets</Link>
      </div>
      <div className="fixed opacity-50 z-10 pointer-events-none">
        <LandingPageAnimation/>
      </div>
    </DefaultPageWithBoundaries>
  );
}