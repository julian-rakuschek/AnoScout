import React, { ReactElement, useEffect, useRef } from "react";
import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import { TimeSeriesListData } from "../../../types";
import { interpolateViridis } from "d3-scale-chromatic";
import * as d3 from "d3";
import { useContainerDimensions } from "lib/helper/util";

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

export const HorizonChart = ({ time_series, min, max, n_segments }: { time_series: number[]; min?: number; max?: number; n_segments: number }): ReactElement => {
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

    const chart_min = min ?? time_series.toSorted((a, b) => a - b)[0];
    const chart_max = max ?? time_series.toSorted((a, b) => a - b)[time_series.length - 1];
    const step_size = Math.abs(chart_max - chart_min) / n_segments;
    const stack: number[][] = [];

    for(let i = 0; i < n_segments; i++) {
      const slice_min = chart_min + step_size * i;
      const slice_max = chart_min + step_size * (i + 1);
      const offset = Math.abs(chart_min - slice_min);
      const capped = time_series.map(t => Math.min(Math.max(t, slice_min), slice_max) - offset);
      stack.push(capped);
    }

    const xScale = d3.scaleLinear()
      .domain([0, time_series.length - 1])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([chart_min, chart_min + step_size])
      .range([height, 0]);

    const drawSegment = (segmentData: number[], segmentIndex: number): void => {
      const color = interpolateViridis(segmentIndex / n_segments);
      context.fillStyle = color;
      context.strokeStyle = color;

      context.beginPath();
      const firstX = xScale(0);
      const firstY = yScale(segmentData[0]);
      context.moveTo(firstX, firstY);
      for(let i = 1; i < segmentData.length; i++) {
        const x = xScale(i);
        const y = yScale(segmentData[i]);
        context.lineTo(x, y);
      }
      context.lineTo(xScale(segmentData.length - 1), height);
      context.lineTo(xScale(0), height);
      context.closePath();
      context.fill();
      context.stroke();
    };

    for(let i = 0; i < n_segments; i++) {
      drawSegment(stack[i], i);
    }

  }, [time_series, min, max, n_segments, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%" }}
    />
  );
};