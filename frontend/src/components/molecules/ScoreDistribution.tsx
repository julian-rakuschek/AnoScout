import React, { ReactElement, useEffect, useState } from "react";
import { useScoreDistribution } from "lib/hooks";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import { Histogram } from "../../types";
import { interpolateViridis } from "d3-scale-chromatic";
import { Bar } from "react-chartjs-2";
import { SHAPcolors } from "lib/helper/color";
import RangeSlider from "react-range-slider-input";


function ScoreHistogram({ histogram, min, max }: { histogram: Histogram; min?: number; max?: number }): ReactElement {
  const hist_min = min ?? 0;
  const hist_max = max ?? 0;
  const colors = histogram.map(bin => SHAPcolors(
    (((bin.from + bin.to) / 2) - hist_min) / (hist_max - hist_min),
  ));
  // Chart.js configuration
  const chartData = {
    labels: histogram.map(bin => bin.from),
    datasets: [{
      label: "Distribution of scores",
      data: histogram.map(bin => bin.amount),
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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 5,
    animation: false,
    scales: {
      x: {
        display: false,
        ticks: {
          maxRotation: 0,
          autoSkip: false,
          maxTicksLimit: 6,
          font: { size: 10 },
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
        enabled: false,
      },
    },
  };

  return <Bar data={chartData} options={options}/>;
}

export default function ScoreDistribution({ BID, channel, updateFunction }: { BID: string; channel: string; updateFunction: (min: number, max: number) => void }): ReactElement {
  const histogram = useScoreDistribution(BID, channel);
  const [minmax, setMinmax] = useState<[number, number]>([0, 1]);

  useEffect(() => {
    updateFunction(...minmax);
  }, [minmax]);

  if(!histogram) return <CenteredLoadingSpinner/>;

  return <div>
    <div className={"w-full h-[100px]"}>
      <ScoreHistogram histogram={histogram} min={minmax[0]} max={minmax[1]}/>
    </div>
    <div className={"mt-2"}>
      <RangeSlider min={0} max={1} step={0.001} value={minmax} onInput={(e) => setMinmax(e)} />
    </div>
  </div>;
}