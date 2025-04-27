import React, { ReactElement, useEffect, useRef } from "react";
import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import * as d3 from "d3";
import { PAA, useContainerDimensions } from "lib/helper/util";

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


export const TimeSeriesHeatmap = ({ time_series, min, max, segments_x, segments_y }: { time_series: number[]; min?: number; max?: number; segments_x: number; segments_y: number }): ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let { width, height } = useContainerDimensions(canvasRef);
  const scale = 3;
  width *= scale;
  height *= scale;

  useEffect(() => {
    if(!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if(!context) return;

    context.clearRect(0, 0, width, height);

    const time_series_reduced = PAA(time_series, segments_y * segments_x);
    const chart_min = min ?? time_series.toSorted((a, b) => a - b)[0];
    const chart_max = max ?? time_series.toSorted((a, b) => a - b)[time_series.length - 1];

    const rect_width = width / segments_x;
    const rect_height = height / segments_y;

    const xScale = d3.scaleLinear().range([0, width]).domain([0, segments_x]);
    const yScale = d3.scaleLinear().range([0, height]).domain([0, segments_y]);
    const colorScale = d3.scaleSequential().interpolator(d3.interpolateViridis).domain([chart_min, chart_max]);

    let column = 0;
    let row = 0;
    for(let i = 0; i < time_series_reduced.length; i++) {
      const x = xScale(column);
      const y = yScale(row);

      // Set fill color
      if(isNaN(time_series_reduced[i])) {
        context.fillStyle = "lightgray";
      } else {
        context.fillStyle = colorScale(time_series_reduced[i]);
      }

      // Draw rectangle
      context.fillRect(x, y, rect_width, rect_height);

      row++;
      if(row === segments_y) {
        row = 0;
        column++;
      }
    }
  }, [time_series, min, max, segments_x, segments_y, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%" }}
    />
  );
};