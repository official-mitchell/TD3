/**
 * AltitudeBar. Per Implementation Plan 12.3–12.4.2.
 * D3 vertical rectangle, ref+useEffect pattern, clear+redraw.
 * Vertical rectangle, filled height proportional to value/1000. Fill #1E90FF.
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const WIDTH = 120;
const HEIGHT = 80;
const MAX_ALT = 1000;

export interface AltitudeBarProps {
  value: number;
}

export const AltitudeBar: React.FC<AltitudeBarProps> = ({ value }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const ratio = Math.min(1, Math.max(0, value / MAX_ALT));
    const barHeight = 50;
    const filledHeight = ratio * barHeight;

    const g = d3.select(svgRef.current).append('g').attr('transform', `translate(20, 10)`);

    // Label above bar
    g.append('text')
      .attr('x', 40)
      .attr('y', 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#E8F4FD')
      .attr('font-size', '12px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`${Math.round(value)}M`);

    // Bar background
    g.append('rect')
      .attr('x', 0)
      .attr('y', 18)
      .attr('width', 20)
      .attr('height', barHeight)
      .attr('fill', '#1A3A5C')
      .attr('rx', 2);

    // Filled portion (from bottom)
    g.append('rect')
      .attr('x', 0)
      .attr('y', 18 + barHeight - filledHeight)
      .attr('width', 20)
      .attr('height', filledHeight)
      .attr('fill', '#1E90FF')
      .attr('rx', 2);
  }, [value]);

  return <svg ref={svgRef} width={WIDTH} height={HEIGHT} />;
};
