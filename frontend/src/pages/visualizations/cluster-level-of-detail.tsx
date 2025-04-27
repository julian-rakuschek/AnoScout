import React, { ReactElement, useEffect, useRef } from "react";
import { TimeSeriesClusterSemanticZoomState, TimeSeriesListSettingsType, TimeSeriesVis, TimeSeriesListData } from "../../types";
import { CoreChartOptions, ScaleChartOptions } from "chart.js";
import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip, } from "chart.js";
import { Line } from "react-chartjs-2";
import { PAA, useContainerDimensions } from "lib/helper/util";
import * as d3 from "d3";
import { interpolateViridis } from "d3-scale-chromatic";
import { useTimeSeriesListData } from "lib/hooks";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import { DefaultPageWithBoundaries } from "components/organisms/DefaultPage";

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

const LineChart = ({ tsList, data, displayAxis, fontSize }: { tsList: string[]; data: TimeSeriesListData; displayAxis: boolean; fontSize: number }): ReactElement => {
  // Create datasets for each time series
  const datasets = tsList.map((ts, index) => ({
    label: ts,
    data: data[ts],
    borderColor: tsList.length > 1 ? "rgba(0, 0, 0, 0.2)" : "rgb(0, 0, 0)",
    backgroundColor: "transparent",
    borderWidth: 1,
    pointRadius: 0, // No dots
    tension: 0.4, // Similar to monotone interpolation
    order: tsList.length - index,
  }));


  // Add barycenter dataset if multiple lines
  if(tsList.length > 1) {
    datasets.push({
      label: "barycenter",
      data: data.barycenter_values,
      borderColor: "#304ffe",
      backgroundColor: "transparent",
      borderWidth: 1,
      pointRadius: 0,
      tension: 0.4,
      order: 0,
    });
  }

  // Chart.js configuration
  const chartData = {
    labels: Array.from({ length: data.barycenter_values.length }, (x, i) => i),
    datasets: datasets,
  };

  const options: CoreChartOptions<"line"> & ScaleChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 5,
    animation: false,
    scales: {
      x: {
        display: false, // Hidden X axis
      },
      y: {
        display: displayAxis, // Hidden Y axis
        beginAtZero: false,
        ticks: {
          font: {
            size: fontSize,
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false, // Hide legend
      },
      tooltip: {
        enabled: false, // Disable tooltips
      },
    },
  };

  return <Line data={chartData} options={options}/>;
};


const HorizonChart = ({ data, min, max, n_segments }: { data: TimeSeriesListData; min?: number; max?: number; n_segments: number }): ReactElement => {
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

    const time_series = data.barycenter_values;
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

  }, [data, min, max, n_segments, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%" }}
    />
  );
};


const Heatmap = ({ data, min, max, segments_x, segments_y }: { data: TimeSeriesListData; min?: number; max?: number; segments_x: number; segments_y: number }): ReactElement => {
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

    const time_series = data.barycenter_values;
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
  }, [data, min, max, segments_x, segments_y, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const ts = "67e56a510ac38c0f0967ecad";
const settings: TimeSeriesListSettingsType = {
  cluster: 1,
  visualization: TimeSeriesVis.HEATMAP,
  channel: "value",
  scoreMin: 0,
  scoreMax: 1,
};

function GridIcon({ size, gap }: { size: number; gap: number }): ReactElement {
  const grid_class = `w-[150px] h-[150px] grid gap-${gap}`;

  return <div className={"h-[150px] grid place-items-center relative"}>
    <div className={grid_class} style={{
      gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
    }}>
      {[...Array(size * size).keys()].map(() => <div className={"w-full h-full bg-indigo-700"}></div>)}
    </div>
    <div className={"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white text-indigo-700 font-bold px-3 pt-1 pb-2 shadow-lg"}>
      {size} x {size}
    </div>
  </div>;
}

export default function ClusterLevelOfDetail(): ReactElement {
  const data = useTimeSeriesListData([ts], "value-0", 1000);

  const font_sizes: { [size: number]: number } = { 2: 13, 3: 13, 4: 12, 5: 11, 6: 10, 7: 9 };
  const grid_settings: { [size: number]: TimeSeriesClusterSemanticZoomState } = {
    2: { lineChartInteractive: true, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 1, heatmapCellsX: 40, heatmapCellsY: 20 },
    3: { lineChartInteractive: true, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 3, heatmapCellsX: 30, heatmapCellsY: 15 },
    4: { lineChartInteractive: true, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 5, heatmapCellsX: 20, heatmapCellsY: 10 },
    5: { lineChartInteractive: false, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 7, heatmapCellsX: 15, heatmapCellsY: 7 },
    6: { lineChartInteractive: false, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 9, heatmapCellsX: 12, heatmapCellsY: 6 },
    7: { lineChartInteractive: false, lineChartFontSize: font_sizes[settings.cluster], horizonBands: 11, heatmapCellsX: 10, heatmapCellsY: 5 },
  };

  if(!data) return <CenteredLoadingSpinner/>;

  return <DefaultPageWithBoundaries>
    <div className={"grid grid-cols-4 w-1/2 gap-4"}>
      <p className={"text-center font-bold text-lg"}>Grid Size</p>
      <p className={"text-center font-bold text-lg"}>Linechart</p>
      <p className={"text-center font-bold text-lg"}>Horizon Chart</p>
      <p className={"text-center font-bold text-lg"}>Heatmap</p>
      {[7, 6, 5, 4, 3].map(size => <>
        <GridIcon size={size} gap={1}/>
        <div className="w-full h-[150px]">
          <LineChart tsList={[ts]} data={data} displayAxis={grid_settings[size].lineChartInteractive} fontSize={font_sizes[size]}/>
        </div>
        <div className="w-full h-[150px]">
          <HorizonChart data={data} n_segments={grid_settings[size].horizonBands}/>
        </div>
        <div className="w-full h-[150px]">
          <Heatmap data={data} segments_x={grid_settings[size].heatmapCellsX} segments_y={grid_settings[size].heatmapCellsY}/>
        </div>
      </>)}


    </div>
  </DefaultPageWithBoundaries>;
}