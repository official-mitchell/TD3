/**
 * SpeedGauge. Per Implementation Plan 12.3–12.4.1.
 * D3 semicircle arc, 40% larger, with tick numbers. Color green→amber→red.
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const WIDTH = 140;
const HEIGHT = 95;
const RADIUS = 53; // 40% larger than 38

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

    const cx = WIDTH / 2;
    const cy = HEIGHT - 16;
    const g = d3.select(svgRef.current).append('g').attr('transform', `translate(${cx}, ${cy})`);

    // Background semicircle (track)
    const arcBg = d3
      .arc()
      .innerRadius(RADIUS - 10)
      .outerRadius(RADIUS)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);
    g.append('path')
      .attr('d', arcBg() ?? '')
      .attr('fill', '#1A3A5C');

    // Filled arc from left (0) to value ratio
    const arc = d3
      .arc()
      .innerRadius(RADIUS - 10)
      .outerRadius(RADIUS)
      .startAngle(-Math.PI / 2)
      .endAngle(-Math.PI / 2 + ratio * Math.PI);
    g.append('path')
      .attr('d', arc() ?? '')
      .attr('fill', color);

    // Tick numbers around arc (0, 100, 200, 300)
    const ticks = [0, 100, 200, 300];
    ticks.forEach((v, i) => {
      const t = v / max;
      const angle = -Math.PI / 2 + t * Math.PI;
      const r = RADIUS + 12;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#E8F4FD')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(String(v));
    });

    // Large value label below arc
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 38)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`${Math.round(value)} km/h`);
  }, [value, max]);

  return <svg ref={svgRef} width={WIDTH} height={HEIGHT} className="min-w-0" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />;
};
