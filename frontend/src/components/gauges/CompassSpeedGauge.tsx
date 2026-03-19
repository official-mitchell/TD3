/**
 * CompassSpeedGauge. Fifth meter: compass + speed combined.
 * Circular compass (0–360°) with heading needle and speed readout in center.
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const WIDTH = 100;
const HEIGHT = 100;
const RADIUS = 42;

export interface CompassSpeedGaugeProps {
  heading: number;
  speed: number;
}

export const CompassSpeedGauge: React.FC<CompassSpeedGaugeProps> = ({ heading, speed }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const g = d3.select(svgRef.current).append('g').attr('transform', `translate(${cx}, ${cy})`);

    // Compass circle (track)
    g.append('circle')
      .attr('r', RADIUS)
      .attr('fill', '#1A3A5C')
      .attr('stroke', '#0EA5E9')
      .attr('stroke-width', 1);

    // Cardinal ticks: N, E, S, W
    const cardinals = [
      { label: 'N', angle: -90 },
      { label: 'E', angle: 0 },
      { label: 'S', angle: 90 },
      { label: 'W', angle: 180 },
    ];
    cardinals.forEach(({ label, angle }) => {
      const rad = (angle * Math.PI) / 180;
      const r = RADIUS - 4;
      const x = r * Math.cos(rad);
      const y = r * Math.sin(rad);
      g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#94A3B8')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(label);
    });

    // Heading needle: tip points up (North) by default; rotate(heading) for direction of travel
    const needle = g.append('g').attr('transform', `rotate(${heading})`);
    needle
      .append('path')
      .attr('d', `M 0 ${-RADIUS + 8} L -4 8 L 0 ${RADIUS - 4} L 4 8 Z`)
      .attr('fill', '#0EA5E9')
      .attr('stroke', '#E8F4FD')
      .attr('stroke-width', 1);

    // Speed readout in center
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 0)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`${String(Math.round(speed)).padStart(2, '0')}`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 14)
      .attr('fill', '#94A3B8')
      .attr('font-size', '8px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('km/h');

    // Heading degrees (no HDG prefix), 30% larger font: 9 * 1.3 ≈ 12
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', RADIUS + 14)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '12px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`${heading.toFixed(0)}°`);

    // "HEADING" label below
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', RADIUS + 28)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('HEADING');
  }, [heading, speed]);

  const totalHeight = HEIGHT + 40;
  return (
    <div className="mt-2">
      <svg ref={svgRef} width={WIDTH} height={totalHeight} className="min-w-0" viewBox={`0 0 ${WIDTH} ${totalHeight}`} />
    </div>
  );
};
