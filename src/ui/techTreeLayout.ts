// Static layout for the tech tree screen: one column per era (wide eras split into sub-columns),
// one horizontal lane per category, so the same kind of building always sits on the same band.
import type { FacilityId } from "../game/state/types";
import { CATEGORY_ORDER, ERAS, TECH_NODES, type TechCategory } from "../game/tech/techTree";

export const NODE_W = 212;
export const NODE_H = 62;
export const SUB_COL_W = 236;
export const ERA_GAP = 44;
export const ROW_H = 76;
export const TOP = 70;
export const LEFT = 52;
export const LANE_GAP = 26;

export interface NodePosition { id: FacilityId; x: number; y: number; era: number; category: TechCategory }
export interface EraColumn { era: number; x: number; width: number }
export interface Lane { category: TechCategory; y: number; height: number }

const byName = (a: FacilityId, b: FacilityId) => TECH_NODES[a].era - TECH_NODES[b].era || a.localeCompare(b);

function build() {
  const ids = Object.keys(TECH_NODES) as FacilityId[];
  const subCols = ERAS.map((era) => (ids.filter((id) => TECH_NODES[id].era === era.id).length > 12 ? 2 : 1));
  const cell = (era: number, category: TechCategory) => ids.filter((id) => TECH_NODES[id].era === era && TECH_NODES[id].category === category).sort(byName);
  const laneRows = CATEGORY_ORDER.map((category) => Math.max(1, ...ERAS.map((era, index) => Math.ceil(cell(era.id, category).length / subCols[index]))));
  const lanes: Lane[] = [];
  let y = TOP;
  CATEGORY_ORDER.forEach((category, index) => {
    const height = laneRows[index] * ROW_H;
    lanes.push({ category, y, height });
    y += height + LANE_GAP;
  });
  const columns: EraColumn[] = [];
  let x = LEFT;
  ERAS.forEach((era, index) => {
    const width = subCols[index] * SUB_COL_W;
    columns.push({ era: era.id, x, width });
    x += width + ERA_GAP;
  });
  const positions = {} as Record<FacilityId, NodePosition>;
  ERAS.forEach((era, eraIndex) => {
    CATEGORY_ORDER.forEach((category, laneIndex) => {
      cell(era.id, category).forEach((id, index) => {
        const sub = index % subCols[eraIndex];
        const row = Math.floor(index / subCols[eraIndex]);
        positions[id] = { id, era: era.id, category, x: columns[eraIndex].x + sub * SUB_COL_W, y: lanes[laneIndex].y + row * ROW_H };
      });
    });
  });
  return { positions, columns, lanes, width: x - ERA_GAP + 40, height: y - LANE_GAP + 30 };
}

export const TREE_LAYOUT = build();

/** Smooth prerequisite line from the right edge of `from` to the left edge of `to` (or loop round when `to` isn't further right). */
export function edgePath(from: NodePosition, to: NodePosition): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const y2 = to.y + NODE_H / 2;
  if (to.x > x1 + 8) {
    const x2 = to.x;
    const dx = Math.max(40, (x2 - x1) * 0.5);
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
  }
  const x2 = to.x + NODE_W;
  const bulge = Math.max(x1, x2) + 46;
  return `M${x1},${y1} C${bulge},${y1} ${bulge},${y2} ${x2},${y2}`;
}
