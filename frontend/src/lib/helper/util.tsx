import { RefObject, useEffect, useMemo, useState } from "react";

export function classNames(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

export const isoToUTC = (isoDateString: string): string => {
  const date = new Date(isoDateString);
  return date.toUTCString();
};

export const arrayRange = (start: number, stop: number, step: number): number[] =>
  Array.from(
    { length: (stop - start) / step + 1 },
    (value, index) => start + index * step,
  );

export const findClosestDate = (dateList: string[], needle: string): string => {
  if(dateList.length === 0) return needle;
  const targetDateTime = new Date(needle).getTime();
  const dateObjects = dateList.map(dateString => new Date(dateString));
  const differences = dateObjects.map(dateObject => Math.abs(targetDateTime - dateObject.getTime()));
  const minDifferenceIndex = differences.indexOf(Math.min(...differences));
  return dateList[minDifferenceIndex];
};

export const findClosestDateIndex = (dateList: string[], needle: string): number => {
  if(dateList.length === 0) return 0;
  const targetDateTime = new Date(needle).getTime();
  const dateObjects = dateList.map(dateString => new Date(dateString));
  const differences = dateObjects.map(dateObject => Math.abs(targetDateTime - dateObject.getTime()));
  return differences.indexOf(Math.min(...differences));
};

export default function useOnScreen(ref: RefObject<HTMLElement>): boolean {

  const [isIntersecting, setIntersecting] = useState(false);

  const observer = useMemo(() => new IntersectionObserver(
    ([entry]) => setIntersecting(entry.isIntersecting),
  ), [ref]);


  useEffect(() => {
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);

  return isIntersecting;
}

export const useContainerDimensions = myRef => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const getDimensions = () => ({
      width: myRef.current.offsetWidth,
      height: myRef.current.offsetHeight,
    });

    const handleResize = () => {
      setDimensions(getDimensions());
    };

    if(myRef.current) {
      setDimensions(getDimensions());
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [myRef]);

  return dimensions;
};

export function PAA(timeSeries: number[], segments: number): number[] {
  if(timeSeries.length === 0) return [];
  if(segments === 1) {
    const sum = timeSeries.reduce((acc, val) => acc + val, 0);
    return [sum / timeSeries.length];
  }
  if(segments >= timeSeries.length) return [...timeSeries];

  const segmentSize: number = timeSeries.length / segments;
  const result: number[] = [];
  for(let i = 0; i < segments; i++) {
    const startIdx: number = Math.floor(i * segmentSize);
    const endIdx: number = Math.floor((i + 1) * segmentSize);
    let sum = 0;
    let count = 0;
    for(let j = startIdx; j < endIdx; j++) {
      sum += timeSeries[j];
      count++;
    }
    result.push(count > 0 ? sum / count : 0);
  }
  return result;
}

export function transpose(matrix: number[][]): number[][] {
  const rowLength = matrix[0].length;
  const result: number[][] = [];
  for(let j = 0; j < rowLength; j++) {
    result.push(new Array(matrix.length).fill(0));
  }
  for(let i = 0; i < matrix.length; i++) {
    for(let j = 0; j < rowLength; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}