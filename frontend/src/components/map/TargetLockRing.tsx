/**
 * Pulsing ring overlay for selected drone. Per Implementation Plan 7.7.
 * CSS keyframe pulseRing: scale 0.9→1.3, opacity 1→0.4, 1.4s infinite.
 * Used as inline HTML in DroneMarker divIcon when isSelected.
 */
export const PULSE_RING_HTML = `
<style>
@keyframes pulseRing {
  0%, 100% { transform: scale(0.9); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.4; }
}
.td3-pulse-ring {
  position: absolute; left: 50%; top: 50%;
  width: 48px; height: 48px; margin-left: -24px; margin-top: -24px;
  border: 2px solid #EF4444; border-radius: 50%;
  background: transparent; pointer-events: none;
  animation: pulseRing 1.4s ease-in-out infinite;
}
</style>
<div class="td3-pulse-ring"></div>
`;
