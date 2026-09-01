import { useEffect, useMemo, useRef, useState } from "react";
import { INITIAL_GAME_STATE, RESOURCE_DEFINITIONS } from "./game/state/initialState";
import { exportSave, importSave, loadGame, resetSave, saveGame } from "./game/state/storage";
import type { FacilityId, GameState, ResourceDefinition, ResourceId } from "./game/state/types";
import {
  applyOfflineProgress,
  computeFinancials,
  computeWarehouseSummary,
  getFacilityUpgradeCost,
  getNetResourceRate,
  getResourcePrice,
  purchaseResource,
  sellResource,
  tickGameState,
  toggleFacility,
  upgradeFacility,
  updateFacilityUnlocks,
} from "./game/engine";

const TAB_ITEMS = [
  { id: "dashboard", label: "Operations Console" },
  { id: "facilities", label: "Facilities" },
  { id: "warehouse", label: "Warehouse" },
  { id: "market", label: "Market" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TAB_ITEMS)[number]["id"];
type WarehouseFilter = "all" | Exclude<ResourceDefinition["category"], "energy">;
type FacilityCatalogFilter = "all" | "tier-1" | "tier-2" | "tier-3" | "tier-4" | "tier-5";
type ResourceRow = {
  resourceId: ResourceId;
  name: string;
  amount: number;
  rate: number;
  price: number;
  category: Exclude<ResourceDefinition["category"], "energy">;
  unit: string;
};

const WAREHOUSE_CATEGORY_ORDER: Array<Exclude<ResourceDefinition["category"], "energy">> = ["raw", "refined", "component", "advanced", "hightech", "construction", "consumer"];
const CATEGORY_LABELS: Record<WarehouseFilter, string> = {
  all: "All resources",
  raw: "Raw materials",
  refined: "Refined goods",
  component: "Components",
  advanced: "Advanced systems",
  hightech: "High-tech outputs",
  construction: "Construction supplies",
  consumer: "Consumer goods",
};
const FACILITY_FILTERS: Array<{ value: FacilityCatalogFilter; label: string }> = [
  { value: "all", label: "All tiers" },
  { value: "tier-1", label: "Tier 1" },
  { value: "tier-2", label: "Tier 2" },
  { value: "tier-3", label: "Tier 3" },
  { value: "tier-4", label: "Tier 4" },
  { value: "tier-5", label: "Tier 5" },
];
const FACILITY_TIER_LABELS: Record<number, string> = {
  1: "Tier 1 · Extraction & utilities",
  2: "Tier 2 · Primary processing",
  3: "Tier 3 · Component fabrication",
  4: "Tier 4 · Advanced manufacturing",
  5: "Tier 5 · Frontier projects",
};

const formatMoney = (value: number) => `$${Math.round(value).toLocaleString()}`;
const formatRate = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}/s`;
const formatQuantity = (value: number) => (Math.round(value * 100) / 100).toLocaleString();
const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}m ${String(safeSeconds % 60).padStart(2, "0")}s`;
};

function App() {
  const [game, setGame] = useState<GameState>(() => {
    try {
      return applyOfflineProgress(loadGame(), Date.now());
    } catch {
      return structuredClone(INITIAL_GAME_STATE);
    }
  });
  const [tab, setTab] = useState<TabId>("dashboard");
  const [importText, setImportText] = useState("");
  const [upgradeNotice, setUpgradeNotice] = useState("Factories online and ready.");
  const [selectedFacilityId, setSelectedFacilityId] = useState<FacilityId | null>(null);
  const [facilityCategory, setFacilityCategory] = useState<FacilityCatalogFilter>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<WarehouseFilter>("all");
  const [collapsedTiers, setCollapsedTiers] = useState<Record<number, boolean>>({});
  const [log, setLog] = useState<string[]>([
    "System online. Industrial Frontier booted.",
    "Power network and logistics are operating in nominal state.",
  ]);
  const gameRef = useRef<GameState>(game);

  useEffect(() => {
    gameRef.current = game;
    (window as typeof window & { __gameDebug?: { getState: () => GameState; tick: () => void } }).__gameDebug = {
      getState: () => gameRef.current,
      tick: () => {
        const next = tickGameState(structuredClone(gameRef.current), 1);
        gameRef.current = next;
        setGame({ ...next });
      },
    };
  }, [game]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = tickGameState(structuredClone(gameRef.current), 1);
      gameRef.current = next;
      setGame({ ...next });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = structuredClone(gameRef.current);
      next.lastSavedTimestamp = Date.now();
      gameRef.current = next;
      setGame({ ...next });
      saveGame(next);
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const resourceRows = useMemo<ResourceRow[]>(() => (Object.keys(RESOURCE_DEFINITIONS) as ResourceId[])
    .filter((resourceId) => resourceId !== "power")
    .map((resourceId) => ({
      resourceId,
      name: RESOURCE_DEFINITIONS[resourceId].name,
      amount: game.warehouses.central.inventory[resourceId]?.amount ?? 0,
      rate: getNetResourceRate(game, resourceId),
      price: getResourcePrice(resourceId),
      category: RESOURCE_DEFINITIONS[resourceId].category as Exclude<ResourceDefinition["category"], "energy">,
      unit: RESOURCE_DEFINITIONS[resourceId].unit,
    }))
    .sort((a, b) => WAREHOUSE_CATEGORY_ORDER.indexOf(a.category) - WAREHOUSE_CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name)), [game]);

  const filteredResourceRows = useMemo(() => resourceRows.filter((row) => warehouseFilter === "all" || row.category === warehouseFilter), [resourceRows, warehouseFilter]);
  const warehouseGroups = useMemo(() => WAREHOUSE_CATEGORY_ORDER.map((category) => ({ category, rows: filteredResourceRows.filter((row) => row.category === category) })).filter((group) => group.rows.length > 0), [filteredResourceRows]);
  const storage = useMemo(() => computeWarehouseSummary(game), [game]);
  const powerBalance = useMemo(() => ({ production: game.power.productionPerSecond, consumption: game.power.consumptionPerSecond, surplus: game.power.productionPerSecond - game.power.consumptionPerSecond }), [game]);
  const financials = useMemo(() => computeFinancials(structuredClone(game)), [game]);
  const builtFacilities = useMemo(() => Object.values(game.facilities).filter((facility) => facility.level > 0).sort((a, b) => b.level - a.level || a.tier - b.tier || a.name.localeCompare(b.name)), [game]);
  const catalogFacilities = useMemo(() => Object.values(game.facilities).filter((facility) => facilityCategory === "all" || facility.tier === Number(facilityCategory.split("-")[1])).sort((a, b) => a.tier - b.tier || Number(b.unlocked) - Number(a.unlocked) || b.level - a.level || a.name.localeCompare(b.name)), [game, facilityCategory]);
  const facilitySections = useMemo(() => [1, 2, 3, 4, 5].map((tier) => ({ tier, facilities: catalogFacilities.filter((facility) => facility.tier === tier) })).filter((section) => section.facilities.length > 0), [catalogFacilities]);
  const addLog = (entry: string) => setLog((current) => [entry, ...current].slice(0, 8));

  const handleUpgrade = (facilityId: FacilityId) => {
    const current = structuredClone(gameRef.current);
    const currentLevel = current.facilities[facilityId].level;
    const next = upgradeFacility(current, facilityId);
    updateFacilityUnlocks(next);
    if (next.facilities[facilityId].level === currentLevel) {
      setUpgradeNotice(`${current.facilities[facilityId].name} cannot be upgraded yet.`);
      addLog(`${current.facilities[facilityId].name} upgrade blocked: insufficient funds or materials.`);
      return;
    }
    gameRef.current = next;
    setGame(next);
    setUpgradeNotice(`${next.facilities[facilityId].name} upgraded to level ${next.facilities[facilityId].level}.`);
    addLog(`${next.facilities[facilityId].name} upgraded to level ${next.facilities[facilityId].level}.`);
  };

  const handleToggle = (facilityId: FacilityId) => {
    const next = toggleFacility(structuredClone(gameRef.current), facilityId);
    gameRef.current = next;
    setGame(next);
    addLog(`${next.facilities[facilityId].name} ${next.facilities[facilityId].active ? "activated" : "paused"}.`);
  };

  const handleSell = (resourceId: ResourceId, quantity: number) => {
    const current = structuredClone(gameRef.current);
    const startingAmount = current.warehouses.central.inventory[resourceId]?.amount ?? 0;
    const next = sellResource(current, resourceId, quantity);
    const sold = Math.max(0, startingAmount - (next.warehouses.central.inventory[resourceId]?.amount ?? 0));
    if (sold <= 0) return;
    gameRef.current = next;
    setGame(next);
    addLog(`Sold ${formatQuantity(sold)} ${RESOURCE_DEFINITIONS[resourceId].name} for ${formatMoney(sold * getResourcePrice(resourceId))}.`);
  };
  const handleBuy = (resourceId: ResourceId, quantity: number) => {
    const current = structuredClone(gameRef.current);
    const startingAmount = current.warehouses.central.inventory[resourceId]?.amount ?? 0;
    const next = purchaseResource(current, resourceId, quantity);
    const bought = Math.max(0, (next.warehouses.central.inventory[resourceId]?.amount ?? 0) - startingAmount);
    if (bought <= 0) {
      addLog(`Market purchase failed for ${RESOURCE_DEFINITIONS[resourceId].name}: insufficient cash or storage.`);
      return;
    }
    gameRef.current = next;
    setGame(next);
    setUpgradeNotice(`Purchased ${formatQuantity(bought)} ${RESOURCE_DEFINITIONS[resourceId].name}.`);
    addLog(`Bought ${formatQuantity(bought)} ${RESOURCE_DEFINITIONS[resourceId].name} for ${formatMoney(bought * getResourcePrice(resourceId) * 1.2)}.`);
  };

  const handleExport = async () => {
    await navigator.clipboard.writeText(exportSave(gameRef.current));
    addLog("Current save exported to clipboard.");
  };

  const handleImport = () => {
    try {
      const parsed = importSave(importText);
      setGame(parsed);
      gameRef.current = parsed;
      addLog("Import successful. Save loaded.");
    } catch {
      addLog("Import failed: invalid save payload.");
    }
  };

  const handleReset = () => {
    const fresh = resetSave();
    setGame(fresh);
    gameRef.current = fresh;
    addLog("Save reset to the starter state.");
  };

  const toggleTierCollapse = (tier: number) => setCollapsedTiers((current) => ({ ...current, [tier]: !current[tier] }));
  const selectedFacility = selectedFacilityId ? game.facilities[selectedFacilityId] : null;
  const selectedCost = selectedFacility ? getFacilityUpgradeCost(selectedFacility) : null;
  const selectedHasMaterials = Boolean(selectedFacility && selectedCost && Object.entries(selectedCost.materials).every(([resourceId, amount]) => (game.warehouses.central.inventory[resourceId as ResourceId]?.amount ?? 0) >= (amount ?? 0)));
  const selectedCanAfford = Boolean(selectedFacility && selectedCost && game.cash >= selectedCost.cash && selectedHasMaterials);

  const renderDashboard = () => (
    <div className="panel-grid">
      <section className="panel wide">
        <div className="panel-header"><div><p className="eyebrow">Overview</p><h2>Factory performance</h2></div><span className="status-banner">{upgradeNotice}</span></div>
        <div className="kpis">
          <div className="kpi"><span>Cash</span><strong>{formatMoney(game.cash)}</strong></div>
          <div className="kpi accent-green"><span>Live Power</span><strong>{powerBalance.production.toFixed(1)} MW</strong></div>
          <div className="kpi accent-orange"><span>Capacity Used</span><strong>{storage.used.toFixed(0)} / {storage.capacity}</strong></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Power grid</p><h2>Balance</h2></div></div>
        <div className="metric-list">
          <div className="metric-row"><span>Production</span><strong className="positive">{formatRate(powerBalance.production)}</strong></div>
          <div className="metric-row"><span>Consumption</span><strong className="danger">{formatRate(powerBalance.consumption)}</strong></div>
          <div className="metric-row"><span>Grid surplus</span><strong className={powerBalance.surplus >= 0 ? "positive" : "danger"}>{powerBalance.surplus >= 0 ? "+" : ""}{powerBalance.surplus.toFixed(1)} MW</strong></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Finance</p><h2>Financials</h2></div></div>
        <div className="metric-list">
          <div className="metric-row"><span>Current Cash</span><strong>{formatMoney(game.cash)}</strong></div>
          <div className="metric-row"><span>Facility Upkeep</span><strong className="danger">-{formatMoney(financials.upkeep)} / sec</strong></div>
          <div className="metric-row"><span>Labor Wages</span><strong className="danger">-{formatMoney(financials.wages)} / sec</strong></div>
          <div className="metric-row"><span>Net Cash Flow</span><strong className={financials.net > 0 ? "positive" : "danger"}>{financials.net > 0 ? "+" : "-"}{formatMoney(Math.abs(financials.net))} / sec</strong></div>
          <div className="metric-row"><span>Runway</span><strong>{financials.net >= 0 ? "Infinity" : formatDuration(game.cash / Math.abs(financials.net))}</strong></div>
        </div>
      </section>
      <section className="panel wide">
        <div className="panel-header"><div><p className="eyebrow">Operations</p><h2>Latest events</h2></div></div>
        <div className="log-console">{log.map((entry) => <div key={entry} className="log-line">{entry}</div>)}</div>
      </section>
    </div>
  );

  const renderFacilities = () => (
    <div className="facility-sections">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Operations map</p><h2>Built facilities</h2></div><span className="muted">{builtFacilities.length} built assets</span></div>
        <div className="facility-map">
          {builtFacilities.map((facility) => (
            <button key={facility.id} className={`map-node ${facility.active ? "active" : "inactive"}`} onClick={() => setSelectedFacilityId(facility.id)} type="button">
              <span className="map-node-light" />
              <strong>{facility.name}</strong>
              <small>LV {facility.level} · T{facility.tier} · {facility.active ? "ACTIVE" : "OFFLINE"}</small>
            </button>
          ))}
          {builtFacilities.length === 0 && <p className="muted">No facilities built. Use the catalog below to deploy your first assets.</p>}
        </div>
      </section>
      <section>
        <div className="panel-header catalog-header"><div><p className="eyebrow">Construction catalog</p><h2>All facilities</h2></div><span className="muted">Filter and expand tiers to manage the full catalog</span></div>
        <div className="pill-list" style={{ marginBottom: 16 }}>
          {FACILITY_FILTERS.map((filter) => <button key={filter.value} className={`small ${facilityCategory === filter.value ? "" : "secondary"}`} onClick={() => setFacilityCategory(filter.value)} type="button">{filter.label}</button>)}
        </div>
        <div className="facility-sections">
          {facilitySections.map(({ tier, facilities }) => {
            const isCollapsed = collapsedTiers[tier] ?? false;
            return (
              <section className="panel" key={tier}>
                <div className="panel-header"><div><p className="eyebrow">Tier {tier}</p><h2>{FACILITY_TIER_LABELS[tier] ?? `Tier ${tier}`}</h2></div><button className="secondary small" onClick={() => toggleTierCollapse(tier)} type="button">{isCollapsed ? "Expand" : "Collapse"} · {facilities.length}</button></div>
                {!isCollapsed && <div className="facility-grid">{facilities.map((facility) => {
                  const cost = getFacilityUpgradeCost(facility);
                  const statusClass = facility.status === "online" ? "good" : facility.status === "starved" ? "bad" : facility.status === "storage-full" ? "warn" : "muted";
                  const hasMaterials = Object.entries(cost.materials).every(([resourceId, amount]) => (game.warehouses.central.inventory[resourceId as ResourceId]?.amount ?? 0) >= (amount ?? 0));
                  const canAfford = game.cash >= cost.cash && hasMaterials;
                  const unlockProgress = facility.unlockRequirements.map((requirement) => ({ ...requirement, currentLevel: game.facilities[requirement.facilityId]?.level ?? 0, facilityName: game.facilities[requirement.facilityId]?.name ?? requirement.facilityId }));
                  return (
                    <article key={facility.id} className="facility-card selectable" onClick={() => setSelectedFacilityId(facility.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedFacilityId(facility.id); }} role="button" tabIndex={0}>
                      <div className="facility-topline"><div><p className="eyebrow">Tier {facility.tier}</p><h3>{facility.name}</h3></div><div className="facility-badges"><span className="badge level-badge">Lv {facility.level}</span><span className={`badge ${statusClass}`}>{facility.status}</span></div></div>
                      <div className="facility-meta"><span>{facility.level === 0 ? "Not built" : `Level ${facility.level}`}</span><span>{facility.unlocked ? facility.active ? "Running" : "Paused" : "Locked"}</span></div>
                      {!facility.unlocked && unlockProgress.length > 0 && <div className="requirement-list unlock-requirements"><label>Unlock requirements</label><div className="pill-list">{unlockProgress.map((requirement) => <span key={`${facility.id}-${requirement.facilityId}`} className={`pill ${requirement.currentLevel >= requirement.level ? "green" : "muted"}`}>{requirement.facilityName} Lv {requirement.level} ({requirement.currentLevel}/{requirement.level})</span>)}</div></div>}
                      <div className="requirement-list"><label>{facility.level === 0 ? "Build requirements" : "Next upgrade requirements"}</label><div className="pill-list"><span className={`pill ${game.cash >= cost.cash ? "green" : "muted"}`}>Cash: {formatMoney(cost.cash)}</span>{Object.entries(cost.materials).map(([resourceId, amount]) => <span key={resourceId} className={`pill ${(game.warehouses.central.inventory[resourceId as ResourceId]?.amount ?? 0) >= (amount ?? 0) ? "green" : "muted"}`}>{RESOURCE_DEFINITIONS[resourceId as ResourceId].name}: {formatQuantity(amount ?? 0)}</span>)}<span className="pill">Workers: {facility.workersNeeded * Math.max(1, facility.level)}</span><span className="pill">Upkeep: {formatMoney(facility.baseUpkeep * Math.max(1, facility.level))}/s</span></div></div>
                      <div className="small-grid"><div><label>Inputs</label><div className="pill-list">{Object.entries(facility.inputRate).length === 0 ? <span className="pill muted">None</span> : Object.entries(facility.inputRate).map(([resourceId, rate]) => <span key={resourceId} className="pill">{RESOURCE_DEFINITIONS[resourceId as ResourceId].name}: {rate.toFixed(2)}/s</span>)}</div></div><div><label>Outputs</label><div className="pill-list">{Object.entries(facility.outputRate).length === 0 ? <span className="pill muted">None</span> : Object.entries(facility.outputRate).map(([resourceId, rate]) => <span key={resourceId} className="pill green">{RESOURCE_DEFINITIONS[resourceId as ResourceId].name}: {rate.toFixed(2)}/s</span>)}</div></div></div>
                      <div className="facility-actions"><button className="secondary" onClick={(event) => { event.stopPropagation(); handleToggle(facility.id); }} disabled={!facility.unlocked || facility.level === 0}>Power: {facility.active ? "ON" : "OFF"}</button><button onClick={(event) => { event.stopPropagation(); handleUpgrade(facility.id); }} disabled={!facility.unlocked || !canAfford} title={!facility.unlocked ? "Complete the unlock requirements" : !canAfford ? "Need the listed cash and materials" : `Upgrade ${facility.name}`}>{!facility.unlocked ? "Locked • See requirements" : facility.level === 0 && canAfford ? `Build • ${formatMoney(cost.cash)}` : canAfford ? `Upgrade • ${formatMoney(cost.cash)}` : "Need listed requirements"}</button></div>
                    </article>
                  );
                })}</div>}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderWarehouse = () => (
    <div className="panel-grid single">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Warehouse controls</p><h2>Inventory by category</h2></div><span className="muted">{storage.used.toFixed(0)} / {storage.capacity} used</span></div>
        <div className="pill-list" style={{ marginBottom: 16 }}>
          {(["all", ...WAREHOUSE_CATEGORY_ORDER] as WarehouseFilter[]).map((filter) => <button key={filter} className={`small ${warehouseFilter === filter ? "" : "secondary"}`} onClick={() => setWarehouseFilter(filter)} type="button">{CATEGORY_LABELS[filter]}</button>)}
        </div>
        {warehouseGroups.map(({ category, rows }) => (
          <div key={category} style={{ marginBottom: 24 }}>
            <div className="panel-header"><div><p className="eyebrow">{CATEGORY_LABELS[category]}</p><h2>{rows.length} tracked items</h2></div></div>
            <div className="table-shell">
              <table className="warehouse-table">
                <thead><tr><th>Resource</th><th>Stock</th><th>Rate</th><th>Capacity</th><th>Sell</th></tr></thead>
                <tbody>
                  {rows.map(({ resourceId, name, amount, rate, price, unit }) => {
                    const stockPercent = storage.capacity === 0 ? 0 : (amount / storage.capacity) * 100;
                    return (
                      <tr key={resourceId}>
                        <td><div className="resource-name"><span>{name}</span><small>{unit}</small></div></td>
                        <td><span key={`${resourceId}-${amount}`} className="stock-value">{formatQuantity(amount)}</span></td>
                        <td className={rate >= 0 ? "positive" : "danger"}>{formatRate(rate)}</td>
                        <td><div className="progress-wrap"><div className="progress-bar"><span style={{ width: `${Math.min(stockPercent, 100)}%` }} /></div></div></td>
                        <td><div className="sell-group"><button className="small" onClick={() => handleSell(resourceId, 25)}>Sell 25</button><button className="small secondary" onClick={() => handleSell(resourceId, amount)}>Sell All</button></div><small className="muted">{formatMoney(price)}/unit</small></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderMarket = () => (
    <div className="panel-grid single">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Market</p><h2>Buy & sell</h2></div><span className="muted">Using {CATEGORY_LABELS[warehouseFilter]} filter</span></div>
        <div className="market-list">
          {filteredResourceRows.map(({ resourceId, name, amount, price }) => (
            <div key={resourceId} className="market-item">
              <div><strong>{name}</strong><span>{formatQuantity(amount)} on hand</span></div>
              <div className="market-actions">
                <button className="small" onClick={() => handleBuy(resourceId, 25)}>Buy 25 • {formatMoney(price * 25 * 1.2)}</button>
                <button className="small secondary" onClick={() => handleSell(resourceId, Math.max(10, Math.round(amount * 0.25)))}>Sell {formatMoney(price * Math.max(10, Math.round(amount * 0.25)))}</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderSettings = () => (
    <div className="panel-grid single">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Save controls</p><h2>Management</h2></div></div>
        <div className="settings-stack">
          <button onClick={handleExport}>Export Save</button>
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste a save JSON here to import..." />
          <button className="secondary" onClick={handleImport}>Import Save</button>
          <button className="danger" onClick={handleReset}>Reset Save</button>
        </div>
      </section>
    </div>
  );

  const renderActivePage = () => {
    const pageContent = (() => {
      switch (tab) {
        case "dashboard": return renderDashboard();
        case "facilities": return renderFacilities();
        case "warehouse": return renderWarehouse();
        case "market": return renderMarket();
        case "settings": return renderSettings();
      }
    })();
    return <section className="tab-page" key={tab} aria-label={`${tab} page`}>{pageContent}</section>;
  };

  const isConsolePage = tab === "dashboard";

  return (
    <div className="app-shell">
      {isConsolePage && (
        <header className="topbar">
          <div className="brand-wrap"><div className="brand-mark">IF</div><div><p className="eyebrow">Industrial Frontier</p><h1>Operations Console</h1></div></div>
          <div className="topbar-stats">
            <div className="mini-stat"><span>Cash</span><strong>{formatMoney(game.cash)}</strong></div>
            <div className="mini-stat"><span>Power</span><strong>{powerBalance.production.toFixed(0)} / {powerBalance.consumption.toFixed(0)} MW</strong></div>
            <div className="mini-stat"><span>Warehouse Used</span><strong>{storage.used.toFixed(0)} / {storage.capacity}</strong></div>
            <div className="mini-stat"><span>Workforce</span><strong>{game.workforce.activeDemand} / {game.workforce.capacity}</strong></div>
          </div>
        </header>
      )}
      <main className="content-shell">{renderActivePage()}</main>
      <nav className="mobile-tabbar" aria-label="Main navigation">
        {TAB_ITEMS.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setSelectedFacilityId(null); setTab(item.id); }} type="button">{item.label}</button>
        ))}
      </nav>
      {selectedFacility && selectedCost && (
        <div className="facility-modal-backdrop" onClick={() => setSelectedFacilityId(null)}>
          <section className="facility-modal" role="dialog" aria-modal="true" aria-labelledby="facility-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header"><div><p className="eyebrow">Facility control</p><h2 id="facility-modal-title">{selectedFacility.name}</h2></div><button className="secondary modal-close" onClick={() => setSelectedFacilityId(null)} aria-label="Close facility controls">Close</button></div>
            <div className="facility-modal-status"><span className={`badge ${selectedFacility.active ? "good" : "muted"}`}>{selectedFacility.active ? "POWER ON" : "POWER OFF"}</span><span className="muted">Tier {selectedFacility.tier} · {selectedFacility.level === 0 ? "Not built" : `Level ${selectedFacility.level}`}</span></div>
            <div className="metric-list">
              <div className="metric-row"><span>Power demand</span><strong>{selectedFacility.powerConsumption * selectedFacility.level} MW</strong></div>
              <div className="metric-row"><span>Workers required</span><strong>{selectedFacility.workersNeeded * selectedFacility.level}</strong></div>
              <div className="metric-row"><span>Operating upkeep</span><strong>{formatMoney(selectedFacility.baseUpkeep * selectedFacility.level)} / sec</strong></div>
              <div className="metric-row"><span>Current status</span><strong>{selectedFacility.status}</strong></div>
            </div>
            {!selectedFacility.unlocked && selectedFacility.unlockRequirements.length > 0 && <div className="requirement-list"><label>Unlock requirements</label><div className="pill-list">{selectedFacility.unlockRequirements.map((requirement) => <span key={`${selectedFacility.id}-${requirement.facilityId}`} className={`pill ${(game.facilities[requirement.facilityId]?.level ?? 0) >= requirement.level ? "green" : "muted"}`}>{game.facilities[requirement.facilityId]?.name ?? requirement.facilityId} Lv {requirement.level}</span>)}</div></div>}
            <div className="modal-flow">
              <div><label>Inputs / sec</label><div className="pill-list">{Object.entries(selectedFacility.inputRate).length === 0 ? <span className="pill muted">None</span> : Object.entries(selectedFacility.inputRate).map(([resourceId, rate]) => <span className="pill" key={resourceId}>{RESOURCE_DEFINITIONS[resourceId as ResourceId].name}: {rate.toFixed(2)}</span>)}</div></div>
              <div><label>Outputs / sec</label><div className="pill-list">{Object.entries(selectedFacility.outputRate).length === 0 ? <span className="pill muted">None</span> : Object.entries(selectedFacility.outputRate).map(([resourceId, rate]) => <span className="pill green" key={resourceId}>{RESOURCE_DEFINITIONS[resourceId as ResourceId].name}: {rate.toFixed(2)}</span>)}</div></div>
            </div>
            <div className="requirement-list"><label>{selectedFacility.level === 0 ? "Build requirements" : "Next upgrade requirements"}</label><div className="pill-list"><span className={`pill ${game.cash >= selectedCost.cash ? "green" : "muted"}`}>Cash: {formatMoney(selectedCost.cash)}</span>{Object.entries(selectedCost.materials).map(([resourceId, amount]) => <span key={resourceId} className={`pill ${(game.warehouses.central.inventory[resourceId as ResourceId]?.amount ?? 0) >= (amount ?? 0) ? "green" : "muted"}`}>{RESOURCE_DEFINITIONS[resourceId as ResourceId].name}: {formatQuantity(amount ?? 0)}</span>)}</div></div>
            <div className="facility-actions modal-actions"><button className="secondary" onClick={() => handleToggle(selectedFacility.id)} disabled={!selectedFacility.unlocked || selectedFacility.level === 0}>Power: {selectedFacility.active ? "ON" : "OFF"}</button><button onClick={() => handleUpgrade(selectedFacility.id)} disabled={!selectedFacility.unlocked || !selectedCanAfford}>{selectedFacility.level === 0 ? "Build facility" : "Upgrade facility"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;

