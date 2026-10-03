// Full-screen technology tree: era columns, category lanes, glowing prerequisite lines,
// pan / zoom / pinch, a minimap and a detail panel for the selected building.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LOGO_ART, getFacilityArt, getResourceArt } from "../assets/art";
import { getFacilityUpgradeCost } from "../game/engine";
import { RESOURCE_DEFINITIONS } from "../game/state/initialState";
import type { FacilityId, GameState, ResourceId } from "../game/state/types";
import { canResearch, getEraMilestone, getNextMilestone, getResearchCost, getResearchRate, isEraOpen, isResearchable } from "../game/tech/research";
import { RpIcon } from "./RpIcon";
import { getCurrentEra, getShortfallLabel, getStepsAway, type Recommendation } from "../game/tech/catalog";
import { CATEGORY_META, ERAS, TECH_DEPENDENTS, TECH_NODES, getEra } from "../game/tech/techTree";
import { NODE_H, NODE_W, TREE_LAYOUT, edgePath } from "./techTreeLayout";

export type TreeNodeState = "built" | "recommended" | "available" | "researchable" | "locked" | "fog";

type Camera = { x: number; y: number; k: number };

export type TechTreeProps = {
  game: GameState;
  recommendation: Recommendation | null;
  reducedMotion: boolean;
  initialFocus?: FacilityId | null;
  onClose: () => void;
  onBuild: (id: FacilityId, trigger?: HTMLElement | null) => void;
  onOpenFacility: (id: FacilityId) => void;
};

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
const qty = (value: number) => (Math.round(value * 100) / 100).toLocaleString();
const MIN_K = 0.3;
const MAX_K = 1.6;
const STATE_LABEL: Record<TreeNodeState, string> = { built: "Built", recommended: "★ Next", available: "Available", researchable: "Research", locked: "Locked", fog: "???" };
const MINI_W = 208;
const MINI_H = 96;

export function getTreeNodeState(game: GameState, id: FacilityId, recommendedId: FacilityId | null, frontierEra: number): TreeNodeState {
  const facility = game.facilities[id];
  const researchable = isResearchable(game, id);
  if (id === recommendedId && (facility.unlocked || researchable)) return "recommended";
  if (facility.level > 0) return "built";
  if (facility.unlocked) return "available";
  if (researchable) return "researchable";
  return TECH_NODES[id].era > frontierEra + 1 && !isEraOpen(game, TECH_NODES[id].era) ? "fog" : "locked";
}

export default function TechTree({ game, recommendation, reducedMotion, initialFocus, onClose, onBuild, onOpenFacility }: TechTreeProps) {
  const recommendedId = recommendation?.facilityId ?? null;
  const [selected, setSelected] = useState<FacilityId>(initialFocus ?? recommendedId ?? "coalGenerator");
  const [sheetOpen, setSheetOpen] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cam, setCam] = useState<Camera | null>(null);
  const [gliding, setGliding] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragDistance = useRef(0);
  const mobile = size.w > 0 && size.w < 600;

  const facilities = Object.values(game.facilities);
  const frontierEra = getCurrentEra(game, recommendedId);
  const states = useMemo(() => Object.fromEntries((Object.keys(TECH_NODES) as FacilityId[]).map((id) => [id, getTreeNodeState(game, id, recommendedId, frontierEra)])) as Record<FacilityId, TreeNodeState>, [game, recommendedId, frontierEra]);

  const clamp = useCallback((next: Camera): Camera => {
    const k = Math.min(MAX_K, Math.max(MIN_K, next.k));
    const margin = 120;
    const minX = Math.min(margin, size.w - TREE_LAYOUT.width * k - margin);
    const minY = Math.min(margin, size.h - TREE_LAYOUT.height * k - margin);
    return { k, x: Math.min(margin, Math.max(minX, next.x)), y: Math.min(margin, Math.max(minY, next.y)) };
  }, [size]);

  const centerOn = useCallback((id: FacilityId, k?: number, glide = true) => {
    const pos = TREE_LAYOUT.positions[id];
    setCam((current) => {
      const scale = k ?? current?.k ?? 1;
      const anchorY = size.w < 600 ? 0.3 : 0.45;
      return clamp({ k: scale, x: size.w * (size.w < 600 ? 0.5 : 0.42) - (pos.x + NODE_W / 2) * scale, y: size.h * anchorY - (pos.y + NODE_H / 2) * scale });
    });
    if (glide && !reducedMotion) {
      setGliding(true);
      window.setTimeout(() => setGliding(false), 420);
    }
  }, [clamp, size, reducedMotion]);

  useLayoutEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const measure = () => setSize({ w: element.clientWidth, h: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.w > 0 && cam === null) centerOn(selected, size.w < 600 ? 0.62 : 0.92, false);
  }, [size, cam, centerOn, selected]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".facility-modal")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setCam((current) => {
      if (!current) return current;
      const k = Math.min(MAX_K, Math.max(MIN_K, current.k * factor));
      const ratio = k / current.k;
      return clamp({ k, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio });
    });
  }, [clamp]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".tt-hud")) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) dragDistance.current = 0;
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = { x: event.clientX, y: event.clientY };
    if (pointers.current.size === 1) {
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      dragDistance.current += Math.abs(dx) + Math.abs(dy);
      if (dragDistance.current > 6) {
        if (!canvasRef.current?.hasPointerCapture(event.pointerId)) canvasRef.current?.setPointerCapture(event.pointerId);
        setCam((current) => (current ? clamp({ ...current, x: current.x + dx, y: current.y + dy }) : current));
      }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.entries()].map(([id, value]) => (id === event.pointerId ? point : value));
      const [pa, pb] = [...pointers.current.values()];
      const before = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      const after = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = canvasRef.current!.getBoundingClientRect();
      dragDistance.current += 10;
      if (before > 0) zoomAt(after / before, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
    }
    pointers.current.set(event.pointerId, point);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
  };

  const pick = (id: FacilityId) => {
    if (dragDistance.current > 6) return;
    setSelected(id);
    setSheetOpen(true);
  };
  const jumpTo = (id: FacilityId) => {
    setSelected(id);
    setSheetOpen(true);
    centerOn(id);
  };

  const edges = useMemo(() => (Object.keys(TECH_NODES) as FacilityId[]).flatMap((to) => TECH_NODES[to].prerequisites.map((from) => ({ from, to }))), []);
  const builtCount = facilities.filter((facility) => facility.level > 0).length;
  const frontier = getEra(frontierEra);
  const nextMilestone = getNextMilestone(game);
  const nextProgress = nextMilestone ? nextMilestone.progress(game) : null;
  const camera = cam ?? { x: 0, y: 0, k: 1 };
  const miniScale = Math.min(MINI_W / TREE_LAYOUT.width, MINI_H / TREE_LAYOUT.height);

  return (
    <div className={`tt-overlay ${reducedMotion ? "is-reduced" : ""}`} role="dialog" aria-modal="true" aria-label="Technology tree">
      <header className="tt-top">
        <button type="button" className="secondary tt-back" onClick={onClose} aria-label="Close the tech tree">‹</button>
        <div className="tt-brand"><img className="pixel-icon" src={LOGO_ART} alt="" width={32} height={32} /><div><p className="eyebrow">Industrial Frontier</p><h1>Tech <span>Tree</span></h1></div></div>
        <div className="tt-stats">
          <div className="tt-stat"><img className="pixel-icon" src={getResourceArt("goldBar")} alt="" width={20} height={20} /><div><b>{money(game.cash)}</b><small>cash</small></div></div>
          <div className="tt-stat tt-hide-m"><img className="pixel-icon" src={getResourceArt("power")} alt="" width={20} height={20} /><div><b>{qty(game.power.productionPerSecond)} / {qty(game.power.consumptionPerSecond)} MW</b><small>{game.power.productionPerSecond >= game.power.consumptionPerSecond ? "grid ok" : "grid short"}</small></div></div>
          <div className="tt-stat tt-rp" title={`+${getResearchRate(game).toFixed(2)} RP per second`}><RpIcon size={20} /><div><b>{Math.floor(game.progress.researchPoints)} RP</b><small>+{getResearchRate(game).toFixed(2)}/s</small></div></div>
          <div className="tt-stat tt-hide-m"><img className="pixel-icon" src={getFacilityArt("factory")} alt="" width={20} height={20} /><div><b>{builtCount} / {facilities.length}</b><small>built</small></div></div>
        </div>
      </header>
      <section className="tt-track" aria-label="Milestones">
        <div className="tt-track-label">
          <p className="eyebrow">{nextMilestone ? "Next milestone" : "Journey complete"}</p>
          <b>{nextMilestone ? nextMilestone.name : `Era ${frontier.numeral} · ${frontier.name}`}</b>
          {nextMilestone && nextProgress && <small>{nextMilestone.goal} · {qty(Math.min(nextProgress.value, nextProgress.target))}/{qty(nextProgress.target)}</small>}
        </div>
        <ol className="tt-steps">
          {ERAS.map((era, index) => {
            const members = facilities.filter((facility) => TECH_NODES[facility.id].era === era.id);
            const milestone = getEraMilestone(era.id);
            const open = isEraOpen(game, era.id);
            const isNext = Boolean(milestone && nextMilestone && milestone.id === nextMilestone.id);
            const progress = milestone && isNext ? milestone.progress(game) : null;
            const status = open ? "done" : isNext ? "now" : "";
            const builtHere = members.filter((facility) => facility.level > 0).length;
            return (
              <li key={era.id} className={`tt-ms ${status}`} title={milestone ? `${milestone.name}: ${milestone.goal} (+${milestone.reward} RP)` : "Open from the start"}>
                <span className="tt-dot">{open ? "✓" : era.numeral}</span>
                <span className="tt-ms-txt"><b>{era.name}</b><small>{open ? `${builtHere} / ${members.length} built` : progress ? `${milestone!.name} ${Math.floor(Math.min(100, (progress.value / progress.target) * 100))}%` : `🔒 ${milestone?.name ?? ""}`}</small></span>
                {index < ERAS.length - 1 && <span className="tt-bar">{progress && <i style={{ width: `${Math.min(100, (progress.value / progress.target) * 100)}%` }} />}</span>}
              </li>
            );
          })}
        </ol>
      </section>
      <div className="tt-main">
        <div
          className="tt-canvas"
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className={`tt-world ${gliding ? "is-gliding" : ""}`} style={{ width: TREE_LAYOUT.width, height: TREE_LAYOUT.height, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})` }}>
            {TREE_LAYOUT.columns.map((column, index) => {
              const era = getEra(column.era);
              const members = facilities.filter((facility) => TECH_NODES[facility.id].era === column.era);
              return (
                <div key={column.era} className={`tt-era ${index % 2 ? "alt" : ""}`} style={{ left: column.x - 18, width: column.width + 36 }}>
                  <h3><em>{era.numeral}</em>{era.name}</h3>
                  <div className={`tt-gate ${column.era < frontierEra ? "ok" : column.era === frontierEra ? "wait" : ""}`}>{members.filter((facility) => facility.level > 0).length} / {members.length} built</div>
                </div>
              );
            })}
            {TREE_LAYOUT.lanes.map((lane) => (
              <div key={lane.category} className="tt-lane" style={{ top: lane.y - 12, width: TREE_LAYOUT.width }}><span>{CATEGORY_META[lane.category].label}</span></div>
            ))}
            <svg className="tt-links" width={TREE_LAYOUT.width} height={TREE_LAYOUT.height} aria-hidden="true">
              <defs>
                <filter id="tt-glow-c" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="tt-glow-a" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {edges.map(({ from, to }) => {
                const target = states[to];
                const focus = to === selected || from === selected;
                const kind = target === "recommended" ? "rec" : target === "built" ? "done" : target === "available" ? "open" : "lock";
                return <path key={`${from}-${to}`} className={`tt-l-${kind} ${focus ? "is-focus" : ""}`} d={edgePath(TREE_LAYOUT.positions[from], TREE_LAYOUT.positions[to])} />;
              })}
            </svg>
            {(Object.keys(TECH_NODES) as FacilityId[]).map((id) => {
              const pos = TREE_LAYOUT.positions[id];
              const facility = game.facilities[id];
              const state = states[id];
              return (
                <button
                  key={id}
                  type="button"
                  className={`tt-node is-${state} ${selected === id ? "is-selected" : ""}`}
                  style={{ left: pos.x, top: pos.y }}
                  onClick={() => pick(id)}
                  aria-pressed={selected === id}
                  aria-label={`${facility.name}, ${STATE_LABEL[state].replace("★ ", "")}${facility.level > 0 ? `, level ${facility.level}` : ""}`}
                >
                  <span className="tt-tag">{state === "built" ? `Lv ${facility.level}` : state === "researchable" ? `${getResearchCost(id)} RP` : STATE_LABEL[state]}</span>
                  <span className="tt-ic"><img className="pixel-icon" src={getFacilityArt(id)} alt="" width={36} height={36} draggable={false} /></span>
                  <span className="tt-node-txt"><b>{facility.name}</b><small>{state === "locked" ? "🔒 " : ""}{nodeSubtitle(facility)}</small></span>
                </button>
              );
            })}
          </div>
          <div className="tt-hud tt-legend" aria-hidden="true">
            <span><i className="tt-sw built" />Built</span><span><i className="tt-sw available" />Available</span><span><i className="tt-sw recommended" />Recommended</span><span><i className="tt-sw researchable" />Research</span><span><i className="tt-sw locked" />Locked</span>
            <span className="tt-hint">Drag to pan · scroll or pinch to zoom</span>
          </div>
          <button
            type="button"
            className="tt-hud tt-mini"
            aria-label="Minimap: click to move the view"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const wx = (event.clientX - rect.left - 4) / miniScale;
              const wy = (event.clientY - rect.top - 4) / miniScale;
              setCam((current) => (current ? clamp({ ...current, x: size.w / 2 - wx * current.k, y: size.h / 2 - wy * current.k }) : current));
            }}
          >
            <span className="tt-mini-cap">MAP</span>
            {(Object.keys(TECH_NODES) as FacilityId[]).map((id) => {
              const pos = TREE_LAYOUT.positions[id];
              return <i key={id} className={`tt-mini-node ${states[id]}`} style={{ left: pos.x * miniScale + 4, top: pos.y * miniScale + 4, width: NODE_W * miniScale, height: NODE_H * miniScale }} />;
            })}
            <span className="tt-mini-view" style={{ left: (-camera.x / camera.k) * miniScale + 4, top: (-camera.y / camera.k) * miniScale + 4, width: (size.w / camera.k) * miniScale, height: (size.h / camera.k) * miniScale }} />
          </button>
          <div className="tt-hud tt-zoom">
            <button type="button" className="secondary" onClick={() => zoomAt(1.2, size.w / 2, size.h / 2)} aria-label="Zoom in">+</button>
            <button type="button" className="secondary" onClick={() => zoomAt(1 / 1.2, size.w / 2, size.h / 2)} aria-label="Zoom out">−</button>
            <button type="button" className="secondary tt-fit" onClick={() => centerOn(selected)} aria-label="Center on the selected building">FIT</button>
          </div>
        </div>
        <DetailPanel
          game={game}
          id={selected}
          state={states[selected]}
          recommendation={recommendation}
          open={sheetOpen}
          mobile={mobile}
          onToggle={() => setSheetOpen((value) => !value)}
          onJump={jumpTo}
          onBuild={onBuild}
          onOpenFacility={onOpenFacility}
        />
      </div>
    </div>
  );
}

function nodeSubtitle(facility: GameState["facilities"][FacilityId]): string {
  const outputs = (Object.entries(facility.outputRate) as Array<[ResourceId, number]>);
  if (facility.id === "workerHousing") return "+15 workers";
  if (outputs.length === 0) return "+ storage";
  const [first, rate] = outputs[0];
  return first === "power" ? `+${rate} MW` : `${RESOURCE_DEFINITIONS[first].name} ${qty(rate)}/s`;
}

type DetailProps = {
  game: GameState;
  id: FacilityId;
  state: TreeNodeState;
  recommendation: Recommendation | null;
  open: boolean;
  mobile: boolean;
  onToggle: () => void;
  onJump: (id: FacilityId) => void;
  onBuild: (id: FacilityId, trigger?: HTMLElement | null) => void;
  onOpenFacility: (id: FacilityId) => void;
};

function DetailPanel({ game, id, state, recommendation, open, mobile, onToggle, onJump, onBuild, onOpenFacility }: DetailProps) {
  const facility = game.facilities[id];
  const node = TECH_NODES[id];
  const era = getEra(node.era);
  const cost = getFacilityUpgradeCost(facility);
  const shortfall = getShortfallLabel(game, id);
  const scale = Math.max(1, facility.level);
  const requirements = facility.unlockRequirements.map((requirement) => ({ ...requirement, have: game.facilities[requirement.facilityId].level }));
  const met = requirements.filter((requirement) => requirement.have >= requirement.level).length;
  const direct = TECH_DEPENDENTS[id];
  const second = [...new Set(direct.flatMap((child) => TECH_DEPENDENTS[child]))].filter((child) => !direct.includes(child));
  const enables = [...direct.map((child) => ({ child, far: false })), ...second.map((child) => ({ child, far: true }))].slice(0, mobile ? 3 : 5);
  const inputs = (Object.entries(facility.inputRate) as Array<[ResourceId, number]>);
  const outputs = (Object.entries(facility.outputRate) as Array<[ResourceId, number]>);
  const isRec = recommendation?.facilityId === id && state === "recommended";
  const stepsAway = facility.unlocked ? 0 : getStepsAway(game, id);
  const action = facility.level > 0 ? `Upgrade to Lv ${facility.level + 1}` : "Build";
  return (
    <aside className={`tt-side is-${state} ${open ? "is-open" : "is-closed"}`} aria-label={`${facility.name} details`}>
      <button type="button" className="tt-handle" onClick={onToggle} aria-label={open ? "Collapse details" : "Expand details"}><span /></button>
      <div className="tt-hero">
        <div className="tt-big"><img className="pixel-icon" src={getFacilityArt(id)} alt="" width={60} height={60} /></div>
        <div>
          <p className="eyebrow">Era {era.numeral} · {era.name}</p>
          <h2>{facility.name}</h2>
          <div className="tt-chips">
            <span className={`tt-chip is-${state}`}>{state === "recommended" ? "★ Recommended next" : state === "built" ? `Built · Lv ${facility.level}` : state === "available" ? "Available" : state === "researchable" ? `Research · ${getResearchCost(id)} RP` : stepsAway > 1 ? `Locked · ${stepsAway} steps away` : "Locked"}</span>
            <span className="tt-chip">{CATEGORY_META[node.category].label}</span>
          </div>
        </div>
      </div>
      <div className="tt-scroll">
        <div className={`tt-why ${isRec ? "is-rec" : ""}`}><b>{isRec ? "Why now: " : "Why build it: "}</b>{isRec ? recommendation!.reason : node.why}</div>
        <div className="tt-sec">
          <h4>Unlock requirements <span className={met === requirements.length ? "tt-ok" : ""}>{requirements.length === 0 ? "none" : `${met} / ${requirements.length} met`}</span></h4>
          {requirements.length === 0 && <p className="tt-muted">Available from the start of its era.</p>}
          {requirements.map((requirement) => (
            <button type="button" key={requirement.facilityId} className="tt-req" onClick={() => onJump(requirement.facilityId)}>
              <img className="pixel-icon" src={getFacilityArt(requirement.facilityId)} alt="" width={22} height={22} />
              {game.facilities[requirement.facilityId].name} Lv {requirement.level}
              <span className={requirement.have >= requirement.level ? "tt-ok" : "tt-no"}>{requirement.have >= requirement.level ? "✓ " : ""}{Math.min(requirement.have, requirement.level)}/{requirement.level}</span>
            </button>
          ))}
        </div>
        <div className="tt-sec">
          <h4>{facility.level > 0 ? "Upgrade cost" : "Build cost"} <span>Lv {facility.level + 1}</span></h4>
          <div className="tt-costs">
            <span className={`tt-res ${game.cash >= cost.cash ? "ok" : "no"}`}><img className="pixel-icon" src={getResourceArt("goldBar")} alt="" width={20} height={20} />{money(cost.cash)}<em>{game.cash >= cost.cash ? "✓" : money(game.cash)}</em></span>
            {(Object.entries(cost.materials) as Array<[ResourceId, number]>).map(([resourceId, amount]) => {
              const have = game.warehouses.central.inventory[resourceId]?.amount ?? 0;
              return <span key={resourceId} className={`tt-res ${have >= amount ? "ok" : "no"}`}><img className="pixel-icon" src={getResourceArt(resourceId)} alt="" width={20} height={20} />{qty(amount)} {RESOURCE_DEFINITIONS[resourceId].name}<em>{qty(Math.floor(have))}</em></span>;
            })}
          </div>
        </div>
        <div className="tt-sec">
          <h4>Production <span>per second, Lv {scale}</span></h4>
          <div className="tt-flow">
            <div>{inputs.length === 0 ? <span className="tt-res"><em>no inputs</em></span> : inputs.map(([resourceId, rate]) => <span key={resourceId} className="tt-res"><img className="pixel-icon" src={getResourceArt(resourceId)} alt="" width={20} height={20} />{RESOURCE_DEFINITIONS[resourceId].name}<em>{qty(rate * scale)}</em></span>)}</div>
            <div className="tt-arrow" aria-hidden="true">➜</div>
            <div>{outputs.length === 0 ? <span className="tt-res"><em>support</em></span> : outputs.map(([resourceId, rate]) => <span key={resourceId} className="tt-res out"><img className="pixel-icon" src={getResourceArt(resourceId)} alt="" width={20} height={20} />{RESOURCE_DEFINITIONS[resourceId].name}<em>{qty(rate * scale)}</em></span>)}</div>
          </div>
          <div className="tt-kv tt-hide-m"><div><small>Power use</small><b>{qty(facility.powerConsumption * scale)} MW</b></div><div><small>Workers</small><b>{facility.workersNeeded * scale}</b></div><div><small>Upkeep</small><b>{money(facility.baseUpkeep * scale)}/s</b></div></div>
        </div>
        {enables.length > 0 && (
          <div className="tt-sec">
            <h4>What this enables <span>{direct.length + second.length} buildings</span></h4>
            {enables.map(({ child, far }) => (
              <button type="button" key={child} className={`tt-en ${far ? "far" : ""}`} onClick={() => onJump(child)}>
                <img className="pixel-icon" src={getFacilityArt(child)} alt="" width={24} height={24} />
                <span>{game.facilities[child].name}<small>{TECH_NODES[child].why}</small></span>
                <em>{far ? "2 steps" : `at Lv ${game.facilities[child].unlockRequirements.find((requirement) => requirement.facilityId === id)?.level ?? 1}`}</em>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="tt-cta">
        {facility.unlocked ? (
          <button type="button" className={isRec ? "gold" : ""} disabled={Boolean(shortfall)} onClick={(event) => onBuild(id, event.currentTarget)}>
            {shortfall ?? `${action} · ${money(cost.cash)}`}
          </button>
        ) : isResearchable(game, id) ? (
          <button type="button" className={`tt-research ${isRec ? "gold" : ""}`} disabled={!canResearch(game, id)} onClick={(event) => onBuild(id, event.currentTarget)}>
            <RpIcon />{canResearch(game, id) ? `${shortfall ? "Research" : "Unlock & Build"} · ${getResearchCost(id)} RP` : `Need ${getResearchCost(id)} RP · you have ${Math.floor(game.progress.researchPoints)}`}
          </button>
        ) : !isEraOpen(game, TECH_NODES[id].era) ? (
          <button type="button" disabled>🔒 Era opens with "{getEraMilestone(TECH_NODES[id].era)?.name}"</button>
        ) : (
          <button type="button" disabled>Locked · {requirements.filter((requirement) => requirement.have < requirement.level).map((requirement) => `${game.facilities[requirement.facilityId].name} Lv ${requirement.level}`).join(" + ")}</button>
        )}
        <button type="button" className="secondary small tt-hide-m" onClick={() => onOpenFacility(id)}>Facility details</button>
      </div>
    </aside>
  );
}
