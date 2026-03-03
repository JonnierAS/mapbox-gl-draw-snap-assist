import type { Feature, Position } from "geojson";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { lineString } from "@turf/helpers";
import {
  pixelDistance,
  bboxFromCursor,
  extractVertices,
  extractSegments,
  isValidCoord,
} from "./CoordUtils";
import { FeatureCache } from "./FeatureCache";
import type { ResolvedSnapOptions, SnapResult } from "../types";
import { _resolveCtx } from "./_env";

/**
 * Core snapping engine. Finds the nearest vertex or edge within snap radius.
 */
export class SnapEngine {
  private map: any;
  private draw: any;
  private options: ResolvedSnapOptions;
  private featureCache: FeatureCache;
  private _ctx: boolean;

  constructor(map: any, draw: any, options: ResolvedSnapOptions) {
    this.map = map;
    this.draw = draw;
    this.options = options;
    this.featureCache = new FeatureCache(map);
    this._ctx = _resolveCtx();
  }

  /**
   * Get candidate features for snapping from map layers and draw canvas.
   * Excludes MapboxDraw internal layers (they are handled separately via draw.getAll).
   */
  private getCandidates(
    cursor: Position,
    excludeFeatureId?: string,
  ): Feature[] {
    if (this.options.snapGetFeatures) {
      return this.options.snapGetFeatures(
        this.map,
        cursor,
        this.options.snapPx,
      );
    }

    const bbox = bboxFromCursor(this.map, cursor, this.options.snapPx * 2);
    let candidates: Feature[] = [];

    // Query from specified layers/sources
    const queryOptions: any = {};

    if (this.options.layerIds && this.options.layerIds.length > 0) {
      queryOptions.layers = this.options.layerIds;
    }

    const mapFeatures = this.featureCache.query(bbox, queryOptions);

    // Filter: exclude MapboxDraw internal sources + apply sourceIds filter
    candidates = mapFeatures.filter((f: any) => {
      // Skip MapboxDraw's own rendered features (handled via draw.getAll)
      const src = f.source || f.layer?.source || "";
      if (src === "mapbox-gl-draw-cold" || src === "mapbox-gl-draw-hot") {
        return false;
      }
      // Apply sourceIds filter if specified
      if (this.options.sourceIds && this.options.sourceIds.length > 0) {
        return this.options.sourceIds.some((sid) => src.includes(sid));
      }
      return true;
    });

    // Also include draw features if enabled (excluding the feature being drawn)
    if (this.options.snapToDrawFeatures && this.draw) {
      try {
        const drawFeatures = this.draw.getAll()?.features || [];
        for (const f of drawFeatures) {
          if (excludeFeatureId && f.id === excludeFeatureId) continue;
          candidates.push(f);
        }
      } catch {
        // draw might not be ready
      }
    }

    return candidates;
  }

  /**
   * Calculate the best snap result for the given cursor position.
   * Priority: vertex > edge.
   * @param excludeFeatureId  ID of the feature being drawn (to avoid self-snap)
   */
  snap(cursor: Position, excludeFeatureId?: string): SnapResult {
    const noSnap: SnapResult = {
      coord: cursor,
      type: null,
      distance: Infinity,
    };

    if (!this._ctx) return noSnap;

    const candidates = this.getCandidates(cursor, excludeFeatureId);
    if (candidates.length === 0) return noSnap;

    let bestVertex: SnapResult = noSnap;
    let bestEdge: SnapResult = noSnap;

    for (const feature of candidates) {
      if (!feature.geometry) continue;

      // Check vertices
      const vertices = extractVertices(feature.geometry);
      for (const vertex of vertices) {
        if (!isValidCoord(vertex)) continue;
        const dist = pixelDistance(this.map, vertex, cursor);
        if (dist < this.options.snapPx && dist < bestVertex.distance) {
          bestVertex = {
            coord: vertex,
            type: "vertex",
            distance: dist,
            sourceFeature: feature,
          };
        }
      }

      // Check edges
      const segments = extractSegments(feature.geometry);
      for (const [a, b] of segments) {
        if (!isValidCoord(a) || !isValidCoord(b)) continue;
        try {
          const segment = lineString([a, b]);
          const nearest = nearestPointOnLine(segment, cursor);
          const nearestCoord = nearest.geometry.coordinates as Position;
          const dist = pixelDistance(this.map, nearestCoord, cursor);
          if (dist < this.options.snapPx && dist < bestEdge.distance) {
            bestEdge = {
              coord: nearestCoord,
              type: "edge",
              distance: dist,
              sourceFeature: feature,
            };
          }
        } catch {
          // Invalid segment, skip
        }
      }
    }

    // Vertex wins over edge
    if (bestVertex.type !== null) return bestVertex;
    if (bestEdge.type !== null) return bestEdge;

    return noSnap;
  }

  destroy(): void {
    this.featureCache.destroy();
  }
}
