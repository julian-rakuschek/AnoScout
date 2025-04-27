import { ReactElement } from "react";
import { DefaultPageWithBoundaries } from "components/organisms/DefaultPage";
import { Link } from "react-router-dom";

export default function Visualizations(): ReactElement {
  return <DefaultPageWithBoundaries>
    <div>
      Visualizations
    </div>
    <ol>
      <li><Link to={"/visualizations/cluster-level-of-detail"}>Level Of Detail</Link></li>
    </ol>
  </DefaultPageWithBoundaries>;
}