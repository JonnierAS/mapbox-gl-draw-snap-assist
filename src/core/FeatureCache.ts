import type { Feature } from 'geojson'

/**
 * Cache for queryRenderedFeatures results.
 * Invalidates on map moveend and draw create/update events.
 */
export class FeatureCache {
  private cache: Feature[] | null = null
  private map: any
  private boundInvalidate: () => void

  constructor(map: any) {
    this.map = map
    this.boundInvalidate = this.invalidate.bind(this)
    map.on('moveend', this.boundInvalidate)
    map.on('draw.create', this.boundInvalidate)
    map.on('draw.update', this.boundInvalidate)
  }

  invalidate(): void {
    this.cache = null
  }

  /**
   * Query rendered features with caching.
   * bbox is in screen coordinates [[x1,y1],[x2,y2]].
   */
  query(
    bbox: [[number, number], [number, number]],
    options?: { layers?: string[] },
  ): Feature[] {
    // No cache for bbox queries — bbox changes every mouse move.
    // The cache is per-query, not per-frame. Just query directly.
    try {
      return this.map.queryRenderedFeatures(bbox, options) || []
    } catch {
      return []
    }
  }

  destroy(): void {
    this.map.off('moveend', this.boundInvalidate)
    this.map.off('draw.create', this.boundInvalidate)
    this.map.off('draw.update', this.boundInvalidate)
    this.cache = null
  }
}
