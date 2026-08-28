import { useEffect, useMemo, useRef, useState } from "react";
import { RESOURCE_DEFINITIONS } from "./game/state/initialState";
import { INITIAL_GAME_STATE } from "./game/state/initialState";
import { exportSave, importSave, loadGame, resetSave, saveGame } from "./game/state/storage";
import type { FacilityId, GameState, ResourceId } from "./game/state/types";
import {
  applyOfflineProgress,
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
  { id: "dashboard", label: "Dashboard" },
  { id: "facilities", label: "Facilities" },
  { id: "warehouse", label: "Warehouse" },
  { id: "market", label: "Market" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TAB_ITEMS)[number]["id"];

const formatMoney = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const formatRate = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}/s`;
const formatQuantity = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function App() {
  const [game, setGame] = useState<GameState>(() => {
    try {
      const saved = loadGame();
      return applyOfflineProgress(saved, Date.now());
    } catch {
      return structuredClone(INITIAL_GAME_STATE);
    }
  });
  const [tab, setTab] = useState<TabId>("dashboard");
  const [importText, setImportText] = useState("");
  const [renderNonce, setRenderNonce] = useState(0);
  const [upgradeNotice, setUpgradeNotice] = useState("Factories online and ready.");
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
        setRenderNonce((value) => value + 1);
      },
    };
  }, [game]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = tickGameState(structuredClone(gameRef.current), 1);
      gameRef.current = next;
      setGame({ ...next });
      setRenderNonce((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = structuredClone(gameRef.current);
      next.lastSavedTimestamp = Date.now();
      gameRef.current = next;
      setGame({ ...next });
      setRenderNonce((value) => value + 1);
      saveGame(next);
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  const resourceRows = useMemo(
    () =>
      (Object.keys(RESOURCE_DEFINITIONS) as ResourceId[]).map((resourceId) => {
        const definition = RESOURCE_DEFINITIONS[resourceId];
        if (resourceId === "power") return null;
        const amount = game.warehouses.central.inventory[resourceId].amount;
        const rate = getNetResourceRate(game, resourceId);
        return {
          resourceId,
          name: definition.name,
          amount,
          rate,
          price: getResourcePrice(resourceId),
        };
      }),
    [game],
  ).filter((row): row is NonNullable<typeof row> => row !== null);

  const storage = useMemo(() => computeWarehouseSummary(game), [game]);

  const powerBalance = useMemo(
    () => ({
      available: game.warehouses.energy.inventory.power.amount,
      production: game.power.productionPerSecond,
      consumption: game.power.consumptionPerSecond,
    }),
    [game],
  );

  const addLog = (entry: string) => {
    setLog((current) => [entry, ...current].slice(0, 8));
  };

  const handleUpgrade = (facilityId: FacilityId) => {
    const current = structuredClone(gameRef.current);
    const next = upgradeFacility(current, facilityId);
    updateFacilityUnlocks(next);

    if (next === current && current.facilities[facilityId].level === gameRef.current.facilities[facilityId].level) {
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
    setGame(next);
    addLog(
      `${gameRef.current.facilities[facilityId].name} ${next.facilities[facilityId].enabled ? "activated" : "paused"}.`,
    );
  };

  const handleSell = (resourceId: ResourceId, quantity: number) => {
    const next = sellResource(structuredClone(gameRef.current), resourceId, quantity);
    setGame(next);
    const sold = Math.min(quantity, gameRef.current.warehouses.central.inventory[resourceId].amount);
    if (sold > 0) {
      addLog(`Sold ${formatQuantity(sold)} ${RESOURCE_DEFINITIONS[resourceId].name} for ${formatMoney(sold * getResourcePrice(resourceId))}.`);
    }
  };

  const handleBuy = (resourceId: ResourceId, quantity: number) => {
    const current = structuredClone(gameRef.current);
    const startingAmount = current.warehouses.central.inventory[resourceId].amount;
    const next = purchaseResource(current, resourceId, quantity);
    const bought = Math.max(0, next.warehouses.central.inventory[resourceId].amount - startingAmount);

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
    const save = exportSave(gameRef.current);
    await navigator.clipboard.writeText(save);
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

  const renderDashboard = () => (
    <div className="panel-grid">
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Factory performance</h2>
          </div>
          <span className="status-banner">{upgradeNotice}</span>
        </div>

        <div className="kpis">
          <div className="kpi">
            <span>Cash</span>
            <strong>{formatMoney(game.cash)}</strong>
          </div>
          <div className="kpi accent-green">
            <span>Power</span>
            <strong>{powerBalance.available.toFixed(0)} / {game.warehouses.energy.capacity} MW</strong>
          </div>
          <div className="kpi accent-orange">
            <span>Capacity Used</span>
            <strong>{storage.used.toFixed(0)} / {storage.capacity}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Power grid</p>
            <h2>Balance</h2>
          </div>
        </div>

        <div className="metric-list">
          <div className="metric-row">
            <span>Production</span>
            <strong className="positive">{formatRate(powerBalance.production)}</strong>
          </div>
          <div className="metric-row">
            <span>Consumption</span>
            <strong className="danger">{formatRate(powerBalance.consumption)}</strong>
          </div>
          <div className="metric-row">
            <span>Available</span>
            <strong>{powerBalance.available.toFixed(1)} / {game.warehouses.energy.capacity} MW</strong>
          </div>
        </div>
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Latest events</h2>
          </div>
        </div>

        <div className="log-console">
          {log.map((entry) => (
            <div key={entry} className="log-line">{entry}</div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderFacilities = () => (
    <div className="facility-grid">
      {Object.values(game.facilities).map((facility) => {
        const cost = getFacilityUpgradeCost(facility);
        const statusClass = facility.status === "online" ? "good" : facility.status === "starved" ? "bad" : facility.status === "storage-full" ? "warn" : "muted";

        return (
          <article key={facility.id} className="facility-card">
            <div className="facility-topline">
              <div>
                <p className="eyebrow">Facility</p>
                <h3>{facility.name}</h3>
              </div>
              <div className="facility-badges">
                <span className="badge level-badge">Lv {facility.level}</span>
                <span className={`badge ${statusClass}`}>{facility.status}</span>
              </div>
            </div>

            <div className="facility-meta">
              <span>Level {facility.level}</span>
              <span>{!facility.unlocked ? `Unlocks at ${facility.unlockRequirement?.facilityId} Lv ${facility.unlockRequirement?.level}` : facility.enabled ? "Running" : "Paused"}</span>
            </div>

            <div className="small-grid">
              <div>
                <label>Inputs</label>
                <div className="pill-list">
                  {Object.entries(facility.inputRate).length === 0 ? (
                    <span className="pill muted">None</span>
                  ) : (
                    Object.entries(facility.inputRate).map(([resourceId, rate]) => (
                      <span key={resourceId} className="pill">
                        {RESOURCE_DEFINITIONS[resourceId as ResourceId].name}: {rate.toFixed(2)}/s
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label>Outputs</label>
                <div className="pill-list">
                  {Object.entries(facility.outputRate).length === 0 ? (
                    <span className="pill muted">None</span>
                  ) : (
                    Object.entries(facility.outputRate).map(([resourceId, rate]) => (
                      <span key={resourceId} className="pill green">
                        {RESOURCE_DEFINITIONS[resourceId as ResourceId].name}: {rate.toFixed(2)}/s
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="facility-actions">
              <button className="secondary" onClick={() => handleToggle(facility.id)} disabled={!facility.unlocked}>{facility.enabled ? "Pause" : "Activate"}</button>
              <button
                onClick={() => handleUpgrade(facility.id)}
                disabled={!facility.unlocked || game.cash < cost.cash}
                title={game.cash < cost.cash ? "Need more cash and materials" : `Upgrade ${facility.name}`}
              >
                {!facility.unlocked ? "Locked • Build prerequisite" : game.cash >= cost.cash ? `Upgrade • ${formatMoney(cost.cash)}` : `Locked • ${formatMoney(cost.cash)}`}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );

  const renderWarehouse = () => (
    <div className="table-shell">
      <table className="warehouse-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Stock</th>
            <th>Rate</th>
            <th>Capacity</th>
            <th>Sell</th>
          </tr>
        </thead>
        <tbody>
          {resourceRows.map(({ resourceId, name, amount, rate, price }) => {
            const stockPercent = (amount / storage.capacity) * 100;
            return (
              <tr key={resourceId}>
                <td>
                  <div className="resource-name">
                    <span>{name}</span>
                    <small>{RESOURCE_DEFINITIONS[resourceId].unit}</small>
                  </div>
                </td>
                <td>
                  <span key={`${resourceId}-${amount}`} className="stock-value">{formatQuantity(amount)}</span>
                </td>
                <td className={rate >= 0 ? "positive" : "danger"}>{formatRate(rate)}</td>
                <td>
                  <div className="progress-wrap">
                    <div className="progress-bar">
                      <span style={{ width: `${Math.min(stockPercent, 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td>
                  <div className="sell-group">
                    <button className="small" onClick={() => handleSell(resourceId, 25)}>Sell 25</button>
                    <button className="small secondary" onClick={() => handleSell(resourceId, amount)}>Sell All</button>
                  </div>
                  <small className="muted">{formatMoney(price)}/unit</small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderMarket = () => (
    <div className="panel-grid single">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Market</p>
            <h2>Buy & sell</h2>
          </div>
        </div>

        <div className="market-list">
          {resourceRows.map(({ resourceId, name, amount, price }) => (
            <div key={resourceId} className="market-item">
              <div>
                <strong>{name}</strong>
                <span>{formatQuantity(amount)} on hand</span>
              </div>
              <div className="market-actions">
                <button className="small" onClick={() => handleBuy(resourceId, 25)}>
                  Buy 25 • {formatMoney(price * 25 * 1.2)}
                </button>
                <button className="small secondary" onClick={() => handleSell(resourceId, Math.max(10, Math.round(amount * 0.25)))}>
                  Sell {formatMoney(price * Math.max(10, Math.round(amount * 0.25)))}
                </button>
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
        <div className="panel-header">
          <div>
            <p className="eyebrow">Save controls</p>
            <h2>Management</h2>
          </div>
        </div>

        <div className="settings-stack">
          <button onClick={handleExport}>Export Save</button>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="Paste a save JSON here to import..."
          />
          <button className="secondary" onClick={handleImport}>Import Save</button>
          <button className="danger" onClick={handleReset}>Reset Save</button>
        </div>
      </section>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">IF</div>
          <div>
            <p className="eyebrow">Industrial Frontier</p>
            <h1>Operations Console</h1>
          </div>
        </div>

        <div className="topbar-stats">
          <div className="mini-stat">
            <span>Cash</span>
            <strong>{formatMoney(game.cash)}</strong>
          </div>
          <div className="mini-stat">
            <span>Power</span>
            <strong>{powerBalance.available.toFixed(0)} / {powerBalance.consumption.toFixed(0)} MW</strong>
          </div>
          <div className="mini-stat">
            <span>Warehouse Used</span>
            <strong>{storage.used.toFixed(0)} / {storage.capacity}</strong>
          </div>
        </div>
      </header>

      <main className="content-shell">
        {tab === "dashboard" && renderDashboard()}
        {tab === "facilities" && renderFacilities()}
        {tab === "warehouse" && renderWarehouse()}
        {tab === "market" && renderMarket()}
        {tab === "settings" && renderSettings()}
      </main>

      <nav className="mobile-tabbar" aria-label="Main navigation">
        {TAB_ITEMS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
