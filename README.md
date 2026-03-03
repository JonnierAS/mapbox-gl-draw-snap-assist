# @geosolution-apps/mapbox-gl-draw-snap-assist

Snap a vertices, snap a bordes, guias de alineacion y eliminacion de vertices para [@mapbox/mapbox-gl-draw](https://github.com/mapbox/mapbox-gl-draw). Compatible con [MapLibre GL JS](https://maplibre.org/).

## Caracteristicas

- **Snap a vertice** — el cursor se ajusta a vertices cercanos de features existentes en el mapa (indicador rojo)
- **Snap a borde** — el cursor se ajusta al punto mas cercano en un borde de linea/poligono (indicador azul)
- **Guias de alineacion** — lineas visuales que muestran alineacion horizontal, vertical y diagonal con vertices ya colocados
- **Snap a guias** — el cursor puede ajustarse a las lineas guia y sus intersecciones
- **Eliminacion de vertices** — Shift+Click para eliminar vertices en modo direct select
- **Fuentes de features personalizadas** — sobreescribe como se obtienen los candidatos de snap

## Instalacion

```bash
npm install @geosolution-apps/mapbox-gl-draw-snap-assist
```

### Dependencias peer

Deben estar instaladas en tu proyecto:

```bash
npm install @mapbox/mapbox-gl-draw maplibre-gl
```

### Desarrollo local (desde el codigo fuente)

Si trabajas directamente con el codigo fuente:

```bash
cd mapbox-gl-draw-snap-assist

# Instalar dependencias
npm install

# Compilar (genera dist/)
npm run build

# Modo watch (recompila al detectar cambios)
npm run dev
```

La compilacion genera los archivos en `dist/`:

- `dist/index.js` — Modulo ESM
- `dist/index.cjs` — Modulo CommonJS
- `dist/index.d.ts` — Declaraciones TypeScript

### Vincular a un proyecto local

Si la libreria esta como carpeta hermana o submodulo:

```bash
# En el package.json del proyecto que consume, agregar:
"dependencies": {
  "@geosolution-apps/mapbox-gl-draw-snap-assist": "file:../mapbox-gl-draw-snap-assist"
}

# Luego instalar
npm install
```

> **Importante:** Despues de hacer cambios en el codigo fuente de la libreria, debes ejecutar `npm run build` para que el proyecto consumidor tome los cambios (lee de `dist/`, no de `src/`).

## Inicio rapido

```js
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import {
  SnapLineMode,
  SnapPolygonMode,
  SnapDirectSelect,
} from "@geosolution-apps/mapbox-gl-draw-snap-assist";

// 1. Registrar los modos en MapboxDraw
const draw = new MapboxDraw({
  modes: {
    ...MapboxDraw.modes,
    snap_line: SnapLineMode,
    snap_polygon: SnapPolygonMode,
    snap_direct: SnapDirectSelect,
  },
});

// 2. Agregar el control de dibujo al mapa
map.addControl(draw);

// 3. Activar un modo snap con opciones
draw.changeMode("snap_line", {
  snapPx: 12,
  showAlignmentGuides: true,
  snapToGuides: true,
});
```

## Modos exportados

| Modo               | Reemplaza a        | Descripcion                                                |
| ------------------ | ------------------ | ---------------------------------------------------------- |
| `SnapLineMode`     | `draw_line_string` | Dibujo de lineas con snap + guias de alineacion            |
| `SnapPolygonMode`  | `draw_polygon`     | Dibujo de poligonos con snap + guias de alineacion         |
| `SnapDirectSelect` | `direct_select`    | Edicion de vertices con snap + eliminacion con Shift+Click |

### Registro de modos

Puedes **reemplazar** los modos nativos o agregarlos como modos **adicionales**:

```js
// Opcion A: Reemplazar los modos nativos (todo el dibujo usa snap)
const draw = new MapboxDraw({
  modes: {
    ...MapboxDraw.modes,
    draw_line_string: SnapLineMode,
    draw_polygon: SnapPolygonMode,
    direct_select: SnapDirectSelect,
  },
});

// Opcion B: Agregar como modos separados (conservar los originales)
const draw = new MapboxDraw({
  modes: {
    ...MapboxDraw.modes,
    snap_line: SnapLineMode,
    snap_polygon: SnapPolygonMode,
    snap_direct: SnapDirectSelect,
  },
});
```

## Opciones (`SnapAssistOptions`)

Las opciones se pasan como segundo argumento de `draw.changeMode()`:

```js
draw.changeMode("snap_line", {
  // Todas las opciones listadas abajo
});
```

| Opcion                | Tipo       | Default                                     | Descripcion                                                                                                                                          |
| --------------------- | ---------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `snapPx`              | `number`   | `10`                                        | Radio de snap en pixeles de pantalla. Las features dentro de esta distancia del cursor se consideran candidatas.                                     |
| `snapToDrawFeatures`  | `boolean`  | `true`                                      | Incluir features ya dibujadas en el canvas de draw como candidatas de snap. La feature que se esta dibujando actualmente se excluye automaticamente. |
| `showAlignmentGuides` | `boolean`  | `false`                                     | Mostrar lineas guia de alineacion entre los vertices colocados y el cursor.                                                                          |
| `snapToGuides`        | `boolean`  | `false`                                     | Ajustar el cursor a las lineas guia y sus intersecciones. Requiere `showAlignmentGuides: true` para funcionar.                                       |
| `alignTolerance`      | `number`   | `8`                                         | Tolerancia en pixeles para activar las guias de alineacion. Menor = las guias aparecen solo cuando estas muy cerca de la alineacion.                 |
| `alignAngles`         | `number[]` | `[0, 45, 90, 135,`<br>`180, 225, 270, 315]` | Angulos (grados, sentido horario desde el norte) en los que se detecta alineacion. `0`/`180` = horizontal, `90`/`270` = vertical, otros = diagonal.  |
| `layerIds`            | `string[]` | `undefined`                                 | Lista blanca de IDs de capas MapLibre para buscar candidatos de snap. Si se omite, se consultan todas las capas renderizadas.                        |
| `sourceIds`           | `string[]` | `undefined`                                 | Lista blanca de IDs de source. Los features se filtran por coincidencia parcial (ej: `'CABLE'` coincide con el source `'MV_TRAMO_DE_CABLE'`).        |
| `snapGetFeatures`     | `function` | `undefined`                                 | Funcion personalizada para sobreescribir la obtencion de features. Ver [Fuentes personalizadas](#fuentes-de-features-personalizadas).                |

## Guias de alineacion

Cuando `showAlignmentGuides: true`, la libreria dibuja segmentos cortos punteados desde un vertice de referencia hasta la proyeccion del cursor sobre ese eje de alineacion.

### Colores de las guias

| Alineacion | Color             | Angulos               |
| ---------- | ----------------- | --------------------- |
| Horizontal | Cyan `#06b6d4`    | 0°, 180°              |
| Vertical   | Magenta `#d946ef` | 90°, 270°             |
| Diagonal   | Gold `#f59e0b`    | 45°, 135°, 225°, 315° |

Cada guia tambien muestra un pequeno circulo del mismo color en el vertice de referencia, para indicar cual vertice esta generando la guia.

### Como funcionan

1. Colocas uno o mas vertices
2. Al mover el cursor, el engine verifica si el cursor esta alineado (dentro de `alignTolerance` pixeles) con algun vertice ya colocado
3. Si esta alineado, se dibuja un segmento corto punteado desde ese vertice hasta la proyeccion del cursor en el eje de alineacion
4. Si `snapToGuides: true`, el cursor se ajusta a la linea guia mas cercana. Cuando dos guias se cruzan (ej: horizontal desde vertice A + vertical desde vertice B), el cursor se ajusta al punto de interseccion

### Desactivar guias diagonales

Pasar solo angulos cardinales:

```js
draw.changeMode("snap_line", {
  showAlignmentGuides: true,
  alignAngles: [0, 90, 180, 270],
});
```

## Comportamiento del snap

### Prioridad

1. **Snap a vertice** (mayor prioridad) — Si el cursor esta dentro de `snapPx` de un vertice, se ajusta ahi
2. **Snap a borde** — Si no hay vertice cercano pero un borde esta dentro de `snapPx`, se ajusta al punto mas cercano en ese borde
3. **Snap a guia** (menor prioridad) — Si no hubo snap a feature y `snapToGuides: true`, se ajusta a la linea guia o interseccion mas cercana

### Indicadores visuales

- **Circulo rojo** — Snap a vertice
- **Circulo azul** — Snap a borde
- Las lineas guia son solo visuales (segmentos punteados); el circulo indicador de snap aparece por separado

### Que se ajusta

- `onClick` / `onTap`: la coordenada del vertice colocado es la posicion snapeada
- `onMouseMove`: la linea de rubber-band sigue el cursor real (no el snapeado). Esto es intencional — la vista previa usa el cursor real mientras que el punto final colocado usa el snap

## Eliminacion de vertices (SnapDirectSelect)

En el modo `SnapDirectSelect`, **Shift+Click** sobre un vertice lo elimina:

- **LineString**: minimo 2 vertices (no permite eliminar si quedan 2)
- **Polygon**: minimo 3 vertices unicos (no permite eliminar si quedan 3)

La tecla Delete tambien funciona a traves del handler estandar `onTrash` de MapboxDraw.

## Fuentes de features personalizadas

Usa `snapGetFeatures` para controlar completamente que features estan disponibles para snap:

```js
draw.changeMode("snap_line", {
  snapGetFeatures: (map, cursor, snapPx) => {
    // Ejemplo: solo hacer snap a capas especificas
    const point = map.project(cursor);
    return map.queryRenderedFeatures(
      [
        [point.x - snapPx, point.y - snapPx],
        [point.x + snapPx, point.y + snapPx],
      ],
      { layers: ["my-cables-layer", "my-poles-layer"] },
    );
  },
});
```

Cuando se proporciona `snapGetFeatures`:

- `layerIds`, `sourceIds` y `snapToDrawFeatures` se **ignoran**
- El array de `Feature[]` retornado se usa directamente como candidatos de snap
- La funcion recibe `(map, cursor: [lng, lat], snapPx: number)`

## Ejemplos de uso

### Snap basico (sin guias)

```js
draw.changeMode("snap_line", {
  snapPx: 10,
  snapToDrawFeatures: true,
});
```

### Snap a sources especificos con guias

```js
draw.changeMode("snap_line", {
  snapPx: 12,
  sourceIds: ["MV_TRAMO_DE_CABLE", "MV_POSTE"],
  showAlignmentGuides: true,
  snapToGuides: true,
});
```

### Poligono con solo guias H/V

```js
draw.changeMode("snap_polygon", {
  snapPx: 10,
  showAlignmentGuides: true,
  snapToGuides: true,
  alignAngles: [0, 90, 180, 270],
});
```

### Desactivar snap para herramientas de seleccion

```js
draw.changeMode("snap_line", {
  snapPx: 0,
});
```

### Editar vertices con snap

```js
draw.changeMode("snap_direct", {
  featureId: "some-feature-id",
  snapPx: 10,
  sourceIds: ["MV_TRAMO_DE_CABLE"],
});
```

> Nota: `SnapDirectSelect` no soporta guias de alineacion — solo snap a vertices/bordes.

## Limpieza

La limpieza es **automatica**. Cuando `draw.changeMode()` cambia a otro modo, se ejecuta `onStop` internamente y todos los sources/layers del mapa agregados por la libreria se eliminan. No se necesita limpieza manual.

## TypeScript

La libreria incluye declaraciones TypeScript. Importar los tipos:

```ts
import type {
  SnapAssistOptions,
  SnapResult,
} from "@geosolution-apps/mapbox-gl-draw-snap-assist";
```

## Arquitectura

```
src/
  index.ts                      # Exports publicos
  types.ts                      # Interfaces TypeScript
  modes/
    SnapLineMode.ts             # Modo de dibujo de lineas con snap
    SnapPolygonMode.ts          # Modo de dibujo de poligonos con snap
    SnapDirectSelect.ts         # Modo de edicion de vertices con snap + eliminacion
    helpers.ts                  # resolveOptions (merge de defaults)
  core/
    SnapEngine.ts               # Consulta de features + calculo de distancia vertice/borde
    AlignmentEngine.ts          # Deteccion de guias de alineacion + snap a guias
    FeatureCache.ts             # Wrapper de queryRenderedFeatures
    CoordUtils.ts               # Distancia en pixeles, bbox, extraccion de coordenadas
  overlays/
    SnapOverlay.ts              # Circulo indicador en el punto de snap
    GuideOverlay.ts             # Lineas guia punteadas + circulos en vertices
```

## Licencia

MIT
