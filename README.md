# maplibre-elevation-control

[![NPM](https://img.shields.io/npm/v/@maptoolkit/maplibre-elevation-control?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837&color=555)](https://www.npmjs.com/package/@maptoolkit/maplibre-elevation-control)
[![License](https://img.shields.io/npm/l/@maptoolkit/maplibre-elevation-control?style=for-the-badge)](https://github.com/maptoolkit/maplibre-elevation-control/blob/HEAD/LICENSE)
[![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/maptoolkit/maplibre-elevation-control)

A [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) control plugin that shows an elevation profile for 3D GeoJSON lines, based on [@maptoolkit/elevation-profile](https://github.com/maptoolkit/elevation-profile).

**[Live demo](https://maptoolkit.github.io/maplibre-elevation-control/)**

## Install

```bash
npm install @maptoolkit/maplibre-elevation-control maplibre-gl
```

Built and tested against `maplibre-gl` v6.

## Usage

```js
import * as maplibregl from "maplibre-gl";
import { ElevationControl } from "@maptoolkit/maplibre-elevation-control";
import "@maptoolkit/maplibre-elevation-control/style.css";

const map = new maplibregl.Map({ container: "map", style, center, zoom });
map.addControl(new ElevationControl(feature));
```

The first argument is the route as a GeoJSON `Feature` with a `LineString` or `MultiLineString` geometry, where every coordinate has an elevation in meters: `[lng, lat, ele]`. Optional `properties.length` and `properties.sections` (section bars, e.g. surface or road type) work as described in [elevation-profile's input data](https://github.com/maptoolkit/elevation-profile#input-data). The stylesheet includes the styles of `@maptoolkit/elevation-profile`, so there is no need to import them separately.

The control shows the interactive profile with hover and drag selection. Click its close button to shrink it to a small, non-interactive preview, and click the preview (or press Enter/Space while it is focused) to open it again.

If the route is loaded asynchronously, create the control once it is there:

```js
const response = await fetch("route.geojson");
map.addControl(new ElevationControl(await response.json()));
```

By default the control is placed in the bottom-right corner; pass a position to `addControl` to change that:

```js
map.addControl(new ElevationControl(feature), "bottom-left");
```

### Without a bundler

The package is ESM-only (no UMD/CJS build). Loading it straight from a CDN via
a `<script>` tag works with an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
to resolve the bare `maplibre-gl` specifier:

```html
<link href="https://unpkg.com/maplibre-gl@^6.0.0/dist/maplibre-gl.css" rel="stylesheet" />
<link href="https://unpkg.com/@maptoolkit/maplibre-elevation-control@^1.0.0/dist/maplibre-elevation-control.css" rel="stylesheet" />

<script type="importmap">
  {
    "imports": {
      "maplibre-gl": "https://unpkg.com/maplibre-gl@^6.0.0/dist/maplibre-gl.mjs"
    }
  }
</script>
<script type="module">
  import * as maplibregl from "maplibre-gl";
  import { ElevationControl } from "https://unpkg.com/@maptoolkit/maplibre-elevation-control@^1.0.0/dist/maplibre-elevation-control.js";

  const map = new maplibregl.Map({ container: "map", style, center, zoom });
  map.addControl(new ElevationControl(feature));
</script>
```

## Options

```js
new ElevationControl(feature, {
  open: false,
  units: "imperial",
});
```

| Option     | Type                                   | Default    | Description                                                                                                            |
| ---------- | -------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `open`     | `boolean`                              | `true`     | Whether the control starts open. With `false`, it starts as the small preview.                                         |
| `units`    | `"metric"` \| `"imperial"`             | `"metric"` | Passed to the profile. With `"imperial"`, all lengths in events are in feet instead of meters.                         |
| `locale`   | `Record<string, string>`               | —          | Passed to the profile: hover badge labels for section values, see [elevation-profile's options][ep-opt].               |
| `width`    | `number`                               | `900`      | Passed to the profile: width of the SVG viewBox. Font sizes and margins are in these units.                            |
| `height`   | `number`                               | `300`      | Passed to the profile: height of the SVG viewBox. With `width`, it sets the aspect ratio.                              |
| `layers`   | `boolean` \| `ElevationControlLayer[]` | `true`     | Draw the route, the selection and the hover point on the map, see [Map layers](#map-layers).                           |
| `beforeId` | `string`                               | —          | Id of an existing layer to insert the layers before. Without it, or if the layer doesn't exist, they are added on top. |

[ep-opt]: https://github.com/maptoolkit/elevation-profile#options

### Map layers

By default the control adds a GeoJSON source to the map and draws the route, the selected stretch and the hover point on it. The source has one feature per `role` property:

| `role`        | Geometry                                                 | Present...                                    |
| ------------- | -------------------------------------------------------- | --------------------------------------------- |
| `"line"`      | The route, as passed to the control.                     | always.                                       |
| `"selection"` | The selected stretch, `LineString` or `MultiLineString`. | while there is a selection, also when closed. |
| `"hover"`     | The hover point, `Point`.                                | while the mouse is over the open profile.     |

Pass `layers: false` to draw nothing, e.g. if you only use the events. Pass an array of layers without `source` to replace the default layers; the control adds its source to each of them and filters are up to you:

```js
new ElevationControl(feature, {
  layers: [
    {
      id: "route-selection",
      type: "line",
      filter: ["==", ["get", "role"], "selection"],
      paint: { "line-color": "#0074d9", "line-width": 6 },
    },
  ],
});
```

Custom layer ids are used as given, so they must be unique on the map. The source and layers are added again after `map.setStyle()` and removed with the control.

### Localization

The labels of the open and close buttons (tooltip and `aria-label`) are read from the map's `locale`, like the built-in MapLibre controls:

```js
const map = new maplibregl.Map({
  container: "map",
  style,
  center,
  zoom,
  locale: {
    "ElevationControl.Open": "Open elevation profile",
    "ElevationControl.Close": "Close elevation profile",
  },
});
```

| Key                      | Default                     |
| ------------------------ | --------------------------- |
| `ElevationControl.Open`  | `"Open elevation profile"`  |
| `ElevationControl.Close` | `"Close elevation profile"` |

## Events

The control extends MapLibre's `Evented`, so you can subscribe like you would on the map itself:

```js
const control = new ElevationControl(feature);
const marker = new maplibregl.Marker();

control.on("hover", (e) => {
  const [lng, lat] = e.geometry.coordinates;
  marker.setLngLat([lng, lat]).addTo(map);
});
control.on("hoverend", () => marker.remove());
control.on("selectionend", (e) => console.log(e.start, e.end, e.ascent, e.descent));
control.on("close", () => marker.remove());
```

| Event            | Payload                                                      | Fired when...                                                                           |
| ---------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `hover`          | `{ distance, elevation, geometry, sections, originalEvent }` | the mouse moves over the profile, while there is no selection.                          |
| `hoverend`       | `{ originalEvent }`                                          | the mouse leaves the profile or a drag starts, once per hover.                          |
| `click`          | `{ distance, elevation, geometry, sections, originalEvent }` | the profile is clicked without drag, while there is no selection.                       |
| `selection`      | `{ start, end, ascent, descent, geometry, originalEvent }`   | a selection is being dragged.                                                           |
| `selectionend`   | `{ start, end, ascent, descent, geometry, originalEvent }`   | a drag selection ends.                                                                  |
| `selectionclear` | `{ originalEvent }`                                          | the profile is clicked without drag while a selection exists. No `click` is fired then. |
| `open`           | —                                                            | the control is opened, by click or `open()`.                                            |
| `close`          | —                                                            | the control is closed, by click or `close()`.                                           |

The profile events are the ones of `@maptoolkit/elevation-profile`, with the control as `target`; see [its events](https://github.com/maptoolkit/elevation-profile#events) for details on the payload. `geometry` is the hover point or the selected stretch as GeoJSON with `[lng, lat, ele]` coordinates (`ele` in meters, also with `units: "imperial"`), interpolated on the route. `open` and `close` are only fired when the state changes, not for the initial state.

## Methods

```js
const control = new ElevationControl(feature).close();
map.addControl(control);

control.open();
control.isOpen(); // true
```

| Method     | Description                                                                          |
| ---------- | ------------------------------------------------------------------------------------ |
| `open()`   | Opens the interactive profile, same as clicking the preview. Fires `open`.           |
| `close()`  | Closes the control to the preview, same as clicking the close button. Fires `close`. |
| `isOpen()` | Returns whether the control is open.                                                 |

`open()` and `close()` return the control, so calls can be chained. Both can be called before the control is added to a map.

## Styling

The control's styles are in `style.css`, scoped under `.maplibre-elevation-control`:

| Class                                  | Element                                    |
| -------------------------------------- | ------------------------------------------ |
| `maplibre-elevation-control`           | The control container.                     |
| `maplibre-elevation-control-collapsed` | Added to the container while it is closed. |
| `maplibre-elevation-control-close`     | The close button.                          |
| `maplibre-elevation-control-profile`   | The element the profile is rendered into.  |

Appearance is controlled via CSS custom properties on `.maplibre-elevation-control`, defined in `style.css`. Override them in your own stylesheet to theme the control:

```css
.maplibre-elevation-control {
  --elevation-control-bg-color: #ffffff;
  --elevation-control-width: 600px;
}
```

See `src/style.css` for the full list of `--elevation-control-*` variables.

The profile itself is styled via the classes and custom properties of `@maptoolkit/elevation-profile`, see [its styling section](https://github.com/maptoolkit/elevation-profile#styling). Scope overrides under `.maplibre-elevation-control` so they win over the control's own styles:

```css
.maplibre-elevation-control .maptoolkit-elevation-profile {
  --maptoolkit-elevation-profile-accent: #0074d9;
}
```

Opening and closing is animated with CSS transitions; they are turned off with `prefers-reduced-motion: reduce`.

## License

**maplibre-elevation-control** is open-source under the [BSD 3-Clause License](https://github.com/maptoolkit/maplibre-elevation-control/blob/HEAD/LICENSE).
