import { ReactElement, useEffect, useRef, useState } from "react";
import { OCNNSegment } from "../../../../types";
import * as d3 from "d3";
import useMeasure from "react-use-measure";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai/index";
import { segmentHoverAtom } from "lib/atoms";
import ColorLegend from "components/organisms/AlgoVis/scatter/ColorLegend";
import { ALGOVIS } from "../../../../types";

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

export default function OCNNScatter({ projected, ratio }: { projected: OCNNSegment[]; ratio: number }): ReactElement {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const padding = 0.1;
  const normals = projected.filter(p => p.normal);
  const [ref, bounds] = useMeasure();
  const width = bounds.width;
  const height = bounds.height;
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

    const quadtree = d3.quadtree<OCNNSegment>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .addAll(projected);

    g.selectAll("circle-regular")
      .data(projected.filter(p => !p.normal))
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 4 / currentZoomLevel.k)
      .attr("fill", p => p.ratio > ratio ? "#ec407a" : "#9fa8da");

    g.selectAll("circle-normal")
      .data(normals)
      .enter()
      .append("polygon")
      .attr("points", d => starPoints(xScale(d.x), yScale(d.y), 8 / currentZoomLevel.k))
      .attr("fill", "#1a237e");

    svg.on("click", async function (event, d) {
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

    svg.on("mousemove", function (event, d) {
      const n = svg.node();
      if(!n) return;
      const transform = d3.zoomTransform(n);
      const [mouseX, mouseY] = transform.invert(d3.pointer(event));
      const radius = 14;

      // Find the closest point within the radius
      const closest = quadtree.find(mouseX, mouseY, radius);
      setHovering(closest);
      g.selectAll("line").remove();
      if(closest) {
        closest.paths.forEach(path => {
          g.append("line")
            .attr("x1", xScale(projected[path[0]].x))
            .attr("y1", yScale(projected[path[0]].y))
            .attr("x2", xScale(projected[path[1]].x))
            .attr("y2", yScale(projected[path[1]].y))
            .attr("stroke", closest.ratio > ratio ? "#c2185b" : "#283593")
            .attr("stroke-width", 2 / currentZoomLevel.k);

          g.append("line")
            .attr("x1", xScale(projected[path[2]].x))
            .attr("y1", yScale(projected[path[2]].y))
            .attr("x2", xScale(projected[path[1]].x))
            .attr("y2", yScale(projected[path[1]].y))
            .attr("stroke", closest.ratio > ratio ? "#f48fb1" : "#7986cb")
            .attr("stroke-width", 2 / currentZoomLevel.k);
        });
      }
    });
  }, [projected, width, height, ratio, currentZoomLevel]);

  return (
    <div ref={ref} className="w-full h-full flex flex-row justify-center items-center relative">
      <p className={"text-center absolute top-0"}>Click on a point (segment) to toggle its normal status. Scroll to zoom and drag to pan.</p>
      <svg ref={svgRef} width={width} height={height}></svg>
      <div className={"absolute bottom-0 right-0"}>
        <ColorLegend algo={ALGOVIS.OCNN}/>
      </div>
    </div>
  );
}