import { makeHull } from "lib/convexHull";

type CHProps = {
  points: { x: number; y: number }[];
  color: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  x1?: number;
  x2?: number;
  y1?: number;
  y2?: number;
};
export default function ConvexHull({ points, color, ...props }: CHProps): JSX.Element {
  // @ts-expect-error I will fix this sometime in the future, for now I know that ConvexHull is receiving the correct props from ReferenceArea
  const interpolateX = (x: number): number => (props.x1 - x) / (props.x1 - props.x2) * props.width + props.x;
  // @ts-expect-error I will fix this sometime in the future, for now I know that ConvexHull is receiving the correct props from ReferenceArea
  const interpolateY = (y: number): number => (props.y1 - y) / (props.y1 - props.y2) * props.height + props.y;
  // @ts-expect-error I will fix this sometime in the future, for now I know that ConvexHull is receiving the correct props from ReferenceArea
  const invertY = (y: number): number => props.y2 - (y - props.y1);

  const ch = makeHull(points);
  const pointsString = ch.map(point => `${interpolateX(point.x)},${interpolateY(invertY(point.y))}`).join(" ");

  return <polygon points={pointsString} fill={color} stroke={color} strokeWidth="1" fillOpacity={0.3}/>;
}