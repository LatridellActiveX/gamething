// The Build tab catalog: a "recommended next" banner, category tabs, and facility cards grouped
// by category with built / recommended / available / can't-afford / locked states.
import { useMemo, useState, type ReactNode } from "react";
import { getFacilityArt, getResourceArt } from "../assets/art";
import { getFacilityUpgradeCost } from "../game/engine";
import { RESOURCE_DEFINITIONS } from "../game/state/initialState";
import type { FacilityId, GameState, ResourceId } from "../game/state/types";
import { getCatalogState, getShortfallLabel, getStepsAway, getWatchList, type CatalogState, type Recommendation } from "../game/tech/catalog";
import { CATEGORY_META, CATEGORY_ORDER, TECH_NODES, getEra, type TechCategory } from "../game/tech/techTree";

type Facility = GameState["facilities"][FacilityId];
type CategoryFilter = "all" | TechCategory;

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
const qty = (value: number) => (Math.round(value * 100) / 100).toLocaleString();
const resName = (id: ResourceId) => RESOURCE_DEFINITIONS[id].name;
const STORAGE_BONUS: Partial<Record<FacilityId, number>> = { warehouse: 200, oreSilo: 300, liquidStorageTank: 300, gasGasholder: 300, hazardousVault: 200, highSecurityVault: 200, radioactiveVault: 200, cryogenicStorageTank: 200, megaWarehouseArray: 1000 };

/** One-line "what it does" summary, scaled to the facility's level (min 1). */
export function summarizeFacility(facility: Facility): string {
  const scale = Math.max(1, facility.level);
  const outs = (Object.entries(facility.outputRate) as Array<[ResourceId, number]>);
  const ins = (Object.entries(facility.inputRate) as Array<[ResourceId, number]>).filter(([id]) => id !== "power");
  const power = facility.outputRate.power ?? 0;
  const materialOuts = outs.filter(([id]) => id !== "power");
  const parts: string[] = [];
  if (facility.id === "workerHousing") parts.push(`+${15 * scale} workers`);
  else if (STORAGE_BONUS[facility.id]) parts.push(`+${STORAGE_BONUS[facility.id]! * scale} storage`);
  if (power > 0) parts.push(`+${qty(power * scale)} MW`);
  if (materialOuts.length > 0) {
    const out = materialOuts.map(([id, rate]) => `${resName(id)} ${qty(rate * scale)}/s`).join(", ");
    parts.push(ins.length > 0 ? `${ins.map(([id]) => resName(id)).join(" + ")} → ${out}` : out);
  } else if (ins.length > 0) {
    parts.push(`burns ${ins.map(([id, rate]) => `${qty(rate * scale)} ${resName(id)}/s`).join(", ")}`);
  }
  if (facility.powerConsumption > 0) parts.push(`uses ${qty(facility.powerConsumption * scale)} MW`);
  return parts.join(" · ");
}

type CardProps = {
  game: GameState;
  facility: Facility;
  status: CatalogState;
  flashKey?: number;
  onBuild: (id: FacilityId, trigger?: HTMLElement | null) => void;
  onSelect: (id: FacilityId) => void;
};

function FacilityCard({ game, facility, status, flashKey, onBuild, onSelect }: CardProps) {
  const cost = getFacilityUpgradeCost(facility);
  const shortfall = getShortfallLabel(game, facility.id);
  const era = getEra(TECH_NODES[facility.id].era);
  const badge = status === "recommended" ? "★ Recommended" : status === "locked" ? `🔒 Era ${era.numeral}` : facility.level > 0 ? `Lv ${facility.level}` : status === "unaffordable" ? "Can't afford" : "Available";
  const unmet = facility.unlockRequirements.map((requirement) => ({ ...requirement, have: game.facilities[requirement.facilityId]?.level ?? 0, name: game.facilities[requirement.facilityId]?.name ?? requirement.facilityId }));
  const stepsAway = status === "locked" ? getStepsAway(game, facility.id) : 0;
  const reqDone = unmet.reduce((total, requirement) => total + Math.min(requirement.level, requirement.have), 0);
  const reqTotal = unmet.reduce((total, requirement) => total + requirement.level, 0);
  const action = facility.level > 0 ? "Upgrade" : "Build";
  return (
    <article
      className={`bt-card is-${status} ${facility.level > 0 ? "is-owned" : ""} ${flashKey !== undefined ? "is-flashing" : ""}`}
      onClick={() => onSelect(facility.id)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(facility.id); } }}
      role="button"
      tabIndex={0}
      aria-label={`${facility.name}: ${badge}`}
    >
      <span className="bt-badge">{badge}</span>
      <span className="bt-ic"><img className="pixel-icon" src={getFacilityArt(facility.id)} alt="" width={40} height={40} /></span>
      <h4>{facility.name}</h4>
      <p className="bt-line">{summarizeFacility(facility)}</p>
      {flashKey !== undefined && <span key={`toast-${flashKey}`} className="levelup-toast" aria-hidden="true">{facility.level === 1 ? "Built!" : `Level ${facility.level}!`}</span>}
      {status === "locked" ? (
        <div className="bt-req">
          <span>{stepsAway > 1 ? `${stepsAway} steps away · ` : ""}Needs {unmet.filter((requirement) => requirement.have < requirement.level).map((requirement) => `${requirement.name} Lv ${requirement.level}`).join(" + ") || "earlier buildings"}</span>
          <div className="bt-req-row"><span className="bt-req-meter"><i style={{ width: `${reqTotal ? (reqDone / reqTotal) * 100 : 0}%` }} /></span>{reqDone} / {reqTotal}</div>
        </div>
      ) : (
        <div className="bt-foot">
          <span className={`bt-pill ${game.cash >= cost.cash ? "ok" : "no"}`}><img className="pixel-icon" src={getResourceArt("goldBar")} alt="" width={14} height={14} />{money(cost.cash)}</span>
          {(Object.entries(cost.materials) as Array<[ResourceId, number]>).map(([resourceId, amount]) => {
            const have = game.warehouses.central.inventory[resourceId]?.amount ?? 0;
            return <span key={resourceId} className={`bt-pill ${have >= amount ? "ok" : "no"}`} title={`${resName(resourceId)}: need ${qty(amount)}, have ${qty(have)}`}><img className="pixel-icon" src={getResourceArt(resourceId)} alt="" width={14} height={14} />{qty(amount)}{have < amount ? ` (${qty(have)})` : ""}</span>;
          })}
          <button
            type="button"
            className={`small bt-action ${status === "recommended" ? "gold" : ""} ${shortfall ? "is-short" : ""}`}
            disabled={Boolean(shortfall)}
            onClick={(event) => { event.stopPropagation(); onBuild(facility.id, event.currentTarget); }}
            title={shortfall ? `${shortfall} to ${action.toLowerCase()} ${facility.name}` : `${action} ${facility.name}`}
          >{shortfall ?? action}</button>
        </div>
      )}
    </article>
  );
}

export type BuildCatalogProps = {
  game: GameState;
  recommendation: Recommendation | null;
  flashKeys: Partial<Record<FacilityId, number>>;
  onBuild: (id: FacilityId, trigger?: HTMLElement | null) => void;
  onSelect: (id: FacilityId) => void;
  /** Rendered after the catalog sections (the operations map). */
  map?: ReactNode;
  /** Extra side-column panels (guide, tech tree link). */
  side?: ReactNode;
  /** Extra banner actions. */
  bannerExtra?: ReactNode;
  bannerEyebrow?: ReactNode;
};

export function BuildCatalog({ game, recommendation, flashKeys, onBuild, onSelect, map, side, bannerExtra, bannerEyebrow }: BuildCatalogProps) {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [showLocked, setShowLocked] = useState(true);
  const [expanded, setExpanded] = useState<Partial<Record<TechCategory, boolean>>>({});
  const recommendedId = recommendation?.facilityId ?? null;
  const facilities = Object.values(game.facilities);
  const currentEra = Math.max(1, ...facilities.filter((facility) => facility.unlocked).map((facility) => TECH_NODES[facility.id].era));

  const groups = useMemo(() => CATEGORY_ORDER.map((category) => {
    const members = facilities
      .filter((facility) => TECH_NODES[facility.id].category === category)
      .map((facility) => ({ facility, status: getCatalogState(game, facility.id, recommendedId) }))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || TECH_NODES[a.facility.id].era - TECH_NODES[b.facility.id].era || (a.status === "locked" ? getStepsAway(game, a.facility.id) - getStepsAway(game, b.facility.id) : 0) || a.facility.upgrade.base.cash - b.facility.upgrade.base.cash);
    // Locked buildings close to unlocking stay visible; the rest fold into a summary row.
    const near = (entry: (typeof members)[number]) => entry.status !== "locked" || (TECH_NODES[entry.facility.id].era <= currentEra + 1 && getStepsAway(game, entry.facility.id) <= 1);
    return { category, members, visible: members.filter(near), folded: members.filter((entry) => !near(entry)) };
  }), [game, recommendedId, currentEra]);

  const recommended = recommendedId ? game.facilities[recommendedId] : null;
  const recommendedShortfall = recommendedId ? getShortfallLabel(game, recommendedId) : null;
  const watch = getWatchList(game);

  return (
    <div className="bt-root">
      {recommendation && recommended && (
        <section className="panel bt-banner" aria-label="Recommended next build">
          <div className="bt-banner-icon"><img className="pixel-icon" src={getFacilityArt(recommended.id)} alt="" width={64} height={64} /></div>
          <div className="bt-banner-copy">
            <p className="eyebrow bt-amber">{bannerEyebrow ?? "Recommended next"}</p>
            <h2>{recommendation.title.split(recommended.name)[0]}<span className="bt-amber">{recommended.name}</span>{recommendation.title.split(recommended.name)[1] ?? ""}</h2>
            <p className="bt-banner-reason">{recommendation.reason}</p>
            {bannerExtra}
          </div>
          <div className="bt-banner-actions">
            <button type="button" className="gold" disabled={Boolean(recommendedShortfall)} onClick={(event) => onBuild(recommended.id, event.currentTarget)}>
              {recommendedShortfall ?? `${recommended.level > 0 ? "Upgrade" : "Build"} · ${money(getFacilityUpgradeCost(recommended).cash)}`}
            </button>
            <button type="button" className="secondary small" onClick={() => onSelect(recommended.id)}>Details</button>
          </div>
        </section>
      )}
      <div className="bt-layout">
        <div className="bt-main">
          <div className="bt-cats" role="tablist" aria-label="Facility categories">
            <button type="button" role="tab" aria-selected={filter === "all"} className={`bt-cat ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>
              <img className="pixel-icon" src={getFacilityArt("factory")} alt="" width={22} height={22} />All<small>{facilities.filter((facility) => facility.level > 0).length} / {facilities.length}</small>
            </button>
            {groups.map(({ category, members }) => (
              <button key={category} type="button" role="tab" aria-selected={filter === category} className={`bt-cat ${filter === category ? "on" : ""}`} onClick={() => setFilter(category)}>
                <img className="pixel-icon" src={categoryArt(category)} alt="" width={22} height={22} />{CATEGORY_META[category].label}
                {members.some((entry) => entry.status === "recommended") && <span className="bt-dot" aria-label="recommended" />}
                <small>{members.filter((entry) => entry.facility.level > 0).length} / {members.length}</small>
              </button>
            ))}
            <label className="bt-toggle"><input type="checkbox" checked={showLocked} onChange={(event) => setShowLocked(event.target.checked)} />Show locked</label>
          </div>
          {groups.filter(({ category }) => filter === "all" || filter === category).map(({ category, members, visible, folded }) => {
            const isOpen = expanded[category] || filter === category;
            const shown = (isOpen ? members : visible).filter((entry) => showLocked || entry.status !== "locked");
            const hidden = isOpen ? [] : folded;
            const built = members.filter((entry) => entry.facility.level > 0).length;
            const hasRec = members.some((entry) => entry.status === "recommended");
            return (
              <section key={category} className="panel bt-section" aria-label={CATEGORY_META[category].label}>
                <div className="bt-sh">
                  <img className="pixel-icon" src={categoryArt(category)} alt="" width={30} height={30} />
                  <div className="bt-sh-copy"><h3>{CATEGORY_META[category].label}{hasRec && <span className="bt-badge-inline">★ Next step here</span>}</h3><p className="bt-sub">{CATEGORY_META[category].blurb}</p></div>
                  <div className="bt-meter">{built} of {members.length} built<span><i style={{ width: `${(built / members.length) * 100}%` }} /></span></div>
                </div>
                <div className="bt-cards">
                  {shown.map(({ facility, status }) => <FacilityCard key={facility.id} game={game} facility={facility} status={status} flashKey={flashKeys[facility.id]} onBuild={onBuild} onSelect={onSelect} />)}
                  {showLocked && hidden.length > 0 && (
                    <div className="bt-folded">
                      <span className="bt-faces">{hidden.slice(0, 4).map(({ facility }) => <img key={facility.id} className="pixel-icon" src={getFacilityArt(facility.id)} alt="" width={24} height={24} />)}</span>
                      <span><b>{hidden.length} more</b> {CATEGORY_META[category].label.toLowerCase()} buildings unlock later ({hidden.slice(0, 3).map(({ facility }) => facility.name).join(", ")}{hidden.length > 3 ? "…" : ""})</span>
                      <button type="button" className="secondary small" onClick={() => setExpanded((current) => ({ ...current, [category]: true }))}>Expand</button>
                    </div>
                  )}
                  {filter === "all" && expanded[category] && (
                    <button type="button" className="secondary small bt-collapse" onClick={() => setExpanded((current) => ({ ...current, [category]: false }))}>Collapse</button>
                  )}
                </div>
              </section>
            );
          })}
          {map}
        </div>
        <aside className="bt-side">
          {side}
          <section className="panel bt-watch" aria-label="Building materials">
            <p className="eyebrow">Watch list</p>
            <h3>Building materials</h3>
            {watch.map((row) => (
              <div key={row.resourceId} className="bt-watch-row">
                <span><img className="pixel-icon" src={getResourceArt(row.resourceId)} alt="" width={18} height={18} />{row.name}</span>
                <b className={row.warn ? "bt-amber" : ""}>{qty(Math.floor(row.amount))}{row.warn ? ` · ${row.warn}` : ` · ${row.rate >= 0 ? "+" : ""}${qty(row.rate)}/s`}</b>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

const STATUS_ORDER: Record<CatalogState, number> = { recommended: 0, built: 1, available: 2, unaffordable: 3, locked: 4 };

function categoryArt(category: TechCategory): string {
  const icon = CATEGORY_META[category].icon;
  if (category === "storage") return getFacilityArt("warehouse");
  return getResourceArt(icon);
}
