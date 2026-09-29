import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getFacilityArt } from "../assets/art";
import { RESOURCE_DEFINITIONS } from "../game/state/initialState";
import type { FacilityId, GameState, ResourceId } from "../game/state/types";
import { layoutFacilitiesByChain } from "./flowLayout";

type Facility = GameState["facilities"][FacilityId];
type Rect = { x: number; y: number; w: number; h: number };
type FlowLink = { key: string; from: FacilityId; to: FacilityId; resourceId: ResourceId | "power"; kind: "item" | "power" };

const MAX_LINKS = 36;
/** One production floater every N ms, rotating through online facilities, so it never gets noisy. */
const FLOATER_INTERVAL_MS = 1400;
const FLOATER_LIFETIME_MS = 1700;
const MAX_FLOATERS = 4;

type ProductionFloater = { id: number; facilityId: FacilityId; text: string; tone: "item" | "cash" };
let floaterSeq = 0;

const formatAmount = (value: number) => (value >= 10 ? value.toFixed(0) : value >= 1 ? value.toFixed(1) : value.toFixed(2));

/** "+1.3 Bauxite" for the facility's largest per-tick output (consumer goods show cash earned). */
function describeProduction(facility: Facility): Pick<ProductionFloater, "text" | "tone"> | null {
  let best: { resourceId: ResourceId; amount: number } | null = null;
  for (const [resourceId, rate] of Object.entries(facility.outputRate) as Array<[ResourceId, number]>) {
    if (resourceId === "power") continue;
    const amount = rate * facility.level;
    if (!best || amount > best.amount) best = { resourceId, amount };
  }
  if (!best) return null;
  const definition = RESOURCE_DEFINITIONS[best.resourceId];
  if (definition.category === "consumer") return { text: `+$${Math.round(definition.baseValue * 0.85 * best.amount).toLocaleString()}`, tone: "cash" };
  return { text: `+${formatAmount(best.amount)} ${definition.name}`, tone: "item" };
}

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

export function FlowMap({ facilities: builtFacilities, onSelect, reducedMotion, flashKeys }: FlowMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<FacilityId, HTMLButtonElement>());
  const [rects, setRects] = useState<Partial<Record<FacilityId, Rect>>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Production-chain layout depends only on which facilities are built, so it stays put as levels/status change.
  const builtKey = builtFacilities.map((facility) => facility.id).sort().join("|");
  const layoutGroups = useMemo(
    () => layoutFacilitiesByChain(builtFacilities).map((group) => ({ key: group.key, label: group.label, ids: group.facilities.map((facility) => facility.id) })),
    [builtKey],
  );
  const currentById = new Map(builtFacilities.map((facility) => [facility.id, facility]));
  const groups = layoutGroups.map((group) => ({ ...group, facilities: group.ids.map((id) => currentById.get(id)).filter((facility): facility is Facility => Boolean(facility)) }));
  const facilities = groups.flatMap((group) => group.facilities);
  const layoutKey = layoutGroups.map((group) => `${group.key}:${group.ids.join(",")}`).join("|");

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

  const facilitiesRef = useRef(facilities);
  facilitiesRef.current = facilities;
  const [floaters, setFloaters] = useState<ProductionFloater[]>([]);
  const cursorRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      setFloaters([]);
      return;
    }
    const timers = new Set<number>();
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const producers = facilitiesRef.current.filter((facility) => facility.status === "online" && describeProduction(facility));
      if (producers.length === 0) return;
      const facility = producers[cursorRef.current % producers.length];
      cursorRef.current += 1;
      const production = describeProduction(facility);
      if (!production) return;
      const floater: ProductionFloater = { id: ++floaterSeq, facilityId: facility.id, ...production };
      setFloaters((current) => [...current.slice(-(MAX_FLOATERS - 1)), floater]);
      const timer = window.setTimeout(() => {
        setFloaters((current) => current.filter((item) => item.id !== floater.id));
        timers.delete(timer);
      }, FLOATER_LIFETIME_MS);
      timers.add(timer);
    }, FLOATER_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [reducedMotion]);

  const links = useMemo(() => computeFlowLinks(facilities), [builtFacilities, layoutKey]);
  const byId = Object.fromEntries(facilities.map((facility) => [facility.id, facility])) as Record<FacilityId, Facility>;

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
      {groups.map((group) => [
        <div key={`group-${group.key}`} className={`map-group-label map-group-${group.key}`}>
          {group.label}
        </div>,
        ...group.facilities.map((facility) => {
        const index = facilities.indexOf(facility);
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
            <small>LV {facility.level} · T{facility.tier} · {facility.active ? "ACTIVE" : "OFFLINE"}</small>
            {flashKey !== undefined && <span key={flashKey} className="node-flash" aria-hidden="true" />}
          </button>
        );
        }),
      ])}
      <div className="production-float-layer" aria-hidden="true">
        {floaters.map((floater) => {
          const rect = rects[floater.facilityId];
          if (!rect) return null;
          return (
            <span key={floater.id} className={`production-float ${floater.tone}`} style={{ left: rect.x + rect.w / 2, top: rect.y - 8 }}>
              {floater.text}
            </span>
          );
        })}
      </div>
      {facilities.length === 0 && <p className="muted">No facilities built. Use the catalog below to deploy your first assets.</p>}
    </div>
  );
}
