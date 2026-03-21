/**
 * Cross-link highlight hook. Per Implementation Plan Presentation 9.1.
 * Reads uiStore.highlightTargetId. Returns { isHighlighted } when targetId matches.
 */
import { useUIStore } from '../store/uiStore';
import type { CrossLinkTargetId } from '@td3/shared-types';

export function useHighlight(targetId: CrossLinkTargetId): { isHighlighted: boolean } {
  const highlightTargetId = useUIStore((s) => s.highlightTargetId);
  return { isHighlighted: highlightTargetId === targetId };
}
