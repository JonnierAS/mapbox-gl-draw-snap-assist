import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Position } from "geojson";
import { SnapEngine } from "../core/SnapEngine";
import { AlignmentEngine } from "../core/AlignmentEngine";
import { SnapOverlay } from "../overlays/SnapOverlay";
import { GuideOverlay } from "../overlays/GuideOverlay";
import { patchEvent } from "../core/CoordUtils";
import { resolveOptions } from "./helpers";
import type { SnapAssistOptions } from "../types";
import { _resolveCtx, _vp } from "../core/_env";

const DrawPolygon = MapboxDraw.modes.draw_polygon;

/**
 * SnapPolygonMode — decorates draw_polygon with snap and alignment guides.
 */
const SnapPolygonMode: any = Object.assign({}, DrawPolygon);

SnapPolygonMode.onSetup = function (opts: SnapAssistOptions) {
  const baseState = DrawPolygon.onSetup.call(this, opts);

  if (!_resolveCtx()) {
    return { ...baseState, _blocked: true };
  }

  const resolved = resolveOptions(opts);

  const snapEngine = new SnapEngine(this.map, this._ctx?.api, resolved);
  const alignmentEngine = new AlignmentEngine(this.map, resolved);
  const snapOverlay = new SnapOverlay(this.map);
  const guideOverlay = new GuideOverlay(this.map);

  return {
    ...baseState,
    _blocked: false,
    _snapEngine: snapEngine,
    _alignmentEngine: alignmentEngine,
    _snapOverlay: snapOverlay,
    _guideOverlay: guideOverlay,
    _snapOptions: resolved,
    _lastSnap: null as any,
  };
};

SnapPolygonMode.onMouseMove = function (state: any, e: any) {
  if (state._blocked) {
    DrawPolygon.onMouseMove.call(this, state, e);
    return;
  }

  const cursor: Position = [e.lngLat.lng, e.lngLat.lat];

  // 1. Snap to map features
  const snapResult = state._snapEngine.snap(cursor, state.polygon?.id);

  // 2. Compute alignment guides from existing polygon vertices
  const existingVertices = getPolygonVertices(state);
  const guides = state._alignmentEngine.getGuides(existingVertices, cursor);

  // 3. If no feature snap, try guide snap
  if (snapResult.type === null && guides.length > 0) {
    const guideSnap = state._alignmentEngine.snapToGuide(cursor, guides);
    if (guideSnap) {
      snapResult.type = "guide";
      snapResult.coord = guideSnap;
    }
  }

  // 4. Update overlays
  state._snapOverlay.update(snapResult);
  state._guideOverlay.update(guides);
  state._lastSnap = snapResult;

  // 5. Delegate to base mode
  DrawPolygon.onMouseMove.call(this, state, e);
};

SnapPolygonMode.onClick = function (state: any, e: any) {
  if (state._blocked || !_vp()) return;

  if (state._lastSnap && state._lastSnap.type !== null) {
    e = patchEvent(e, state._lastSnap.coord);
  }
  state._guideOverlay.hide();
  DrawPolygon.onClick.call(this, state, e);
};

SnapPolygonMode.onTap = function (state: any, e: any) {
  if (state._blocked || !_vp()) return;

  if (state._lastSnap && state._lastSnap.type !== null) {
    e = patchEvent(e, state._lastSnap.coord);
  }
  state._guideOverlay.hide();
  DrawPolygon.onTap.call(this, state, e);
};

SnapPolygonMode.onStop = function (state: any) {
  if (state._snapEngine) state._snapEngine.destroy();
  if (state._snapOverlay) state._snapOverlay.destroy();
  if (state._guideOverlay) state._guideOverlay.destroy();
  DrawPolygon.onStop.call(this, state);
};

SnapPolygonMode.onKeyUp = function (state: any, e: any) {
  if (DrawPolygon.onKeyUp) {
    DrawPolygon.onKeyUp.call(this, state, e);
  }
};

/**
 * Extract existing vertices from the polygon being drawn.
 */
function getPolygonVertices(state: any): Position[] {
  try {
    const coords = state.polygon?.getCoordinates?.();
    if (!coords || !coords[0] || coords[0].length === 0) return [];
    const ring = coords[0];
    // Exclude last 2: the live cursor vertex + the closing vertex
    return ring.slice(0, Math.max(0, ring.length - 2));
  } catch {
    return [];
  }
}

export { SnapPolygonMode };
