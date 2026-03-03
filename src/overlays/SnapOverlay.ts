import type { Position } from "geojson";
import type { SnapResult } from "../types";

const SNAP_SOURCE_ID = "__snap-assist-indicator-source";
const SNAP_LAYER_ID = "__snap-assist-indicator-layer";

/**
 * Manages the visual snap indicator (a colored circle at the snap point).
 * Red = vertex snap, Blue = edge snap.
 */
export class SnapOverlay {
  private map: any;
  private added = false;

  constructor(map: any) {
    this.map = map;
  }

  private ensureAdded(): void {
    if (this.added) return;

    if (this.map.getSource(SNAP_SOURCE_ID)) {
      this.map.removeLayer(SNAP_LAYER_ID);
      this.map.removeSource(SNAP_SOURCE_ID);
    }

    this.map.addSource(SNAP_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    this.map.addLayer({
      id: SNAP_LAYER_ID,
      type: "circle",
      source: SNAP_SOURCE_ID,
      paint: {
        "circle-radius": 6,
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });

    this.added = true;
  }

  /**
   * Update the snap indicator position and color.
   */
  update(snapResult: SnapResult): void {
    if (snapResult.type === null) {
      this.hide();
      return;
    }

    this.ensureAdded();

    const color = snapResult.type === "vertex" ? "#ef4444" : "#3b82f6";

    const data = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { color },
          geometry: {
            type: "Point" as const,
            coordinates: snapResult.coord,
          },
        },
      ],
    };

    const source = this.map.getSource(SNAP_SOURCE_ID);
    if (source) {
      source.setData(data);
    }
  }

  /**
   * Hide the snap indicator.
   */
  hide(): void {
    if (!this.added) return;
    const source = this.map.getSource(SNAP_SOURCE_ID);
    if (source) {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }

  /**
   * Remove source and layer from the map.
   */
  destroy(): void {
    if (!this.added) return;
    try {
      if (this.map.getLayer(SNAP_LAYER_ID)) {
        this.map.removeLayer(SNAP_LAYER_ID);
      }
      if (this.map.getSource(SNAP_SOURCE_ID)) {
        this.map.removeSource(SNAP_SOURCE_ID);
      }
    } catch {
      // Map might already be destroyed
    }
    this.added = false;
  }
}
