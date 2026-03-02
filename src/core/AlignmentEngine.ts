import type { Position } from 'geojson'
import bearing from '@turf/bearing'
import { point } from '@turf/helpers'
import type { AlignmentGuide, ResolvedSnapOptions } from '../types'
import { pixelDistance } from './CoordUtils'

/**
 * Detects horizontal, vertical, and diagonal alignment between cursor
 * and existing vertices in the feature being drawn.
 */
export class AlignmentEngine {
  private map: any
  private options: ResolvedSnapOptions

  constructor(map: any, options: ResolvedSnapOptions) {
    this.map = map
    this.options = options
  }

  /**
   * Generate alignment guides based on existing vertices and cursor position.
   * @param existingVertices Vertices already placed in the current feature
   * @param cursor Current cursor position [lng, lat]
   */
  getGuides(existingVertices: Position[], cursor: Position): AlignmentGuide[] {
    if (!this.options.showAlignmentGuides || existingVertices.length === 0) {
      return []
    }

    const guides: AlignmentGuide[] = []
    const tolerance = this.options.alignTolerance

    for (const vertex of existingVertices) {
      // Horizontal guide: cursor lat close to vertex lat
      const latDiffPx = this.latDiffInPixels(cursor, vertex)
      if (latDiffPx < tolerance) {
        guides.push({
          line: {
            type: 'Feature',
            properties: { guideType: 'horizontal' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [vertex[0], vertex[1]],
                [cursor[0], vertex[1]],
              ],
            },
          },
          type: 'horizontal',
          referenceVertex: vertex,
          angle: 0,
        })
      }

      // Vertical guide: cursor lng close to vertex lng
      const lngDiffPx = this.lngDiffInPixels(cursor, vertex)
      if (lngDiffPx < tolerance) {
        guides.push({
          line: {
            type: 'Feature',
            properties: { guideType: 'vertical' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [vertex[0], vertex[1]],
                [vertex[0], cursor[1]],
              ],
            },
          },
          type: 'vertical',
          referenceVertex: vertex,
          angle: 90,
        })
      }

      // Diagonal guides
      if (this.options.alignAngles.length > 0) {
        const diagonalGuides = this.getDiagonalGuides(vertex, cursor)
        guides.push(...diagonalGuides)
      }
    }

    return guides
  }

  /**
   * If snapToGuides is enabled, compute the snapped coordinate
   * on the nearest guide line.
   */
  snapToGuide(cursor: Position, guides: AlignmentGuide[]): Position | null {
    if (!this.options.snapToGuides || guides.length === 0) return null

    // For H guides, snap lat; for V guides, snap lng; for diagonal, project
    let bestDist = Infinity
    let bestCoord: Position | null = null

    for (const guide of guides) {
      let snapped: Position

      if (guide.type === 'horizontal') {
        snapped = [cursor[0], guide.referenceVertex[1]]
      } else if (guide.type === 'vertical') {
        snapped = [guide.referenceVertex[0], cursor[1]]
      } else {
        // Diagonal: project cursor onto the guide line
        snapped = this.projectOntoAngle(
          guide.referenceVertex,
          cursor,
          guide.angle,
        )
      }

      const dist = pixelDistance(this.map, snapped, cursor)
      if (dist < bestDist) {
        bestDist = dist
        bestCoord = snapped
      }
    }

    // Check intersections of multiple guides
    if (guides.length >= 2) {
      const intersections = this.findGuideIntersections(guides, cursor)
      for (const inter of intersections) {
        const dist = pixelDistance(this.map, inter, cursor)
        if (dist < bestDist) {
          bestDist = dist
          bestCoord = inter
        }
      }
    }

    return bestCoord
  }

  private getDiagonalGuides(
    vertex: Position,
    cursor: Position,
  ): AlignmentGuide[] {
    const guides: AlignmentGuide[] = []
    const diagonalAngles = this.options.alignAngles.filter(
      (a) => a !== 0 && a !== 90 && a !== 180 && a !== 270,
    )

    if (diagonalAngles.length === 0) return guides

    const p1 = point(vertex)
    const p2 = point(cursor)
    const cursorBearing = bearing(p1, p2)
    // Normalize to 0-360
    const normalizedBearing = ((cursorBearing % 360) + 360) % 360

    const toleranceDeg = 5

    for (const angle of diagonalAngles) {
      const diff = Math.abs(normalizedBearing - angle)
      const wrappedDiff = Math.min(diff, 360 - diff)

      if (wrappedDiff < toleranceDeg) {
        const projected = this.projectOntoAngle(vertex, cursor, angle)
        guides.push({
          line: {
            type: 'Feature',
            properties: { guideType: 'diagonal' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [vertex[0], vertex[1]],
                projected,
              ],
            },
          },
          type: 'diagonal',
          referenceVertex: vertex,
          angle,
        })
      }
    }

    return guides
  }

  private projectOntoAngle(
    vertex: Position,
    cursor: Position,
    angleDeg: number,
  ): Position {
    const rad = (angleDeg * Math.PI) / 180
    const dx = cursor[0] - vertex[0]
    const dy = cursor[1] - vertex[1]
    const dirX = Math.sin(rad)
    const dirY = Math.cos(rad)
    const dot = dx * dirX + dy * dirY
    return [vertex[0] + dirX * dot, vertex[1] + dirY * dot]
  }

  private findGuideIntersections(
    guides: AlignmentGuide[],
    cursor: Position,
  ): Position[] {
    const intersections: Position[] = []

    for (let i = 0; i < guides.length; i++) {
      for (let j = i + 1; j < guides.length; j++) {
        const a = guides[i]
        const b = guides[j]

        // H + V intersection
        if (a.type === 'horizontal' && b.type === 'vertical') {
          intersections.push([b.referenceVertex[0], a.referenceVertex[1]])
        } else if (a.type === 'vertical' && b.type === 'horizontal') {
          intersections.push([a.referenceVertex[0], b.referenceVertex[1]])
        }
      }
    }

    return intersections
  }

  private latDiffInPixels(a: Position, b: Position): number {
    const pa = this.map.project([a[0], a[1]])
    const pb = this.map.project([a[0], b[1]]) // same lng, different lat
    return Math.abs(pa.y - pb.y)
  }

  private lngDiffInPixels(a: Position, b: Position): number {
    const pa = this.map.project([a[0], a[1]])
    const pb = this.map.project([b[0], a[1]]) // different lng, same lat
    return Math.abs(pa.x - pb.x)
  }
}
