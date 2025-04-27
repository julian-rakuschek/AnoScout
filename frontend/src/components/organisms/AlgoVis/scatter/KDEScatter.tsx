import { ReactElement, useEffect, useRef, useState } from "react";
import { AlgoVisKDE, KDEResult, KDESegment } from "../../../../types";
import * as d3 from "d3";
import useMeasure from "react-use-measure";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai/index";
import { segmentHoverAtom } from "lib/atoms";
import ColorLegend from "components/organisms/AlgoVis/scatter/ColorLegend";
import { ALGOVIS } from "../../../../types";

const flattened = (array: number[][]): number[] => array.flatMap((_, j) => array.map(row => row[j]));

// Function to generate star points (5-pointed star)
function starPoints(x: number, y: number, r: number): string {
  const angle = Math.PI / 5; // 36 degrees
  const points: string[] = [];
  for(let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r / 2;
    const theta = i * angle;
    const xPos = x + Math.cos(theta) * radius;
    const yPos = y - Math.sin(theta) * radius;
    points.push(`${xPos},${yPos}`);
  }
  return points.join(" ");
}

export type KDEScatterProps = {
  kdeResult: KDEResult;
  padding: number;
  bucketId: string;
  channel: string;
  params: AlgoVisKDE;
};

export default function KDEScatter({ kdeResult, padding, params, channel, bucketId }: KDEScatterProps): ReactElement {
  const projected = kdeResult.segments;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const normals = projected.filter(p => p.normal);
  const [ref, bounds] = useMeasure();
  const width = Math.floor(bounds.width / 100) * 100;
  const height = Math.floor(bounds.height / 100) * 100;
  const [currentZoomLevel, setCurrentZoomLevel] = useState<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });
  const queryClient = useQueryClient();
  const setHovering = useSetAtom(segmentHoverAtom);

  useEffect(() => {
    if(!svgRef.current || projected.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const min_x_value = projected.map(d => d.x).toSorted((a, b) => a - b)[0];
    const max_x_value = projected.map(d => d.x).toSorted((a, b) => a - b)[projected.length - 1];
    const min_y_value = projected.map(d => d.y).toSorted((a, b) => a - b)[0];
    const max_y_value = projected.map(d => d.y).toSorted((a, b) => a - b)[projected.length - 1];
    const x_padding = (max_x_value - min_x_value) * padding;
    const y_padding = (max_y_value - min_y_value) * padding;
    const xScale = d3.scaleLinear().domain([min_x_value - x_padding, max_x_value + x_padding]).range([0, width]);
    const yScale = d3.scaleLinear().domain([min_y_value - y_padding, max_y_value + y_padding]).range([height, 0]);
    const g = svg.append("g");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    g.attr("transform", currentZoomLevel);

    const zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .translateExtent([[0, 0], [width, height]])
      .on("zoom", event => {
        setCurrentZoomLevel(event.transform);
        g.attr("transform", event.transform);
      });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    svg.call(zoom);

    const quadtree = d3.quadtree<KDESegment>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .addAll(projected);

    // The timestamp is a hacky fix to avoid the browser caching the image, which is necessary when the
    // user marks a point as normal => fetch a new image
    g.append("image")
      .attr("xlink:href", `/api/algovis/KDE/${bucketId}/${channel}/heatmap?img_width=${width}&img_height=${height}&bandwidth=${params.bandwidth}&threshold=${params.level}&timestamp=${Date.now()}`)
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height);

    g.selectAll("circle-regular")
      .data(projected.filter(p => !p.normal))
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 2 / currentZoomLevel.k)
      .attr("fill", p => p.component > 0 && kdeResult.normal_components.includes(p.component) ? "#283593" : "#d81b60");

    g.selectAll("circle-normal")
      .data(normals)
      .enter()
      .append("polygon")
      .attr("points", d => starPoints(xScale(d.x), yScale(d.y), 6 / currentZoomLevel.k))
      .attr("fill", "#ef6c00");

    svg.on("click", async function(event, d) {
      const n = svg.node();
      if(!n) return;
      const transform = d3.zoomTransform(n);
      const [mouseX, mouseY] = transform.invert(d3.pointer(event));
      const radius = 14;

      // Find the closest point within the radius
      const closest = quadtree.find(mouseX, mouseY, radius);
      if(closest && !closest.normal) {
        await ApiRoutes.addNominalArea.fetch({ data: { TID: closest.TID.$oid, channel: closest.channel, date: closest.start.$date } });
        await queryClient.invalidateQueries();
      } else if(closest && closest.normal) {
        await ApiRoutes.deleteNominalByDate.fetch({ data: { TID: closest.TID.$oid, channel: closest.channel, date: closest.start.$date } });
        await queryClient.invalidateQueries();
      }
    });

    svg.on("mousemove", function(event, d) {
      const n = svg.node();
      if(!n) return;
      const transform = d3.zoomTransform(n);
      const [mouseX, mouseY] = transform.invert(d3.pointer(event));
      const radius = 14;

      // Find the closest point within the radius
      const closest = quadtree.find(mouseX, mouseY, radius);
      setHovering(closest);
    });
  }, [kdeResult, width, height, currentZoomLevel]);

  return (
    <div ref={ref} className="w-full h-full flex flex-row justify-center items-center relative">
      <p className={"text-center absolute top-0"}>Click on a point (segment) to toggle its normal status. Scroll to zoom and drag to pan.</p>
      <svg ref={svgRef} width={width} height={height}></svg>
      <div className={"absolute bottom-0 right-0"}>
        <ColorLegend algo={ALGOVIS.KDE}/>
      </div>
    </div>
  );
}