import type { Position } from 'geojson'

/**
 * Coerce a Position (which may have altitude or extra elements)
 * into a strict [lng, lat] tuple that map.project() accepts.
 */
function toLngLat(coord: Position): [number, number] {
  return [coord[0], coord[1]]
}

/**
 * Returns true if the coordinate is a valid [number, number, ...].
 */
export function isValidCoord(coord: any): coord is Position {
  return (
    Array.isArray(coord) &&
    coord.length >= 2 &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1])
  )
}

/**
 * Calculate pixel distance between two lng/lat coordinates using map.project().
 */
export function pixelDistance(
  map: any,
  a: Position,
  b: Position,
): number {
  const pa = map.project(toLngLat(a))
  const pb = map.project(toLngLat(b))
  const dx = pa.x - pb.x
  const dy = pa.y - pb.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Build a pixel bounding box around a cursor point for queryRenderedFeatures.
 * Returns [[x1, y1], [x2, y2]] in screen coordinates.
 */
export function bboxFromCursor(
  map: any,
  cursor: Position,
  radiusPx: number,
): [[number, number], [number, number]] {
  const p = map.project(toLngLat(cursor))
  return [
    [p.x - radiusPx, p.y - radiusPx],
    [p.x + radiusPx, p.y + radiusPx],
  ]
}

/**
 * Patch a mapbox-gl-draw event's lngLat with snapped coordinates.
 * Returns a new event-like object (does NOT mutate the original).
 */
export function patchEvent(
  e: any,
  snappedCoord: Position,
): any {
  return Object.assign({}, e, {
    lngLat: { lng: snappedCoord[0], lat: snappedCoord[1] },
  })
}

/**
 * Extract all vertex positions from a GeoJSON feature geometry.
 * Handles Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon.
 */
export function extractVertices(geometry: any): Position[] {
  if (!geometry || !geometry.type) return []

  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates as Position]
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates as Position[]
    case 'MultiLineString':
    case 'Polygon':
      return (geometry.coordinates as Position[][]).flat()
    case 'MultiPolygon':
      return (geometry.coordinates as Position[][][]).flat(2)
    default:
      return []
  }
}

/**
 * Extract all edge segments [A, B] from a GeoJSON geometry.
 */
export function extractSegments(geometry: any): [Position, Position][] {
  if (!geometry || !geometry.type) return []

  const segments: [Position, Position][] = []

  const addSegmentsFromRing = (ring: Position[]) => {
    for (let i = 0; i < ring.length - 1; i++) {
      segments.push([ring[i], ring[i + 1]])
    }
  }

  switch (geometry.type) {
    case 'LineString':
      addSegmentsFromRing(geometry.coordinates)
      break
    case 'MultiLineString':
      for (const line of geometry.coordinates) {
        addSegmentsFromRing(line)
      }
      break
    case 'Polygon':
      for (const ring of geometry.coordinates) {
        addSegmentsFromRing(ring)
      }
      break
    case 'MultiPolygon':
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) {
          addSegmentsFromRing(ring)
        }
      }
      break
  }

  return segments
}
