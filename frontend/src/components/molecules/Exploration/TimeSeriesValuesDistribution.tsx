// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import React, { ReactElement } from "react";
import { BucketMinMax } from "../../../types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend, CoreChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { interpolateViridis } from "d3-scale-chromatic";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);
export default function TimeSeriesValuesDistribution({ bucket_min_max }: { bucket_min_max: BucketMinMax }): ReactElement {
  const colors = bucket_min_max.hist.map(bin => interpolateViridis(
    (((bin.from + bin.to) / 2) - bucket_min_max.min) / (bucket_min_max.max - bucket_min_max.min),
  ));
  // Chart.js configuration
  const chartData = {
    labels: bucket_min_max.hist.map(bin => bin.from),
    datasets: [{
      label: "Distribution of values",
      data: bucket_min_max.hist.map(bin => bin.amount),
      borderColor: colors,
      backgroundColor: colors,
      borderWidth: 1,
      pointRadius: 0,
      tension: 0.4,
      order: 0,
      barPercentage: 1,
      categoryPercentage: 1,
    }],
  };

  const options: CoreChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 5,
    animation: false,
    scales: {
      x: {
        display: true,
        ticks: {
          maxRotation: 0,
          autoSkip: false,
          maxTicksLimit: 6,
          font: { size: 10 },
          callback: function(value: number, index: number, ticks: any[]) {
            const labels = chartData.labels;
            const lastIndex = labels.length - 1;

            // Always show first and last labels
            if(index === 0 || index === lastIndex) {
              return labels[index].toFixed(2);
            }

            // For the last label, also show the upper bound of the last bin
            if(index === lastIndex) {
              return bucket_min_max.hist[lastIndex].to.toFixed(2);
            }

            // For intermediate labels, show only a few to avoid crowding
            const ticksToShow = 5; // Adjust this based on your needs
            const step = Math.max(1, Math.floor(labels.length / ticksToShow));

            if(index % step === 0) {
              return labels[index].toFixed(2);
            }

            return "";
          },
        },
        grid: { display: false },
      },
      y: {
        display: false,
        beginAtZero: false,
        stacked: true,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context: any) {
            const bin = bucket_min_max.hist[context.dataIndex];
            return `Range: ${bin.from.toFixed(2)} - ${bin.to.toFixed(2)}`;
          },
        },
      },
    },
  };

  return <Bar data={chartData} options={options}/>;
}