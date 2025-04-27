import React, { ReactElement, useEffect, useRef } from "react";
import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip, } from "chart.js";
import * as d3 from "d3";
import { PAA, useContainerDimensions } from "lib/helper/util";
import { SHAPcolors } from "lib/helper/color";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export const AnomalyScoreHeatmap = ({ scores, min, max, manualHeight, mixWithAlpha }: { scores: number[]; min: number; max: number; manualHeight?: number; mixWithAlpha?: boolean }): ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let { width, height } = useContainerDimensions(canvasRef);
  if(manualHeight != null) height = manualHeight;
  const scale = 3;
  width *= scale;
  height *= scale;
  const segments = Math.min(scores.length, 100);

  useEffect(() => {
    if(!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if(!context) return;

    context.clearRect(0, 0, width, height);

    const anomaly_scores_reduced = PAA(scores, segments);
    const rect_width = width / segments;

    const xScale = d3.scaleLinear().range([0, width]).domain([0, segments]);
    for(let i = 0; i < segments; i++) {
      const x = xScale(i);
      context.fillStyle = SHAPcolors((anomaly_scores_reduced[i] - min) / (max - min));
      if(mixWithAlpha) context.globalAlpha = (anomaly_scores_reduced[i] - min) / (max - min);
      context.fillRect(x, 0, rect_width, height);
    }
  }, [scores, width, height, min, max]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: manualHeight ?? "100%" }}
    />
  );
};