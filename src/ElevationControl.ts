import { Map, IControl, ControlPosition, Evented, Event as MapLibreEvent, GeoJSONSource, LayerSpecification } from "maplibre-gl";
import {
  ElevationProfile,
  ElevationProfileEventMap,
  ElevationProfileEventType,
  ElevationProfileFeature,
  ElevationProfileLineGeometry,
  ElevationProfileOptions,
  ElevationProfilePointGeometry,
} from "@maptoolkit/elevation-profile";
import type { Feature, FeatureCollection } from "geojson";

const PROFILE_EVENTS: ElevationProfileEventType[] = ["hover", "hoverend", "click", "selection", "selectionend", "selectionclear"];

/**
 * Events fired via `control.on(...)`: all events of the elevation profile, with the control as `target`,
 * plus `open` and `close` when the state changes.
 */
export type ElevationControlEventType = {
  [T in ElevationProfileEventType]: MapLibreEvent & ElevationProfileEventMap[T] & { originalEvent: MouseEvent };
} & {
  open: MapLibreEvent;
  close: MapLibreEvent;
};

// `_locale`/`_getUIString` are undocumented on Map; cast here so `ElevationControl.*`
// keys work with the same `new Map({ locale })` table as built-in controls.
function getMapLocale(map: Map): Record<string, string> {
  return (map as unknown as { _locale: Record<string, string> })._locale;
}

function getUIString(map: Map, key: string): string {
  return (map as unknown as { _getUIString(key: string): string })._getUIString(key);
}

// isStyleLoaded() is also false while tiles load, but sources and layers can be added as soon as the style itself is loaded.
function isStyleReady(map: Map): boolean {
  return !!(map as unknown as { style?: { _loaded: boolean } }).style?._loaded;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * A layer drawn from the control's GeoJSON source, without `source`. The source has one feature per
 * `role` property: `"line"` (the route), `"selection"` (the selected stretch) and `"hover"` (the hover point).
 */
export type ElevationControlLayer = DistributiveOmit<Extract<LayerSpecification, { source: string }>, "source">;

// Ids are prefixed per control, so several controls can be added to one map.
const defaultLayers: ElevationControlLayer[] = [
  {
    id: "line",
    type: "line",
    filter: ["==", ["get", "role"], "line"],
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#002361", "line-width": 4, "line-opacity": 0.8 },
  },
  {
    id: "selection",
    type: "line",
    filter: ["==", ["get", "role"], "selection"],
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#fa5538", "line-width": 6 },
  },
  {
    id: "hover",
    type: "circle",
    filter: ["==", ["get", "role"], "hover"],
    paint: { "circle-radius": 6, "circle-color": "#fa5538", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
  },
];

let instanceCount = 0;

/**
 * Options for configuring the {@link ElevationControl}.
 */
export type ElevationControlOptions = Partial<ElevationProfileOptions> & {
  /** Start in the open, interactive state. If false, starts as a small preview. */
  open?: boolean;
  /**
   * Draw the route, the selection and the hover point on the map. `false` draws nothing,
   * an array of layers replaces the default layers.
   */
  layers?: boolean | ElevationControlLayer[];
  /** Id of an existing layer to insert the layers before, otherwise they are added on top. */
  beforeId?: string;
};

export const defaultElevationControlOptions: ElevationControlOptions = {
  width: 900,
  height: 300,
  open: true,
  layers: true,
};

/**
 * Shows an elevation profile for a 3D GeoJSON line on the map.
 */
export class ElevationControl extends Evented<ElevationControlEventType> implements IControl {
  options: ElevationControlOptions;

  private _map?: Map;
  private _feature: ElevationProfileFeature;
  private _container?: HTMLElement;
  private _profile?: ElevationProfile;
  private _open: boolean;
  private _sourceId = `maplibre-elevation-control-${++instanceCount}`;
  private _layerIds: string[] = [];
  private _hover?: ElevationProfilePointGeometry;
  private _selection?: ElevationProfileLineGeometry;

  constructor(feature: ElevationProfileFeature, options?: ElevationControlOptions) {
    super();
    this.options = Object.assign({}, defaultElevationControlOptions, options);
    this._feature = feature;
    this._open = this.options.open ?? true;
  }

  getDefaultPosition(): ControlPosition {
    return "bottom-right";
  }

  onAdd(map: Map) {
    this._map = map;

    const locale = getMapLocale(map);
    locale["ElevationControl.Open"] ??= "Open elevation profile";
    locale["ElevationControl.Close"] ??= "Close elevation profile";

    this._container = document.createElement("div");
    this._container.classList.add("maplibregl-ctrl", "maplibre-elevation-control");
    this._container.addEventListener("click", () => {
      if (!this.isOpen()) this.open();
    });
    this._container.addEventListener("keydown", (e) => {
      if (!this.isOpen() && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        this.open();
      }
    });

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.classList.add("maplibre-elevation-control-close");
    closeButton.title = getUIString(map, "ElevationControl.Close");
    closeButton.setAttribute("aria-label", closeButton.title);
    closeButton.addEventListener("click", (e) => {
      // Otherwise the container's listener opens it again right away.
      e.stopPropagation();
      this.close();
    });
    this._container.appendChild(closeButton);

    const profileEl = document.createElement("div");
    profileEl.classList.add("maplibre-elevation-control-profile");

    this._profile = new ElevationProfile(profileEl, this.options);
    for (const type of PROFILE_EVENTS) {
      // Re-fired with the control as target.
      this._profile.on(type, ({ type: _type, target: _target, ...data }) => this.fire(type, data));
    }
    this._profile.on("hover", ({ geometry }) => this._setMapState({ hover: geometry }));
    this._profile.on("hoverend", () => this._setMapState({ hover: undefined }));
    this._profile.on("selection", ({ geometry }) => this._setMapState({ selection: geometry }));
    this._profile.on("selectionend", ({ geometry }) => this._setMapState({ selection: geometry }));
    this._profile.on("selectionclear", () => this._setMapState({ selection: undefined }));
    this._profile.render(this._feature);

    if (this.options.layers !== false) {
      // Also after setStyle(), which removes the source and layers.
      map.on("style.load", this._addLayers);
      if (isStyleReady(map)) this._addLayers();
    }

    this._container.appendChild(profileEl);

    this._applyOpen();

    return this._container;
  }

  onRemove() {
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    if (this._map) {
      this._map.off("style.load", this._addLayers);
      for (const id of this._layerIds) {
        if (this._map.getLayer(id)) this._map.removeLayer(id);
      }
      if (this._map.getSource(this._sourceId)) this._map.removeSource(this._sourceId);
    }
    this._layerIds = [];
    this._hover = undefined;
    this._selection = undefined;
    this._map = undefined;
  }

  /**
   * Opens the interactive profile. Can be called before the control is added to a map.
   */
  open() {
    if (this._open) return this;
    this._open = true;
    this._applyOpen();
    this.fire("open");
    return this;
  }

  /**
   * Closes the control to a small, non-interactive preview. Clicking the preview opens it again.
   * Can be called before the control is added to a map.
   */
  close() {
    if (!this._open) return this;
    this._open = false;
    this._applyOpen();
    this.fire("close");
    return this;
  }

  isOpen() {
    return this._open;
  }

  // Arrow function, so it can be passed to map.on/off.
  private _addLayers = () => {
    const map = this._map;
    if (!map || map.getSource(this._sourceId)) return;
    map.addSource(this._sourceId, { type: "geojson", data: this._mapData() });
    const custom = Array.isArray(this.options.layers);
    const layers = custom ? (this.options.layers as ElevationControlLayer[]) : defaultLayers;
    const beforeId = this.options.beforeId && map.getLayer(this.options.beforeId) ? this.options.beforeId : undefined;
    this._layerIds = layers.map((layer) => {
      const id = custom ? layer.id : `${this._sourceId}-${layer.id}`;
      map.addLayer({ ...layer, id, source: this._sourceId } as LayerSpecification, beforeId);
      return id;
    });
  };

  private _mapData(): FeatureCollection {
    const features: Feature[] = [{ type: "Feature", geometry: this._feature.geometry, properties: { role: "line" } }];
    if (this._selection) features.push({ type: "Feature", geometry: this._selection, properties: { role: "selection" } });
    if (this._hover) features.push({ type: "Feature", geometry: this._hover, properties: { role: "hover" } });
    return { type: "FeatureCollection", features };
  }

  private _setMapState(state: { hover?: ElevationProfilePointGeometry; selection?: ElevationProfileLineGeometry }) {
    if ("hover" in state) this._hover = state.hover;
    if ("selection" in state) this._selection = state.selection;
    this._map?.getSource<GeoJSONSource>(this._sourceId)?.setData(this._mapData());
  }

  private _applyOpen() {
    if (!this._container || !this._map) return;
    this._container.classList.toggle("maplibre-elevation-control-collapsed", !this._open);
    if (this._open) {
      this._container.removeAttribute("role");
      this._container.removeAttribute("tabindex");
      this._container.removeAttribute("aria-label");
      this._container.removeAttribute("title");
    } else {
      // hideHover() fires no hoverend.
      this._profile?.hideHover();
      if (this._hover) this._setMapState({ hover: undefined });
      // While closed, the whole container acts as the open button.
      this._container.setAttribute("role", "button");
      this._container.setAttribute("tabindex", "0");
      this._container.title = getUIString(this._map, "ElevationControl.Open");
      this._container.setAttribute("aria-label", this._container.title);
    }
  }
}
