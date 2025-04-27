import { useEffect, useRef, useState } from "react";
import { curveNatural, line } from 'd3';

export default function LandingPageAnimation(): JSX.Element {
  const anchorPointX = 0;
  const anchorPointY = window.innerHeight / 2;
  const step_size = 10;
  const elements = Math.ceil(window.innerWidth / step_size);
  const [points, setPoints] = useState<[number, number][]>([[anchorPointX, anchorPointY]]);
  const anomalyJumps = [-50, 100, -150, 200, -200, 150, -100, 50];
  const anomalyCount = useRef(0);
  const anomalyScale = useRef(5);

  function generateRandomNumber(): number {
    return Math.random() * 2 - 1; // This generates a random number between 0 and 1 and then shifts it to be between -1 and 1
  }

  function randomIntFromInterval(min: number, max: number): number { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  useEffect(() => {
    let initial_points: [number, number][] = [[anchorPointX, anchorPointY]];
    for(let i = 0; i < elements; i += 1) {
      const directionY = generateRandomNumber() * 30;
      const new_point: [number, number] = [initial_points[i][0] + step_size, initial_points[i][1] + directionY];
      initial_points = [...initial_points, new_point];
    }
    setPoints(initial_points);
  }, []);

  useEffect(() => {
    // Implementing the setInterval method
    const interval = setInterval(() => {
      const directionY = (anomalyCount.current < anomalyJumps.length) ? anomalyJumps[anomalyCount.current] * anomalyScale.current : generateRandomNumber() * 30;
      const transformed: [number, number][] = points.map(point => [point[0] + step_size, point[1]]);
      const sliced: [number, number][] = transformed.slice(0, elements);
      setPoints([[anchorPointX, Math.max(Math.min(sliced[0][1] + directionY, window.innerHeight), 100)], ...sliced]);
      if(anomalyCount.current <= 0) {
        anomalyCount.current = randomIntFromInterval(130, 250);
        anomalyScale.current = randomIntFromInterval(1, 6);
      } else anomalyCount.current--;
    }, 30);

    // Clearing the interval
    return () => clearInterval(interval);
  }, [points]);

  let curveLine = line().curve(curveNatural).x(p => p[0]).y(p => p[1])

  return (
    <div>
      <svg width={window.innerWidth} height={window.innerHeight} viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}>
        <path d={curveLine(points) ?? undefined} fill="none" stroke={"#ffffff"} strokeWidth={4}/>
      </svg>
    </div>
  );
}