/**
 * SpeedGauge. D3 semicircle arc with big digital readout in center.
 * Scale 0–100 km/h. Number + km/h on separate lines; "Speed" title below.
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const WIDTH = 140;
const HEIGHT = 130;
const RADIUS = 53;

const colorScale = (t: number): string => {
  if (t <= 0.5) return d3.interpolateRgb('#00C853', '#EAB308')(t * 2);
  return d3.interpolateRgb('#EAB308', '#EF4444')((t - 0.5) * 2);
};

export interface SpeedGaugeProps {
  value: number;
  max?: number;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({ value, max = 100 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const ratio = Math.min(1, Math.max(0, value / max));
    const color = colorScale(ratio);

    const cx = WIDTH / 2;
    const cy = 50;
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

    // Tick numbers around arc (0, 25, 50, 75, 100)
    const ticks = [0, 25, 50, 75, 100];
    ticks.forEach((v) => {
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

    // Digital readout: number only, reduced left offset (x=10)
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 10)
      .attr('y', -8)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(String(Math.round(value)).padStart(2, '0'));

    // km/h below number, outside arc so it doesn't intersect
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 10)
      .attr('y', 12)
      .attr('fill', '#94A3B8')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('km/h');

    // Title "Speed" underneath
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 10)
      .attr('y', 72)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('SPEED');
  }, [value, max]);

  return (
    <div className="mt-2">
      <svg ref={svgRef} width={WIDTH} height={HEIGHT} className="min-w-0" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
    </div>
  );
};
