# Industrial Frontier: prototype architecture

## Stack and boundaries

- **React + TypeScript + Vite** provide the responsive dashboard shell.
- `src/game/state/` owns serializable game state, the initial save, persistence, and validation.
- `src/game/engine/` will own the one-second simulation tick, production recipes, power balancing, warehouse capacity, and offline progress.
- `src/game/content/` will hold data-only resource, recipe, facility, market, and upgrade definitions as the tree expands.
- `src/components/` will contain reusable cards, badges, progress bars, tables, logs, and navigation.
- `src/features/` will contain screen-level views: dashboard, facilities, warehouse, market, and settings.

## Responsive dashboard

1. A sticky top header shows cash, power available/consumption, storage used/capacity, and save status.
2. The main content uses a single-column mobile layout and a two-column desktop grid.
3. The warehouse view uses a horizontally scrollable table below 720px; rows contain resource, amount, rate, capacity share, and an instant-sell action.
4. Facility cards show name, level, online/starved/full status badge, input/output rates, power draw, and upgrade cost. Cards stack on mobile and use a grid on desktop.
5. A fixed bottom tab bar appears below the desktop breakpoint with 44px minimum touch targets: Dashboard, Facilities, Warehouse, Market, Settings.
6. Status colors are semantic: green for positive rates, red for deficits, and orange for full or near-full storage. Color is paired with text or icons so it is not the only signal.

## Simulation and persistence rules

- The engine runs once per second and applies production only when required inputs, power, and warehouse space are available.
- `saveGame` runs every 10 seconds and records `lastSavedTimestamp`.
- Startup computes elapsed seconds from `lastSavedTimestamp`, caps offline simulation to a product decision later, and applies the same engine rules before rendering.
- Export/import uses the JSON representation of `GameState`; import rejects incompatible schemas instead of silently resetting.
