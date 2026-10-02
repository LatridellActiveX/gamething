// City-style lot layout for the 3D map. Districts follow the same production-chain grouping
// and in-group order as the 2D operations map (src/ui/flowLayout.ts).
import type { FacilityId, GameState } from "../../game/state/types";
import { FLOW_GROUP_ORDER, layoutFacilitiesByChain, type FlowGroupKey } from "../flowLayout";

type Facility = GameState["facilities"][FacilityId];

/** Centre-to-centre lot spacing and the paved pad size inside it. */
export const LOT_PITCH = 4.4;
export const LOT_PAD = 3.9;
/** Street width between districts and between district rows. */
export const STREET = 3.2;
/** Sidewalk margin around a district block. */
const CURB = 0.5;
/** Districts wrap to a new row once a row of blocks gets wider than this (grows with big cities). */
const MIN_ROW_WIDTH = 46;

export type Lot = { x: number; z: number; facilityId: FacilityId | null };
export type District = { key: FlowGroupKey; label: string; x: number; z: number; w: number; d: number; lots: Lot[] };
export type CityLayout = {
  districts: District[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};

function districtShape(count: number) {
  // Always leave at least one free lot so a district reads as room to grow.
  const lots = Math.max(4, count + 1);
  const cols = lots <= 4 ? 2 : Math.min(8, Math.ceil(Math.sqrt(lots * 1.4)));
  const rows = Math.max(2, Math.ceil(lots / cols));
  return { cols, rows };
}

export function buildCityLayout(facilities: Facility[]): CityLayout {
  const byGroup = new Map(layoutFacilitiesByChain(facilities).map((group) => [group.key, group.facilities.map((facility) => facility.id)]));

  // 1. size every district, 2. pack them left-to-right into rows, 3. centre the whole city on 0,0.
  const sized = FLOW_GROUP_ORDER.map(({ key, label }) => {
    const ids = byGroup.get(key) ?? [];
    const { cols, rows } = districtShape(ids.length);
    return { key, label, ids, cols, rows, w: cols * LOT_PITCH + CURB * 2, d: rows * LOT_PITCH + CURB * 2 };
  });

  const totalWidth = sized.reduce((total, item) => total + item.w + STREET, 0);
  const maxRowWidth = Math.max(MIN_ROW_WIDTH, totalWidth * 0.6);
  const rows: Array<typeof sized> = [];
  for (const district of sized) {
    const row = rows[rows.length - 1];
    const width = row ? row.reduce((total, item) => total + item.w + STREET, 0) : 0;
    if (!row || width + district.w > maxRowWidth) rows.push([district]);
    else row.push(district);
  }

  const districts: District[] = [];
  let z = 0;
  const rowWidths = rows.map((row) => row.reduce((total, item) => total + item.w, 0) + STREET * (row.length - 1));
  const cityWidth = Math.max(...rowWidths);
  rows.forEach((row, rowIndex) => {
    // Every block in a row gets the same depth so streets line up; spare rows become free lots.
    const depth = Math.max(...row.map((item) => item.d));
    for (const item of row) {
      item.rows = Math.round((depth - CURB * 2) / LOT_PITCH);
      item.d = depth;
    }
    let x = (cityWidth - rowWidths[rowIndex]) / 2;
    row.forEach((item) => {
      const lots: Lot[] = [];
      for (let lot = 0; lot < item.cols * item.rows; lot += 1) {
        const col = lot % item.cols;
        const r = Math.floor(lot / item.cols);
        lots.push({ x: x + CURB + LOT_PITCH * (col + 0.5), z: z + CURB + LOT_PITCH * (r + 0.5), facilityId: item.ids[lot] ?? null });
      }
      districts.push({ key: item.key, label: item.label, x, z, w: item.w, d: item.d, lots });
      x += item.w + STREET;
    });
    z += depth + STREET;
  });
  const cityDepth = z - STREET;

  // Centre on the origin.
  const dx = -cityWidth / 2;
  const dz = -cityDepth / 2;
  for (const district of districts) {
    district.x += dx;
    district.z += dz;
    for (const lot of district.lots) {
      lot.x += dx;
      lot.z += dz;
    }
  }
  return {
    districts,
    bounds: { minX: dx - STREET, maxX: -dx + STREET, minZ: dz - STREET, maxZ: -dz + STREET },
  };
}
