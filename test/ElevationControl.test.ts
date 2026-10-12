import { describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { ElevationProfileFeature } from "@maptoolkit/elevation-profile";
import { ElevationControl, type ElevationControlLayer } from "../src/ElevationControl";

interface MockMap {
  _locale: Record<string, string>;
  style: { _loaded: boolean };
  sources: Record<string, { data: unknown; setData: (data: unknown) => void }>;
  // Layer ids in drawing order.
  layers: { id: string; source: string; [key: string]: unknown }[];
  // Fires "style.load" and drops all sources and layers, like setStyle().
  setStyle(): void;
}

function createMockMap(locale: Record<string, string> = {}, { styleLoaded = true } = {}): MaplibreMap & MockMap {
  const listeners: Record<string, (() => void)[]> = {};
  const map: MockMap & Record<string, unknown> = {
    _locale: locale,
    _getUIString: (key: string) => {
      const value = locale[key];
      if (value == null) throw new Error(`Missing UI string '${key}'`);
      return value;
    },
    style: { _loaded: styleLoaded },
    sources: {},
    layers: [],
    on: (type: string, listener: () => void) => (listeners[type] ??= []).push(listener),
    off: (type: string, listener: () => void) => (listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener)),
    addSource: (id: string, source: { data: unknown }) => {
      const entry = { data: source.data, setData: (data: unknown) => (entry.data = data) };
      map.sources[id] = entry;
    },
    getSource: (id: string) => map.sources[id],
    removeSource: (id: string) => delete map.sources[id],
    addLayer: (layer: MockMap["layers"][number], beforeId?: string) => {
      const index = map.layers.findIndex((l) => l.id === beforeId);
      map.layers.splice(index < 0 ? map.layers.length : index, 0, layer);
    },
    getLayer: (id: string) => map.layers.find((l) => l.id === id),
    removeLayer: (id: string) => (map.layers = map.layers.filter((l) => l.id !== id)),
    setStyle: () => {
      map.sources = {};
      map.layers = [];
      map.style._loaded = true;
      (listeners["style.load"] ?? []).forEach((l) => l());
    },
  };
  return map as unknown as MaplibreMap & MockMap;
}

function createFeature(): ElevationProfileFeature {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [11.4, 47.26, 600],
        [11.41, 47.27, 700],
        [11.42, 47.28, 650],
      ],
    },
    properties: {},
  };
}

function addControl(control: ElevationControl, map = createMockMap()): HTMLElement {
  const container = control.onAdd(map);
  document.body.appendChild(container);
  return container;
}

// The profile only fires on mouse input, which jsdom can't map to the SVG, so fire directly.
function fireProfileEvent(control: ElevationControl, type: string, data: object = {}, originalEvent = new MouseEvent("mousemove")) {
  const profile = (control as unknown as { _profile: { fire: (type: string, data: object, originalEvent: MouseEvent) => void } })._profile;
  profile.fire(type, data, originalEvent);
}

const roles = (map: MockMap, sourceId: string) =>
  (map.sources[sourceId].data as { features: { properties: { role: string } }[] }).features.map((f) => f.properties.role);

const closeButton = (container: HTMLElement) => container.querySelector<HTMLButtonElement>(".maplibre-elevation-control-close")!;
const isCollapsed = (container: HTMLElement) => container.classList.contains("maplibre-elevation-control-collapsed");

describe("ElevationControl", () => {
  it("creates a container element with the profile on add", () => {
    const container = addControl(new ElevationControl(createFeature()));

    expect(container.classList.contains("maplibregl-ctrl")).toBe(true);
    expect(container.classList.contains("maplibre-elevation-control")).toBe(true);
    expect(container.querySelector(".maplibre-elevation-control-profile svg")).not.toBeNull();
  });

  it("is placed in the bottom-right corner by default", () => {
    expect(new ElevationControl(createFeature()).getDefaultPosition()).toBe("bottom-right");
  });

  it("removes the container on remove", () => {
    const control = new ElevationControl(createFeature());
    const container = addControl(control);
    control.onRemove();

    expect(container.isConnected).toBe(false);
  });
});

describe("open and close", () => {
  it("starts open by default", () => {
    const control = new ElevationControl(createFeature());
    const container = addControl(control);

    expect(control.isOpen()).toBe(true);
    expect(isCollapsed(container)).toBe(false);
    expect(container.hasAttribute("role")).toBe(false);
    expect(container.hasAttribute("title")).toBe(false);
  });

  it("starts closed with open: false", () => {
    const control = new ElevationControl(createFeature(), { open: false });
    const container = addControl(control);

    expect(control.isOpen()).toBe(false);
    expect(isCollapsed(container)).toBe(true);
    expect(container.getAttribute("role")).toBe("button");
    expect(container.getAttribute("tabindex")).toBe("0");
  });

  it("can be opened and closed before it is added to a map", () => {
    const control = new ElevationControl(createFeature()).close();
    const container = addControl(control);

    expect(isCollapsed(container)).toBe(true);
  });

  it("returns the control from open() and close() for chaining", () => {
    const control = new ElevationControl(createFeature());
    addControl(control);

    expect(control.close()).toBe(control);
    expect(control.open()).toBe(control);
    expect(control.close().open().isOpen()).toBe(true);
  });

  it("closes on a click on the close button", () => {
    const control = new ElevationControl(createFeature());
    const container = addControl(control);
    closeButton(container).click();

    // The click must not bubble up to the container and open it again.
    expect(control.isOpen()).toBe(false);
    expect(isCollapsed(container)).toBe(true);
  });

  it("opens on a click on the closed preview", () => {
    const control = new ElevationControl(createFeature(), { open: false });
    const container = addControl(control);
    container.click();

    expect(control.isOpen()).toBe(true);
    expect(container.hasAttribute("role")).toBe(false);
    expect(container.hasAttribute("tabindex")).toBe(false);
  });

  it("does not close on a click on the open profile", () => {
    const control = new ElevationControl(createFeature());
    const container = addControl(control);
    container.click();

    expect(control.isOpen()).toBe(true);
  });

  it.each(["Enter", " "])("opens on %j while the preview is focused", (key) => {
    const control = new ElevationControl(createFeature(), { open: false });
    const container = addControl(control);
    container.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

    expect(control.isOpen()).toBe(true);
  });
});

describe("localization", () => {
  it("uses English defaults for title and aria-label", () => {
    const control = new ElevationControl(createFeature());
    const container = addControl(control);

    expect(closeButton(container).title).toBe("Close elevation profile");
    expect(closeButton(container).getAttribute("aria-label")).toBe("Close elevation profile");
    control.close();
    expect(container.title).toBe("Open elevation profile");
    expect(container.getAttribute("aria-label")).toBe("Open elevation profile");
  });

  it("uses the strings from the map's locale", () => {
    const map = createMockMap({ "ElevationControl.Open": "Öffnen", "ElevationControl.Close": "Schließen" });
    const control = new ElevationControl(createFeature(), { open: false });
    const container = addControl(control, map);

    expect(container.title).toBe("Öffnen");
    expect(closeButton(container).title).toBe("Schließen");
  });
});

describe("events", () => {
  it("fires open and close only when the state changes", () => {
    const control = new ElevationControl(createFeature());
    const onOpen = vi.fn();
    const onClose = vi.fn();
    control.on("open", onOpen);
    control.on("close", onClose);
    addControl(control);

    control.open();
    expect(onOpen).not.toHaveBeenCalled();

    control.close().close();
    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose.mock.calls[0][0].target).toBe(control);

    control.open();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("does not fire open or close for the initial state", () => {
    const control = new ElevationControl(createFeature(), { open: false });
    const onClose = vi.fn();
    control.on("close", onClose);
    addControl(control);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("re-fires the profile's events with the control as target", () => {
    const control = new ElevationControl(createFeature());
    const listener = vi.fn();
    control.on("selectionend", listener);
    addControl(control);

    const originalEvent = new MouseEvent("mouseup");
    fireProfileEvent(control, "selectionend", { start: 100, end: 200, ascent: 50, descent: 10 }, originalEvent);

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0];
    expect(event.type).toBe("selectionend");
    expect(event.target).toBe(control);
    expect(event).toMatchObject({ start: 100, end: 200, ascent: 50, descent: 10, originalEvent });
  });
});

describe("map layers", () => {
  const point = { type: "Point", coordinates: [11.405, 47.265, 650] };
  const stretch = {
    type: "LineString",
    coordinates: [
      [11.405, 47.265, 650],
      [11.41, 47.27, 700],
    ],
  };

  it("adds a source with the route and the default layers", () => {
    const map = createMockMap();
    addControl(new ElevationControl(createFeature()), map);

    const [sourceId] = Object.keys(map.sources);
    expect(roles(map, sourceId)).toEqual(["line"]);
    expect(map.layers.map((l) => l.id)).toEqual([`${sourceId}-line`, `${sourceId}-selection`, `${sourceId}-hover`]);
    expect(map.layers.every((l) => l.source === sourceId)).toBe(true);
  });

  it("uses separate sources and layer ids per control", () => {
    const map = createMockMap();
    addControl(new ElevationControl(createFeature()), map);
    addControl(new ElevationControl(createFeature()), map);

    expect(Object.keys(map.sources)).toHaveLength(2);
    expect(new Set(map.layers.map((l) => l.id)).size).toBe(6);
  });

  it("adds nothing to the map with layers: false", () => {
    const map = createMockMap();
    addControl(new ElevationControl(createFeature(), { layers: false }), map);

    expect(map.sources).toEqual({});
    expect(map.layers).toEqual([]);
  });

  it("uses custom layers as given, with the control's source", () => {
    const map = createMockMap();
    const layers: ElevationControlLayer[] = [{ id: "my-selection", type: "line", filter: ["==", ["get", "role"], "selection"] }];
    addControl(new ElevationControl(createFeature(), { layers }), map);

    const [sourceId] = Object.keys(map.sources);
    expect(map.layers).toEqual([{ ...layers[0], source: sourceId }]);
  });

  it("inserts the layers before beforeId if it exists", () => {
    const map = createMockMap();
    map.layers.push({ id: "labels", source: "other" });
    addControl(new ElevationControl(createFeature(), { beforeId: "labels" }), map);
    expect(map.layers[map.layers.length - 1].id).toBe("labels");

    const other = createMockMap();
    addControl(new ElevationControl(createFeature(), { beforeId: "missing" }), other);
    expect(other.layers).toHaveLength(3);
  });

  it("waits for the style to load", () => {
    const map = createMockMap({}, { styleLoaded: false });
    addControl(new ElevationControl(createFeature()), map);
    expect(map.layers).toEqual([]);

    map.setStyle();
    expect(map.layers).toHaveLength(3);
  });

  it("adds the source and layers again after a style change, with the current state", () => {
    const map = createMockMap();
    const control = new ElevationControl(createFeature());
    addControl(control, map);
    fireProfileEvent(control, "selectionend", { geometry: stretch });

    map.setStyle();
    const [sourceId] = Object.keys(map.sources);
    expect(map.layers).toHaveLength(3);
    expect(roles(map, sourceId)).toEqual(["line", "selection"]);
  });

  it("updates the source on hover and selection events", () => {
    const map = createMockMap();
    const control = new ElevationControl(createFeature());
    addControl(control, map);
    const [sourceId] = Object.keys(map.sources);

    fireProfileEvent(control, "hover", { geometry: point });
    expect(roles(map, sourceId)).toEqual(["line", "hover"]);
    fireProfileEvent(control, "hoverend");
    expect(roles(map, sourceId)).toEqual(["line"]);

    fireProfileEvent(control, "selection", { geometry: stretch });
    expect(roles(map, sourceId)).toEqual(["line", "selection"]);
    fireProfileEvent(control, "selectionend", { geometry: stretch });
    expect(roles(map, sourceId)).toEqual(["line", "selection"]);
    fireProfileEvent(control, "selectionclear");
    expect(roles(map, sourceId)).toEqual(["line"]);
  });

  it("removes the hover point but keeps the selection when closed", () => {
    const map = createMockMap();
    const control = new ElevationControl(createFeature());
    addControl(control, map);
    const [sourceId] = Object.keys(map.sources);

    fireProfileEvent(control, "selectionend", { geometry: stretch });
    fireProfileEvent(control, "hover", { geometry: point });
    control.close();

    expect(roles(map, sourceId)).toEqual(["line", "selection"]);
  });

  it("removes the source, layers and listener on remove", () => {
    const map = createMockMap();
    map.layers.push({ id: "other", source: "other" });
    const control = new ElevationControl(createFeature());
    addControl(control, map);
    control.onRemove();

    expect(map.sources).toEqual({});
    expect(map.layers.map((l) => l.id)).toEqual(["other"]);
    map.setStyle();
    expect(map.layers).toEqual([]);
  });
});
