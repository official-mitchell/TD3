/**
 * SpeedGauge. Per Implementation Plan 12.3–12.4.1.
 * D3 semicircle arc, ref+useEffect pattern, clear+redraw. Color green→amber→red.
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const WIDTH = 120;
const HEIGHT = 80;

const colorScale = (t: number): string => {
  if (t <= 0.5) return d3.interpolateRgb('#00C853', '#EAB308')(t * 2);
  return d3.interpolateRgb('#EAB308', '#EF4444')((t - 0.5) * 2);
};

export interface SpeedGaugeProps {
  value: number;
  max?: number;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({ value, max = 300 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const ratio = Math.min(1, Math.max(0, value / max));
    const color = colorScale(ratio);

    // Semicircle 0°–180° (flat at bottom). Filled from left, proportional to value/max.
    const arc = d3
      .arc()
      .innerRadius(0)
      .outerRadius(35)
      .startAngle(-Math.PI / 2)
      .endAngle(-Math.PI / 2 + ratio * Math.PI);

    const g = d3.select(svgRef.current).append('g').attr('transform', `translate(${WIDTH / 2}, ${HEIGHT - 20})`);

    // Filled arc from 0 to ratio * π
    g.append('path')
      .attr('d', arc() ?? '')
      .attr('fill', color);

    // Label centered below arc
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 30)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '12px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`${Math.round(value)} KM/H`);
  }, [value, max]);

  return <svg ref={svgRef} width={WIDTH} height={HEIGHT} />;
};
