declare module "@mapbox/mapbox-gl-draw" {
  const MapboxDraw: {
    modes: Record<string, any>;
    new (options?: any): any;
  };
  export default MapboxDraw;
}
