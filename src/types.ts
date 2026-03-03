import type { Feature, Point, LineString, Position } from "geojson";

export interface SnapAssistOptions {
  /** Snap radius in pixels (default: 10) */
  snapPx?: number;
  /** Specific layer IDs to snap to */
  layerIds?: string[];
  /** Source IDs to snap to (e.g. ['MV_TRAMO_DE_CABLE', 'MV_POSTE']) */
  sourceIds?: string[];
  /** Snap to features on the draw canvas (default: true) */
  snapToDrawFeatures?: boolean;
  /** Show horizontal/vertical/diagonal alignment guides (default: true) */
  showAlignmentGuides?: boolean;
  /** Snap to guide intersections (default: true) */
  snapToGuides?: boolean;
  /** Pixel tolerance for alignment guides (default: 8) */
  alignTolerance?: number;
  /** Angles at which to draw guides (default: [0, 45, 90, 135, 180, 225, 270, 315]) */
  alignAngles?: number[];
  /** Custom function to override candidate feature fetching */
  snapGetFeatures?: (map: any, cursor: Position, snapPx: number) => Feature[];
}

export interface SnapResult {
  /** The snapped coordinate [lng, lat] */
  coord: Position;
  /** Type of snap that occurred */
  type: "vertex" | "edge" | "guide" | null;
  /** Distance in pixels from cursor to snap point */
  distance: number;
  /** The source feature that was snapped to, if any */
  sourceFeature?: Feature;
}

export interface AlignmentGuide {
  /** The guide line geometry */
  line: Feature<LineString>;
  /** Type of guide */
  type: "horizontal" | "vertical" | "diagonal";
  /** The reference vertex that generated this guide */
  referenceVertex: Position;
  /** The angle of the guide in degrees */
  angle: number;
}

export interface CachedFeatures {
  features: Feature[];
  timestamp: number;
}

export interface SnapOverlayIds {
  source: string;
  layer: string;
}

export interface GuideOverlayIds {
  source: string;
  layer: string;
}

/** Resolved options with defaults applied */
export type ResolvedSnapOptions = Required<
  Omit<SnapAssistOptions, "layerIds" | "sourceIds" | "snapGetFeatures">
> & {
  layerIds?: string[];
  sourceIds?: string[];
  snapGetFeatures?: SnapAssistOptions["snapGetFeatures"];
};
