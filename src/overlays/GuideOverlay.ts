import type { Feature, Point } from 'geojson'
import type { AlignmentGuide } from '../types'

const GUIDE_SOURCE_ID = '__snap-assist-guide-source'
const GUIDE_LINE_LAYER_ID = '__snap-assist-guide-layer'
const GUIDE_VERTEX_LAYER_ID = '__snap-assist-guide-vertex-layer'

const GUIDE_COLORS: Record<string, string> = {
  horizontal: '#06b6d4',
  vertical: '#d946ef',
  diagonal: '#f59e0b',
}

/**
 * Manages alignment guide lines (short segments from vertex to cursor projection)
 * with colored vertex indicators at the reference point.
 */
export class GuideOverlay {
  private map: any
  private added = false

  constructor(map: any) {
    this.map = map
  }

  private ensureAdded(): void {
    if (this.added) return

    if (this.map.getSource(GUIDE_SOURCE_ID)) {
      if (this.map.getLayer(GUIDE_VERTEX_LAYER_ID)) {
        this.map.removeLayer(GUIDE_VERTEX_LAYER_ID)
      }
      if (this.map.getLayer(GUIDE_LINE_LAYER_ID)) {
        this.map.removeLayer(GUIDE_LINE_LAYER_ID)
      }
      this.map.removeSource(GUIDE_SOURCE_ID)
    }

    this.map.addSource(GUIDE_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })

    // Line layer: short dashed segments with data-driven color
    this.map.addLayer({
      id: GUIDE_LINE_LAYER_ID,
      type: 'line',
      source: GUIDE_SOURCE_ID,
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': [
          'match',
          ['get', 'guideType'],
          'horizontal', GUIDE_COLORS.horizontal,
          'vertical', GUIDE_COLORS.vertical,
          'diagonal', GUIDE_COLORS.diagonal,
          GUIDE_COLORS.diagonal, // fallback
        ],
        'line-width': 1.5,
        'line-dasharray': [6, 3],
        'line-opacity': 0.85,
      },
    })

    // Circle layer: vertex reference indicator
    this.map.addLayer({
      id: GUIDE_VERTEX_LAYER_ID,
      type: 'circle',
      source: GUIDE_SOURCE_ID,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 4,
        'circle-color': [
          'match',
          ['get', 'guideType'],
          'horizontal', GUIDE_COLORS.horizontal,
          'vertical', GUIDE_COLORS.vertical,
          'diagonal', GUIDE_COLORS.diagonal,
          GUIDE_COLORS.diagonal,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
        'circle-opacity': 0.9,
      },
    })

    this.added = true
  }

  /**
   * Update the guide lines and vertex indicators.
   */
  update(guides: AlignmentGuide[]): void {
    if (guides.length === 0) {
      this.hide()
      return
    }

    this.ensureAdded()

    // Build features: line segments + vertex indicator points
    const features: Feature[] = []

    // Deduplicate vertex indicators by coordinate + guideType
    const seenVertices = new Set<string>()

    for (const g of guides) {
      // Line segment
      features.push(g.line)

      // Vertex indicator point (deduplicated)
      const key = `${g.referenceVertex[0]},${g.referenceVertex[1]},${g.type}`
      if (!seenVertices.has(key)) {
        seenVertices.add(key)
        const vertexPoint: Feature<Point> = {
          type: 'Feature',
          properties: { guideType: g.type },
          geometry: {
            type: 'Point',
            coordinates: [g.referenceVertex[0], g.referenceVertex[1]],
          },
        }
        features.push(vertexPoint)
      }
    }

    const data = {
      type: 'FeatureCollection' as const,
      features,
    }

    const source = this.map.getSource(GUIDE_SOURCE_ID)
    if (source) {
      source.setData(data)
    }
  }

  /**
   * Hide all guide lines.
   */
  hide(): void {
    if (!this.added) return
    const source = this.map.getSource(GUIDE_SOURCE_ID)
    if (source) {
      source.setData({ type: 'FeatureCollection', features: [] })
    }
  }

  /**
   * Remove source and layer from the map.
   */
  destroy(): void {
    if (!this.added) return
    try {
      if (this.map.getLayer(GUIDE_VERTEX_LAYER_ID)) {
        this.map.removeLayer(GUIDE_VERTEX_LAYER_ID)
      }
      if (this.map.getLayer(GUIDE_LINE_LAYER_ID)) {
        this.map.removeLayer(GUIDE_LINE_LAYER_ID)
      }
      if (this.map.getSource(GUIDE_SOURCE_ID)) {
        this.map.removeSource(GUIDE_SOURCE_ID)
      }
    } catch {
      // Map might already be destroyed
    }
    this.added = false
  }
}
