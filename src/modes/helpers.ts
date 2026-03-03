import type { SnapAssistOptions, ResolvedSnapOptions } from "../types";

const DEFAULT_ALIGN_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Merge user options with defaults to produce fully resolved options.
 */
export function resolveOptions(opts?: SnapAssistOptions): ResolvedSnapOptions {
  return {
    snapPx: opts?.snapPx ?? 10,
    snapToDrawFeatures: opts?.snapToDrawFeatures ?? true,
    showAlignmentGuides: opts?.showAlignmentGuides ?? false,
    snapToGuides: opts?.snapToGuides ?? false,
    alignTolerance: opts?.alignTolerance ?? 8,
    alignAngles: opts?.alignAngles ?? DEFAULT_ALIGN_ANGLES,
    layerIds: opts?.layerIds,
    sourceIds: opts?.sourceIds,
    snapGetFeatures: opts?.snapGetFeatures,
  };
}
