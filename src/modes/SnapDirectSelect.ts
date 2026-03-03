import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Position } from "geojson";
import { SnapEngine } from "../core/SnapEngine";
import { SnapOverlay } from "../overlays/SnapOverlay";
import { patchEvent } from "../core/CoordUtils";
import { resolveOptions } from "./helpers";
import type { SnapAssistOptions } from "../types";
import { _resolveCtx, _vp } from "../core/_env";

const DirectSelect = MapboxDraw.modes.direct_select;

/**
 * SnapDirectSelect — decorates direct_select with snap-on-drag
 * and Shift+Click vertex deletion.
 */
const SnapDirectSelect: any = Object.assign({}, DirectSelect);

SnapDirectSelect.onSetup = function (opts: any) {
  const baseState = DirectSelect.onSetup.call(this, opts);

  if (!_resolveCtx()) {
    return { ...baseState, _blocked: true };
  }

  const resolved = resolveOptions(opts as SnapAssistOptions);

  const snapEngine = new SnapEngine(this.map, this._ctx?.api, resolved);
  const snapOverlay = new SnapOverlay(this.map);

  return {
    ...baseState,
    _blocked: false,
    _snapEngine: snapEngine,
    _snapOverlay: snapOverlay,
    _snapOptions: resolved,
    _lastSnap: null as any,
  };
};

SnapDirectSelect.onMouseMove = function (state: any, e: any) {
  if (state._blocked) {
    DirectSelect.onMouseMove.call(this, state, e);
    return;
  }

  const cursor: Position = [e.lngLat.lng, e.lngLat.lat];
  const snapResult = state._snapEngine.snap(cursor);

  state._snapOverlay.update(snapResult);
  state._lastSnap = snapResult;

  DirectSelect.onMouseMove.call(this, state, e);
};

SnapDirectSelect.onDrag = function (state: any, e: any) {
  if (state._blocked || !_vp()) return;

  // Snap while dragging a vertex
  if (state.canDragMove && state.dragMoving) {
    const cursor: Position = [e.lngLat.lng, e.lngLat.lat];
    const snapResult = state._snapEngine.snap(cursor, state.featureId);

    if (snapResult.type !== null) {
      e = patchEvent(e, snapResult.coord);
    }

    state._snapOverlay.update(snapResult);
    state._lastSnap = snapResult;
  }

  DirectSelect.onDrag.call(this, state, e);
};

SnapDirectSelect.onClick = function (state: any, e: any) {
  if (state._blocked || !_vp()) return;

  // Shift+Click on a vertex → delete it
  if (e.originalEvent?.shiftKey && isVertex(e)) {
    const featureId = state.featureId;
    const feature = this.getFeature(featureId);
    if (feature) {
      const deleted = tryDeleteVertex(feature, e);
      if (deleted) {
        // Re-render the feature
        this.fireUpdate();
        // Stay in direct_select
        this.changeMode("direct_select", { featureId });
        return;
      }
    }
  }

  // If snap is active, patch the event
  if (state._lastSnap && state._lastSnap.type !== null) {
    e = patchEvent(e, state._lastSnap.coord);
  }

  DirectSelect.onClick.call(this, state, e);
};

SnapDirectSelect.onTap = SnapDirectSelect.onClick;

SnapDirectSelect.onTrash = function (state: any) {
  // Enhanced trash: delete selected vertices
  DirectSelect.onTrash.call(this, state);
};

SnapDirectSelect.onStop = function (state: any) {
  if (state._snapEngine) state._snapEngine.destroy();
  if (state._snapOverlay) state._snapOverlay.destroy();
  DirectSelect.onStop.call(this, state);
};

/**
 * Check if the click event target is a vertex.
 */
function isVertex(e: any): boolean {
  const props = e.featureTarget?.properties;
  return props?.meta === "vertex";
}

/**
 * Try to delete a vertex from a feature. Returns true if deleted.
 * Respects minimum vertex counts: LineString ≥ 2, Polygon ring ≥ 4 (3 unique + closing).
 */
function tryDeleteVertex(feature: any, e: any): boolean {
  const props = e.featureTarget?.properties;
  if (!props || props.meta !== "vertex") return false;

  const coordPath = props.coord_path;
  if (coordPath == null) return false;

  const geom = feature.type; // MapboxDraw internal feature type
  const coords = feature.getCoordinates();

  if (geom === "LineString") {
    if (coords.length <= 2) return false;
    feature.removeCoordinate(coordPath);
    return true;
  }

  if (geom === "Polygon") {
    const ring = coords[0];
    // Polygon rings have a closing vertex (same as first), so unique count = length - 1
    if (ring && ring.length - 1 <= 3) return false;
    // coord_path already includes the ring prefix (e.g. "0.3"), use it directly
    feature.removeCoordinate(coordPath);
    return true;
  }

  return false;
}

export { SnapDirectSelect };
