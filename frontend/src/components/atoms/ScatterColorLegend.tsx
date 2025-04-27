import { ScatterColorings } from "../../types";
import { colorMap } from "components/atoms/RatingSlider";
import { shap_color_gradient, viridis_color_gradient } from "lib/helper/color";

export default function ScatterColorLegend({ coloring }: { coloring: ScatterColorings }): JSX.Element {
  const explanation = (): string => {
    switch(coloring) {
      case ScatterColorings.SEVERITY:
        return "Severity of anomalies, given by the norm of the score and the length.";
      case ScatterColorings.VIEWS:
        return "View count of each anomaly.";
      case ScatterColorings.RATINGS:
        return "Ratings assigned by the user.";
      case ScatterColorings.CLUSTERING:
        return "Clustering class of each anomaly.";
      case ScatterColorings.RECOMMENDER:
        return "Recommender score for each anomaly.";
      default:
        return "";
    }
  };

  function generateRatingsGradient(inputColorMap: { [key: number]: string }): string {
    const keys = Object.keys(inputColorMap).map(key => parseInt(key)).sort((a, b) => a - b);
    const total = keys.length;
    const stops = keys.map((key, index) => {
      const color = inputColorMap[key];
      const start = (index / total) * 100;
      const end = ((index + 1) / total) * 100;
      return `${color} ${start.toFixed(2)}%, ${color} ${end.toFixed(2)}%`;
    });

    return `linear-gradient(to right, ${stops.join(", ")})`;
  }

  return <div className="flex flex-col w-full mt-2">
    <span className="text-sm text-gray-700 text-center">{explanation()}</span>
    <div className="grid grid-cols-4 place-items-center">
      {coloring === ScatterColorings.SEVERITY && <>
        <span className="text-sm text-gray-700 col-span-1">Low Severity</span>
        <div className="w-full h-[10px] col-span-2" style={{ background: shap_color_gradient }}></div>
        <span className="text-sm text-gray-700 col-span-1">High Severity</span>
      </>}
      {coloring === ScatterColorings.VIEWS && <>
        <span className="text-sm text-gray-700 col-span-1">Low View Count</span>
        <div className="w-full h-[10px] col-span-2" style={{ background: viridis_color_gradient }}></div>
        <span className="text-sm text-gray-700 col-span-1">High View Count</span>
      </>}
      {coloring === ScatterColorings.RATINGS && <>
        <span className="text-sm text-gray-700 col-span-1">-5 (Nominal)</span>
        <div className="w-full h-[10px] col-span-2" style={{ background: generateRatingsGradient(colorMap) }}></div>
        <span className="text-sm text-gray-700 col-span-1">5 (Critical Anomaly)</span>
      </>}
      {coloring === ScatterColorings.RECOMMENDER && <>
        <span className="text-sm text-gray-700 col-span-1">Low interest</span>
        <div className="w-full h-[10px] col-span-2" style={{ background: shap_color_gradient }}></div>
        <span className="text-sm text-gray-700 col-span-1">Highly recommended</span>
      </>}
    </div>
  </div>;
}