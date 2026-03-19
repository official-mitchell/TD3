/**
 * ThreatMeter. Per Implementation Plan 12.3–12.4.3.
 * D3 horizontal rectangle, ref+useEffect pattern, clear+redraw.
 * Horizontal rectangle, filled width proportional to value (0–1). Color green→red.
 * Label below bar to prevent truncation in narrow sidebars.
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const WIDTH = 140;
const HEIGHT = 44;

export interface ThreatMeterProps {
  value: number;
}

export const ThreatMeter: React.FC<ThreatMeterProps> = ({ value }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const ratio = Math.min(1, Math.max(0, value));
    const barWidth = 120;
    const filledWidth = ratio * barWidth;
    const color = d3.interpolateRgb('#00C853', '#FF1744')(ratio);

    const g = d3.select(svgRef.current).append('g').attr('transform', 'translate(10, 4)');

    // Bar background
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', barWidth)
      .attr('height', 14)
      .attr('fill', '#1A3A5C')
      .attr('rx', 2);

    // Filled portion
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', filledWidth)
      .attr('height', 14)
      .attr('fill', color)
      .attr('rx', 2);

    // Label below bar (prevents truncation)
    g.append('text')
      .attr('x', barWidth / 2)
      .attr('y', 32)
      .attr('text-anchor', 'middle')
      .attr('fill', '#E8F4FD')
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`THREAT ${(value * 100).toFixed(0)}%`);
  }, [value]);

  return <svg ref={svgRef} width={WIDTH} height={HEIGHT} className="min-w-0" />;
};
