// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import React, { ReactElement } from "react";
import { Line } from "react-chartjs-2";
import { CategoryScale, Chart as ChartJS, CoreChartOptions, Filler, Legend, LinearScale, LineElement, PointElement, ScaleChartOptions, Title, Tooltip, } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { TimeSeriesListData } from "../../../types";
import { useTimeSeriesAnomalies, useTimeSeriesData, useTimeSeriesNominals } from "lib/hooks";
import { findClosestDateIndex } from "lib/helper/util";

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
  annotationPlugin,
);

export const LineChartSingle = ({ TID, channel, displayAxis, fontSize }: { TID: string; channel: string; displayAxis: boolean; fontSize: number }): ReactElement => {
  const tsData = useTimeSeriesData(TID, { channel });
  const dateList = tsData.map(d => d.timestamp);
  const anomalies = useTimeSeriesAnomalies(TID).filter(a => a.channel === channel);
  const nominals = useTimeSeriesNominals(TID).filter(n => n.channel === channel);
  const anomalyIndices = anomalies.map(a => [findClosestDateIndex(dateList, a.start.$date), findClosestDateIndex(dateList, a.end.$date)]);
  const nominalIndices = nominals.map(a => [findClosestDateIndex(dateList, a.start.$date), findClosestDateIndex(dateList, a.end.$date)]);

  const datasets = [
    {
      label: TID,
      data: tsData.map(d => d.value),
      borderColor: "rgb(0, 0, 0)",
      backgroundColor: "transparent",
      borderWidth: 1,
      pointRadius: 0,
      tension: 0.4,
    },
  ];

  // Chart.js configuration
  const chartData = {
    labels: Array.from({ length: tsData.length }, (x, i) => i),
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
      decimation: {
        enabled: false,
        algorithm: "min-max",
        samples: 1000,
      },
      annotation: {
        annotations: [...anomalyIndices.map(a => ({
          type: "box",
          xMin: a[0],
          xMax: a[1],
          backgroundColor: "rgb(255, 99, 132, 0.2)",
          borderWidth: 0,
        })), ...nominalIndices.map(n => ({
          type: "box",
          xMin: n[0],
          xMax: n[1],
          backgroundColor: "rgba(133,255,99,0.2)",
          borderWidth: 0,
        }))],
      },
      tooltip: {
        enabled: false, // Disable tooltips
      },
    },
  };

  return <Line data={chartData} options={options}/>;
};