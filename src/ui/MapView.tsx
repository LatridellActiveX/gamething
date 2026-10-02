// Operations map with a 2D/3D switch. The 3D view (three.js) is lazy-loaded so it never
// weighs on the initial bundle; the 2D FlowMap stays as the fallback.
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { FacilityId, GameState } from "../game/state/types";
import { FlowMap } from "./FlowMap";

type Facility = GameState["facilities"][FacilityId];
type MapMode = "2d" | "3d";

const FactoryMap3D = lazy(() => import("./map3d/FactoryMap3D"));
const STORAGE_KEY = "industrial-frontier-map-view";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class MapErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("3D map failed, falling back to 2D", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type MapViewProps = {
  facilities: Facility[];
  onSelect: (facilityId: FacilityId) => void;
  reducedMotion: boolean;
  flashKeys: Partial<Record<FacilityId, number>>;
  powerShort: boolean;
};

export function MapView(props: MapViewProps) {
  const [webgl] = useState(hasWebGL);
  const [touch] = useState(() => typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<MapMode>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "2d" ? "2d" : "3d";
    } catch {
      return "3d";
    }
  });
  const canUse3D = webgl && !failed;
  const show3D = mode === "3d" && canUse3D;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // storage unavailable: the choice just won't persist
    }
  }, [mode]);

  return (
    <div className="map-view">
      <div className="map-view-bar">
        <div className="map-toggle" role="group" aria-label="Map view">
          <button type="button" className={!show3D ? "active" : ""} aria-pressed={!show3D} onClick={() => setMode("2d")}>2D</button>
          <button type="button" className={show3D ? "active" : ""} aria-pressed={show3D} onClick={() => setMode("3d")} disabled={!canUse3D} title={canUse3D ? "3D city view" : "3D view needs WebGL, which isn't available here"}>3D</button>
        </div>
        {show3D && <span className="map-view-hint">{touch ? "Drag to pan · pinch to zoom · twist with two fingers to rotate · tap a building" : "Drag to pan · scroll to zoom · right-drag to rotate · click a building"}</span>}
        {!canUse3D && mode === "3d" && <span className="map-view-hint">3D view unavailable on this device, showing the 2D map.</span>}
      </div>
      {show3D ? (
        <div className="map3d" role="region" aria-label={`3D map of ${props.facilities.length} built facilities. Use the 2D view for keyboard navigation.`}>
          <MapErrorBoundary onError={() => setFailed(true)}>
            <Suspense fallback={<div className="map3d-loading">Loading 3D map…</div>}>
              <FactoryMap3D facilities={props.facilities} onSelect={props.onSelect} reducedMotion={props.reducedMotion} powerShort={props.powerShort} flashKeys={props.flashKeys} />
            </Suspense>
          </MapErrorBoundary>
          <div className="map3d-legend" aria-hidden="true">
            <span><i className="map3d-dot status-running" />Running</span>
            <span><i className="map3d-dot status-idle" />Idle</span>
            <span><i className="map3d-dot status-noPower" />No power</span>
            <span><i className="map3d-dot status-off" />Paused</span>
          </div>
          {props.facilities.length === 0 && <p className="map3d-empty"><span>No facilities built yet. Use the catalog below to deploy your first assets.</span></p>}
        </div>
      ) : (
        <FlowMap facilities={props.facilities} onSelect={props.onSelect} reducedMotion={props.reducedMotion} flashKeys={props.flashKeys} />
      )}
    </div>
  );
}
