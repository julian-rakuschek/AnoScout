import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Dendrogram, DendrogramTimeSeries } from "../../../types";
import { getAllLeafs, isIDinTree } from "lib/helper/dendrogram";
import { HierarchyNode } from "d3";

interface DendrogramViewerProps {
  data: Dendrogram<DendrogramTimeSeries>;
  selectedBranch: Dendrogram<DendrogramTimeSeries>;
  width?: number;
  height?: number;
}

const DendrogramViewer: React.FC<DendrogramViewerProps> = ({ data, selectedBranch, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if(!svgRef.current) return;
    d3.select(svgRef.current).selectAll("*").remove();

    const root = d3.hierarchy(data, (d: Dendrogram<DendrogramTimeSeries>): Dendrogram<DendrogramTimeSeries>[] => [d.left, d.right].filter(c => c !== undefined) as Dendrogram<DendrogramTimeSeries>[]);
    const nodes = d3.cluster().size([width, height])(root as HierarchyNode<unknown>);

    const maxDist = d3.max(nodes.descendants(), d => (d.data as Dendrogram).dist || 0) || 1;
    nodes.descendants().forEach(node => {
      const dist = (node.data as Dendrogram).dist || (node.parent ? (node.parent.data as Dendrogram).dist || 0 : 0);
      node.y = height * (1 - dist / maxDist);
    });

    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height).append("g");

    svg.selectAll("path").data(nodes.links()).enter().append("path")
      .attr("fill", "none")
      .attr("stroke", d => isIDinTree(selectedBranch, (d.source.data as Dendrogram<DendrogramTimeSeries>).id) ? "#4338ca" : "gray")
      .attr("stroke-width", d => isIDinTree(selectedBranch, (d.source.data as Dendrogram<DendrogramTimeSeries>).id) ? 3 : 1)
      .attr("d", d => `M${d.source.x},${d.source.y} V${(d.source.y + d.target.y) / 2} H${d.target.x} V${d.target.y}`);

  }, [data, selectedBranch, width, height]);

  return <svg ref={svgRef}></svg>;
};

export default DendrogramViewer;