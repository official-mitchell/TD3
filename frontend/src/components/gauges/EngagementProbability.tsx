/**
 * EngagementProbability. Per Implementation Plan 12.3–12.4.4.
 * D3 arc + text, ref+useEffect pattern, clear+redraw.
 * probability = (1 - distanceMeters/2000) * 0.85, clamped [0,1]. Large % + small arc. Color: red <0.5, amber 0.5–0.75, green >0.75.
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const WIDTH = 120;
const HEIGHT = 60;

const getProbability = (distanceMeters: number): number => {
  const p = (1 - distanceMeters / 2000) * 0.85;
  return Math.min(1, Math.max(0, p));
};

const getColor = (p: number): string => {
  if (p < 0.5) return '#FF1744';
  if (p < 0.75) return '#FFB300';
  return '#00C853';
};

export interface EngagementProbabilityProps {
  distanceMeters: number;
}

export const EngagementProbability: React.FC<EngagementProbabilityProps> = ({ distanceMeters }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const probability = getProbability(distanceMeters);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const color = getColor(probability);
    const pct = (probability * 100).toFixed(0);

    const g = d3.select(svgRef.current).append('g').attr('transform', 'translate(10, 5)');

    // Small arc gauge (semicircle)
    const arc = d3
      .arc()
      .innerRadius(0)
      .outerRadius(18)
      .startAngle(0)
      .endAngle(probability * Math.PI);

    g.append('path')
      .attr('d', arc() ?? '')
      .attr('fill', color)
      .attr('transform', 'translate(25, 25)');

    // Large bold percentage
    g.append('text')
      .attr('x', 55)
      .attr('y', 28)
      .attr('fill', color)
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`${pct}%`);

    // Label
    g.append('text')
      .attr('x', 55)
      .attr('y', 48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#7B9BB5')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('ENG. PROB');
  }, [probability]);

  return <svg ref={svgRef} width={WIDTH} height={HEIGHT} />;
};
