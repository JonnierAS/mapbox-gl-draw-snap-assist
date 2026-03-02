import MapboxDraw from '@mapbox/mapbox-gl-draw'
import type { Position } from 'geojson'
import { SnapEngine } from '../core/SnapEngine'
import { AlignmentEngine } from '../core/AlignmentEngine'
import { SnapOverlay } from '../overlays/SnapOverlay'
import { GuideOverlay } from '../overlays/GuideOverlay'
import { patchEvent } from '../core/CoordUtils'
import { resolveOptions } from './helpers'
import type { SnapAssistOptions } from '../types'

const DrawLineString = MapboxDraw.modes.draw_line_string

/**
 * SnapLineMode — decorates draw_line_string with snap and alignment guides.
 */
const SnapLineMode: any = Object.assign({}, DrawLineString)

SnapLineMode.onSetup = function (opts: SnapAssistOptions) {
  const baseState = DrawLineString.onSetup.call(this, opts)
  const resolved = resolveOptions(opts)

  const snapEngine = new SnapEngine(this.map, this._ctx?.api, resolved)
  const alignmentEngine = new AlignmentEngine(this.map, resolved)
  const snapOverlay = new SnapOverlay(this.map)
  const guideOverlay = new GuideOverlay(this.map)

  return {
    ...baseState,
    _snapEngine: snapEngine,
    _alignmentEngine: alignmentEngine,
    _snapOverlay: snapOverlay,
    _guideOverlay: guideOverlay,
    _snapOptions: resolved,
    _lastSnap: null as any,
  }
}

SnapLineMode.onMouseMove = function (state: any, e: any) {
  const cursor: Position = [e.lngLat.lng, e.lngLat.lat]

  // 1. Snap to map features
  const snapResult = state._snapEngine.snap(cursor, state.line?.id)

  // 2. Compute alignment guides from existing line vertices
  const existingVertices = getLineVertices(state)
  const guides = state._alignmentEngine.getGuides(existingVertices, cursor)

  // 3. If no feature snap, try guide snap
  let finalCoord = cursor
  if (snapResult.type !== null) {
    finalCoord = snapResult.coord
  } else if (guides.length > 0) {
    const guideSnap = state._alignmentEngine.snapToGuide(cursor, guides)
    if (guideSnap) {
      finalCoord = guideSnap
      snapResult.type = 'guide'
      snapResult.coord = guideSnap
    }
  }

  // 4. Update overlays
  state._snapOverlay.update(snapResult)
  state._guideOverlay.update(guides)
  state._lastSnap = snapResult

  // 5. Delegate to base mode with original event (visual only, no coord injection)
  DrawLineString.onMouseMove.call(this, state, e)
}

SnapLineMode.onClick = function (state: any, e: any) {
  // If there's an active snap, inject the snapped coordinate
  if (state._lastSnap && state._lastSnap.type !== null) {
    e = patchEvent(e, state._lastSnap.coord)
  }

  // After clicking, clear guides for a clean state
  state._guideOverlay.hide()

  DrawLineString.onClick.call(this, state, e)
}

SnapLineMode.onTap = function (state: any, e: any) {
  if (state._lastSnap && state._lastSnap.type !== null) {
    e = patchEvent(e, state._lastSnap.coord)
  }
  state._guideOverlay.hide()
  DrawLineString.onTap.call(this, state, e)
}

SnapLineMode.onStop = function (state: any) {
  // Cleanup snap resources
  if (state._snapEngine) state._snapEngine.destroy()
  if (state._snapOverlay) state._snapOverlay.destroy()
  if (state._guideOverlay) state._guideOverlay.destroy()

  DrawLineString.onStop.call(this, state)
}

SnapLineMode.onKeyUp = function (state: any, e: any) {
  if (DrawLineString.onKeyUp) {
    DrawLineString.onKeyUp.call(this, state, e)
  }
}

/**
 * Extract existing vertices from the line being drawn.
 */
function getLineVertices(state: any): Position[] {
  try {
    const coords = state.line?.getCoordinates?.()
    if (!coords || coords.length === 0) return []
    // Last coordinate is the "live" vertex following the cursor; exclude it
    return coords.slice(0, -1)
  } catch {
    return []
  }
}

export { SnapLineMode }
