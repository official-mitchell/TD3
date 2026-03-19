/**
 * ThreatMeter. Horizontal bar with gradient fill.
 * % shown inside bar: in filled section if >50%, in empty section if ≤50%.
 * Question mark icon inline with THREAT label.
 */
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const WIDTH = 180;
const HEIGHT = 28;
const BAR_WIDTH = 160;
const BAR_HEIGHT = 18;

const TOOLTIP_TEXT =
  'Threat level reflects the assessed risk to the craft from nearby hostiles or hazards. Higher values indicate greater danger.';

export interface ThreatMeterProps {
  value: number;
}

export const ThreatMeter: React.FC<ThreatMeterProps> = ({ value }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();

    const ratio = Math.min(1, Math.max(0, value));
    const filledWidth = ratio * BAR_WIDTH;
    const pct = `${(value * 100).toFixed(0)}%`;

    const g = d3.select(svgRef.current).append('g').attr('transform', 'translate(10, 4)');

    // Gradient definition
    const defs = g.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'threatGrad')
      .attr('x1', 0)
      .attr('x2', 1)
      .attr('y1', 0)
      .attr('y2', 0);
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#00C853');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#FF1744');

    // Bar background
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', BAR_WIDTH)
      .attr('height', BAR_HEIGHT)
      .attr('fill', '#1A3A5C')
      .attr('rx', 2);

    // Filled portion (gradient)
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', filledWidth)
      .attr('height', BAR_HEIGHT)
      .attr('fill', 'url(#threatGrad)')
      .attr('rx', 2);

    // % inside bar: filled if >50%, empty if ≤50%
    const inFilled = ratio > 0.5;
    const textX = inFilled ? filledWidth / 2 : filledWidth + (BAR_WIDTH - filledWidth) / 2;
    const textFill = inFilled ? '#FFFFFF' : '#E8F4FD';

    g.append('text')
      .attr('x', textX)
      .attr('y', BAR_HEIGHT / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', textFill)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(pct);

    // Label row (THREAT + icon rendered in JSX below)
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg ref={svgRef} width={WIDTH} height={HEIGHT} className="min-w-0" />
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[11px] font-mono text-[#E8F4FD]">THREAT</span>
        <Tooltip title={TOOLTIP_TEXT} arrow placement="top">
          <HelpOutlineIcon className="cursor-help text-cyan-400/80 hover:text-cyan-300" sx={{ fontSize: 14 }} />
        </Tooltip>
      </div>
    </div>
  );
};
