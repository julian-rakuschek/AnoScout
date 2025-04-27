import { useBinaryAnomalyTS } from "lib/hooks";
import { useMemo } from "react";
import * as d3 from "d3";

const n_segments = 30;

export default function AnomalyLocation({ AID, width, height, color }: { AID: string; width: number; height: number; color: string }): JSX.Element {
  const binary = useBinaryAnomalyTS(AID, n_segments);

  const xScale = useMemo(() => {
    return d3
      .scaleLinear()
      .range([0, width])
      .domain([0, n_segments]);
  }, [binary, width]);

  const yScale = useMemo(() => {
    return d3
      .scaleLinear()
      .range([0, height])
      .domain([0, 1]);
  }, [binary, height]);

  const rect_width = width / n_segments;
  const rect_height = height;

  const shapes = binary.map((value, x) =>
    <rect
      key={x}
      x={xScale(x)}
      y={yScale(0)}
      width={rect_width}
      height={rect_height}
      opacity={1}
      fill={value === 1 ? color : "#d3d3d3"}
    />);

  return (
    <svg width={width} height={height}>
      <g width={width} height={height}>{shapes}</g>
    </svg>
  );

}