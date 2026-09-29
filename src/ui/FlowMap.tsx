import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { getFacilityArt } from "../assets/art";
import { RESOURCE_DEFINITIONS } from "../game/state/initialState";
import type { FacilityId, GameState, ResourceId } from "../game/state/types";

type Facility = GameState["facilities"][FacilityId];
type Rect = { x: number; y: number; w: number; h: number };
type FlowLink = { key: string; from: FacilityId; to: FacilityId; resourceId: ResourceId | "power"; kind: "item" | "power" };

const MAX_LINKS = 36;

const CATEGORY_COLORS: Record<string, string> = {
  raw: "#fbbf24",
  refined: "#38bdf8",
  component: "#a78bfa",
  advanced: "#f472b6",
  hightech: "#22d3ee",
  construction: "#cbd5e1",
  consumer: "#34d399",
  energy: "#facc15",
};

/** Derive producer -> consumer links between built facilities (visual only). */
export function computeFlowLinks(facilities: Facility[]): FlowLink[] {
  const links: FlowLink[] = [];
  for (const consumer of facilities) {
    for (const resourceId of Object.keys(consumer.inputRate) as ResourceId[]) {
      for (const producer of facilities) {
        if (producer.id === consumer.id || !(resourceId in producer.outputRate)) continue;
        links.push({ key: `${producer.id}>${consumer.id}:${resourceId}`, from: producer.id, to: consumer.id, resourceId, kind: "item" });
      }
    }
  }
  const powerProducers = facilities.filter((facility) => (facility.outputRate.power ?? 0) > 0);
  if (powerProducers.length > 0) {
    facilities
      .filter((facility) => facility.powerConsumption > 0 && !powerProducers.includes(facility))
      .forEach((consumer, index) => {
        const producer = powerProducers[index % powerProducers.length];
        links.push({ key: `${producer.id}>${consumer.id}:power`, from: producer.id, to: consumer.id, resourceId: "power", kind: "power" });
      });
  }
  return links.slice(0, MAX_LINKS);
}

/** Cubic path leaving the side of `a` that faces `b` and entering the facing side of `b`. */
function buildPath(a: Rect, b: Rect): string {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  const horizontal = Math.abs(bx - ax) >= Math.abs(by - ay) * 0.9;
  if (horizontal) {
    const dir = bx >= ax ? 1 : -1;
    const x1 = ax + (dir * a.w) / 2;
    const x2 = bx - (dir * b.w) / 2;
    const bend = Math.max(24, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${ay} C ${x1 + dir * bend} ${ay}, ${x2 - dir * bend} ${by}, ${x2} ${by}`;
  }
  const dir = by >= ay ? 1 : -1;
  const y1 = ay + (dir * a.h) / 2;
  const y2 = by - (dir * b.h) / 2;
  const bend = Math.max(18, Math.abs(y2 - y1) / 2);
  return `M ${ax} ${y1} C ${ax} ${y1 + dir * bend}, ${bx} ${y2 - dir * bend}, ${bx} ${y2}`;
}

type FlowMapProps = {
  facilities: Facility[];
  onSelect: (facilityId: FacilityId) => void;
  reducedMotion: boolean;
  /** facilityId -> monotonically increasing key; changes trigger the build/level-up effect. */
  flashKeys: Partial<Record<FacilityId, number>>;
};

export function FlowMap({ facilities, onSelect, reducedMotion, flashKeys }: FlowMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<FacilityId, HTMLButtonElement>());
  const [rects, setRects] = useState<Partial<Record<FacilityId, Rect>>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const layoutKey = facilities.map((facility) => facility.id).join("|");

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const next: Partial<Record<FacilityId, Rect>> = {};
      nodeRefs.current.forEach((node, id) => {
        next[id] = { x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight };
      });
      setRects(next);
      setSize({ w: container.scrollWidth, h: container.scrollHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [layoutKey]);

  const links = useMemo(() => computeFlowLinks(facilities), [facilities]);
  const byId = useMemo(() => Object.fromEntries(facilities.map((facility) => [facility.id, facility])) as Record<FacilityId, Facility>, [facilities]);

  return (
    <div className="facility-map" ref={containerRef}>
      {size.w > 0 && links.length > 0 && (
        <svg className="flow-layer" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
          {links.map((link) => {
            const a = rects[link.from];
            const b = rects[link.to];
            if (!a || !b) return null;
            const source = byId[link.from];
            const target = byId[link.to];
            const flowing = source?.status === "online" && Boolean(target?.active);
            const color = link.kind === "power" ? CATEGORY_COLORS.energy : CATEGORY_COLORS[RESOURCE_DEFINITIONS[link.resourceId].category] ?? "#22d3ee";
            const d = buildPath(a, b);
            return (
              <g key={link.key} className={`flow-link flow-${link.kind} ${flowing ? "is-flowing" : "is-idle"}`} style={{ color }}>
                <path className="flow-rail" d={d} />
                <path className="flow-belt" d={d} />
                {flowing && !reducedMotion && link.kind === "item" && [0, 1, 2].map((slot) => (
                  <rect key={slot} className="flow-item" x={-2.5} y={-2.5} width={5} height={5}>
                    <animateMotion dur="2.4s" begin={`${-slot * 0.8}s`} repeatCount="indefinite" path={d} rotate="auto" />
                  </rect>
                ))}
              </g>
            );
          })}
        </svg>
      )}
      {facilities.map((facility, index) => {
        const flashKey = flashKeys[facility.id];
        return (
          <button
            key={facility.id}
            ref={(node) => {
              if (node) nodeRefs.current.set(facility.id, node);
              else nodeRefs.current.delete(facility.id);
            }}
            className={`map-node status-${facility.status} ${facility.active ? "active" : "inactive"}`}
            style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
            onClick={() => onSelect(facility.id)}
            type="button"
          >
            <span className="map-node-light" />
            <img className="pixel-icon" src={getFacilityArt(facility.id)} alt="" width={32} height={32} />
            <strong>{facility.name}</strong>
            <small>LV {facility.level} � T{facility.tier} � {facility.active ? "ACTIVE" : "OFFLINE"}</small>
            {flashKey !== undefined && <span key={flashKey} className="node-flash" aria-hidden="true" />}
          </button>
        );
      })}
      {facilities.length === 0 && <p className="muted">No facilities built. Use the catalog below to deploy your first assets.</p>}
    </div>
  );
}
