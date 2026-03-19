/**
 * ElevationChart. X/Y axis quarter-circle (90°) chart.
 * Origin (0,0) = vehicle (blinking). Arc = altitude vs elevation angle.
 * Turret/target line uses same coords as drone (x=r*sin(θ), y=-r*cos(θ)) for alignment with blue highlight.
 */
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { calculateDistance } from '../../utils/calculations';

const SIZE = 180;
const PAD = 16;
const RADIUS = SIZE - PAD * 2 - 8;

export interface ElevationChartProps {
  platformPosition: { lat: number; lng: number };
  dronePosition: { lat: number; lng: number; altitude: number };
  turretHeading?: number; // azimuth, for reference; elevation derived from target when selected
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  platformPosition,
  dronePosition,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [blink, setBlink] = useState(true);

  const slantM = calculateDistance(platformPosition, dronePosition);
  const altM = dronePosition.altitude;
  const horizM = Math.sqrt(Math.max(1, slantM * slantM - altM * altM));
  const elevationDeg = (Math.atan2(altM, horizM) * 180) / Math.PI;

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const maxDist = 2000;
    const scaleR = d3.scaleLinear().domain([0, maxDist]).range([0, RADIUS]);

    const cx = PAD + 6;
    const cy = SIZE - PAD - 10;

    const g = d3.select(svgRef.current).append('g').attr('transform', `translate(${cx}, ${cy})`);

    // Radial arc lines — positive X quadrant only (d3: 0=12oc, π/2=3oc)
    const gridOpacity = 0.25;
    for (let r = RADIUS / 4; r < RADIUS; r += RADIUS / 4) {
      const arcGrid = d3
        .arc()
        .innerRadius(r)
        .outerRadius(r)
        .startAngle(Math.PI / 2)
        .endAngle(0);
      g.append('path')
        .attr('d', arcGrid() ?? '')
        .attr('fill', 'none')
        .attr('stroke', '#E8F4FD')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', gridOpacity);
    }
    for (let deg = 10; deg < 90; deg += 10) {
      const angle = deg * (Math.PI / 180);
      const x2 = RADIUS * Math.sin(angle);
      const y2 = -RADIUS * Math.cos(angle);
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#E8F4FD')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', gridOpacity);
    }

    // X axis line (horizontal from origin) — ensure visible above container edge
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', RADIUS)
      .attr('y2', 0)
      .attr('stroke', '#E8F4FD')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8);

    // Y axis line (vertical from origin)
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', -RADIUS)
      .attr('stroke', '#E8F4FD')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Quarter circle arc — positive X quadrant (right to top)
    const arcBg = d3
      .arc()
      .innerRadius(0)
      .outerRadius(RADIUS)
      .startAngle(Math.PI / 2)
      .endAngle(0);
    g.append('path')
      .attr('d', arcBg() ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#1A3A5C')
      .attr('stroke-width', 2);

    // Blue highlight: 0° to elevation, positive X only, 65% transparent (35% opacity)
    const arcFill = d3
      .arc()
      .innerRadius(0)
      .outerRadius(RADIUS)
      .startAngle(Math.PI / 2)
      .endAngle(Math.PI / 2 - (elevationDeg / 90) * (Math.PI / 2));
    g.append('path')
      .attr('d', arcFill() ?? '')
      .attr('fill', '#1E90FF')
      .attr('fill-opacity', 0.35);

    // Drone point (at elevation angle, distance) — upper-right quadrant
    const droneR = scaleR(Math.min(slantM, maxDist));
    const droneAngle = (elevationDeg / 90) * (Math.PI / 2);
    const droneX = droneR * Math.sin(droneAngle);
    const droneY = -droneR * Math.cos(droneAngle);
    g.append('circle')
      .attr('cx', droneX)
      .attr('cy', droneY)
      .attr('r', 4)
      .attr('fill', '#EF4444');

    // Line from origin to drone
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', droneX)
      .attr('y2', droneY)
      .attr('stroke', '#1E90FF')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');

    // Vehicle at origin (blinking)
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', blink ? '#00C853' : 'rgba(0, 200, 83, 0.3)')
      .attr('stroke', '#00C853')
      .attr('stroke-width', 2);

    // Turret/target line — same coords as drone (x=r*sin(θ), y=-r*cos(θ)) so it aligns with blue highlight
    const lineR = RADIUS * 0.8;
    const tx = lineR * Math.sin(droneAngle);
    const ty = -lineR * Math.cos(droneAngle);
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', tx)
      .attr('y2', ty)
      .attr('stroke', '#EAB308')
      .attr('stroke-width', 2);

    // Labels (white font)
    g.append('text')
      .attr('x', RADIUS / 2)
      .attr('y', -RADIUS / 2 - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`ALT ${Math.round(altM)}m`);

    g.append('text')
      .attr('x', RADIUS / 2)
      .attr('y', -RADIUS / 2 + 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`${elevationDeg.toFixed(1)}° elevation`);

    // Small numbers around arc (0°, 30°, 60°, 90°) — upper-right quadrant
    [0, 30, 60, 90].forEach((deg) => {
      const angle = deg * (Math.PI / 180);
      const r = RADIUS + 10;
      const x = r * Math.sin(angle);
      const y = -r * Math.cos(angle);
      g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#FFFFFF')
        .attr('font-size', '8px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(`${deg}°`);
    });
  }, [elevationDeg, altM, slantM, horizM, blink]);

  return <svg ref={svgRef} width={SIZE} height={SIZE} className="min-w-0" />;
};
