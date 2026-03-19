/**
 * SpeedGauge. 270° arc like traditional car speedometer.
 * 0 at bottom-left, 200 at bottom-right. Arc goes from bottom-left through top to bottom-right, clockwise.
 * Ticks/labels use D3→SVG conversion: x=r*sin(θ), y=-r*cos(θ).
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const WIDTH = 180;
const HEIGHT = 170;
const RADIUS = 58;
const MAX_SPEED = 200;
const ARC_SPAN = (3 * Math.PI) / 2;

const colorScale = (t: number): string => {
  if (t <= 0.5) return d3.interpolateRgb('#00C853', '#EAB308')(t * 2);
  return d3.interpolateRgb('#EAB308', '#EF4444')((t - 0.5) * 2);
};

export interface SpeedGaugeProps {
  value: number;
  max?: number;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({ value, max = MAX_SPEED }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const ratio = Math.min(1, Math.max(0, value / max));
    const color = colorScale(ratio);

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2 - 8;
    const g = d3.select(svgRef.current).append('g').attr('transform', `translate(${cx}, ${cy})`);

    // 270° arc: bottom-left (5π/4) to bottom-right (-π/4), clockwise (d3: 0=12oc)
    const startAngle = (5 * Math.PI) / 4;
    const endAngle = startAngle + ARC_SPAN;

    const arcBg = d3
      .arc()
      .innerRadius(RADIUS - 10)
      .outerRadius(RADIUS)
      .startAngle(startAngle)
      .endAngle(endAngle);
    g.append('path')
      .attr('d', arcBg() ?? '')
      .attr('fill', '#1A3A5C');

    const arc = d3
      .arc()
      .innerRadius(RADIUS - 10)
      .outerRadius(RADIUS)
      .startAngle(startAngle)
      .endAngle(startAngle + ratio * ARC_SPAN);
    g.append('path')
      .attr('d', arc() ?? '')
      .attr('fill', color);

    const angleAt = (t: number) => startAngle + t * ARC_SPAN;

    // D3 arc: 0=12oc, angles CW. SVG: x=r*sin(θ), y=-r*cos(θ)
    const toSvg = (r: number, θ: number) => ({ x: r * Math.sin(θ), y: -r * Math.cos(θ) });

    // Half ticks (every 5 km/h) — short marks
    for (let v = 5; v < max; v += 10) {
      const t = v / max;
      const angle = angleAt(t);
      const p1 = toSvg(RADIUS - 10, angle);
      const p2 = toSvg(RADIUS - 6, angle);
      g.append('line')
        .attr('x1', p1.x)
        .attr('y1', p1.y)
        .attr('x2', p2.x)
        .attr('y2', p2.y)
        .attr('stroke', '#E8F4FD')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.5);
    }

    // Major ticks (every 10 km/h) — longer marks
    for (let v = 0; v <= max; v += 10) {
      const t = v / max;
      const angle = angleAt(t);
      const p1 = toSvg(RADIUS - 10, angle);
      const p2 = toSvg(RADIUS, angle);
      g.append('line')
        .attr('x1', p1.x)
        .attr('y1', p1.y)
        .attr('x2', p2.x)
        .attr('y2', p2.y)
        .attr('stroke', '#E8F4FD')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.8);
    }

    // Tick labels at 0, 50, 100, 150, 200 — 0 at true arc start (bottom-left)
    const labelTicks = [0, 50, 100, 150, 200];
    const labelR = RADIUS + 14;
    labelTicks.forEach((v) => {
      const t = v / max;
      const angle = angleAt(t);
      const { x, y } = toSvg(labelR, angle);
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

    // Digital readout centered in arc
    const readoutX = 0;
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 0)
      .attr('y', -8)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(String(Math.round(value)).padStart(2, '0'));

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 0)
      .attr('y', 12)
      .attr('fill', '#94A3B8')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('km/h');

    // SPEED title centered below arc
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 0)
      .attr('y', RADIUS + 24)
      .attr('fill', '#E8F4FD')
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('SPEED');
  }, [value, max]);

  return (
    <div className="flex items-center justify-center">
      <svg ref={svgRef} width={WIDTH} height={HEIGHT} className="min-w-0" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
    </div>
  );
};
