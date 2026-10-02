// Colours for the 3D map. These mirror the shared pixel-art palette in
// scripts/generate-pixel-art.mjs so the low-poly buildings match the 2D sprites.

export type Tint = { a: string; b: string; c: string };

/** Fixed palette letters from the sprite generator (outline, greys, accents). */
export const FIXED = {
  outline: "#141821",
  dark: "#3a4252",
  slate: "#6b7a8f",
  light: "#b4c2d3",
  white: "#eef3f8",
  amber: "#f5b83d",
  orange: "#e0602f",
  green: "#4cc38a",
  cyan: "#37c6de",
} as const;

const t = (a: string, b: string, c: string): Tint => ({ a, b, c });

/** Material tints: a = main, b = shade, c = highlight (same values as the sprite generator). */
export const TINTS = {
  amber: t("#f5b83d", "#b57f1c", "#ffe19a"), coal: t("#4a505c", "#2b2f38", "#7a818e"),
  iron: t("#a8603f", "#6e3a28", "#d89468"), copper: t("#d9803a", "#9c5424", "#f5b47a"),
  bauxite: t("#c96f44", "#8e4526", "#eaa47c"), silica: t("#c4e6ee", "#86b3c2", "#f1fbff"),
  oil: t("#4a4254", "#29232f", "#7d7090"), water: t("#3fa6e8", "#2870b2", "#a2d9fb"),
  lime: t("#dbd3b8", "#a79f84", "#f5f0dd"), titanium: t("#8ea4bb", "#5a6d83", "#cad8e6"),
  uranium: t("#8fe04e", "#4b9a2c", "#d0f7a0"), gas: t("#9ed3e2", "#5f99ab", "#e2f6fb"),
  lithium: t("#d98bd8", "#9b4f9b", "#f5c8f3"), gold: t("#f0c53a", "#b58a1e", "#fff0a0"),
  silver: t("#c3ccd8", "#8791a0", "#f1f5fa"), sulfur: t("#e8d94c", "#a99c25", "#fff7a0"),
  rare: t("#6fbfae", "#3e8274", "#b0eadc"), bio: t("#72b34c", "#41792b", "#acdd87"),
  sand: t("#e3c58b", "#b0935a", "#f7e5bd"), tungsten: t("#6e7282", "#454957", "#a2a7b6"),
  steel: t("#8c99ab", "#5b6778", "#c6d1de"), alu: t("#b8c7d6", "#7d8ea3", "#e6eef6"),
  fuel: t("#e89a3a", "#a8641d", "#ffd08a"), cyan: t("#37c6de", "#1f8aa0", "#a6ecf7"),
  plastic: t("#4fb8a4", "#2f7d6f", "#98e3d3"), circuit: t("#3fa864", "#27703f", "#8fe0a8"),
  concrete: t("#a7a39a", "#74716b", "#d2cfc7"), rubber: t("#3c3c46", "#232329", "#6a6a78"),
  red: t("#e05a3a", "#9c3520", "#ff9f86"), purple: t("#9a6cf0", "#5f3eb0", "#d4bcff"),
  wood: t("#b9814a", "#7f5430", "#e0ac74"), brick: t("#b5553a", "#7c3524", "#dc8a6a"),
  earth: t("#8a6a4a", "#5c4430", "#b8946c"),
} satisfies Record<string, Tint>;

export type TintName = keyof typeof TINTS;

/** Scene colours (ground, roads, lots). */
export const SCENE = {
  background: "#142632",
  grass: "#3b5a45",
  grassDark: "#46604c",
  asphalt: "#262b33",
  laneMark: "#f5b83d",
  sidewalk: "#5d6470",
  lot: "#74716b",
  lotEdge: "#8a877f",
  emptyMarker: "#b4c2d3",
  hover: "#37c6de",
} as const;

/** Status light colours. */
export const STATUS_COLORS = {
  running: "#4cc38a",
  idle: "#f5b83d",
  noPower: "#e0602f",
  full: "#d98bd8",
  off: "#6b7a8f",
} as const;
