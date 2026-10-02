// Code-generated low-poly facility models.
//
// Every facility ID resolves to a model through `getFacilityModel()`:
//   1. MODEL_OVERRIDES  - drop-in replacements (e.g. a Kenney glTF model) keyed by facility ID
//   2. FACILITY_MODELS  - the archetype + tint chosen for that facility
//   3. FallbackModel    - a generic workshop, so unknown or future IDs still render
//
// Models are built around the lot centre, sit on y = 0 and stay inside roughly +/-1.75 units,
// so anything that fits a 3.5 x 3.5 footprint can replace them.
import type { ComponentType } from "react";
import type { FacilityId } from "../../game/state/types";
import { FIXED, TINTS, type Tint, type TintName } from "./palette";
import { Ball, Box, Cone, CoolingTower, Cyl, Dome, Flame, Glow, Pipe, Rock, Roof, Smoke, Spin, hashUnit, mat } from "./primitives";

export type ModelProps = {
  /** Material tint taken from the facility's pixel-art sprite / main product. */
  tint: Tint;
  /** Facility is producing right now. */
  on: boolean;
  /** Running and motion allowed (not prefers-reduced-motion). */
  anim: boolean;
  /** Stable per-facility value in [0, 1) for small variations. */
  seed: number;
};

const C = TINTS.concrete;
const S = TINTS.steel;
const W = FIXED.white;
const D = FIXED.dark;

// ---------- Power ----------

function PowerStation({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <Box s={[2, 1.1, 1.5]} p={[-0.55, 0, 0.75]} c={C.a} />
      <Box s={[2.1, 0.12, 1.6]} p={[-0.55, 1.1, 0.75]} c={C.b} />
      <Glow s={[1.6, 0.18, 0.02]} p={[-0.55, 0.65, 1.51]} c="#f5b83d" on={on} />
      <Box s={[0.5, 0.6, 0.02]} p={[0.15, 0, 1.51]} c={D} />
      <CoolingTower rad={0.85} h={2.5} p={[0.8, 0, -0.65]} c={C.c} />
      <Smoke p={[0.8, 2.5, -0.65]} color="#e6edf3" size={0.38} height={1.8} active={anim} visible={on} />
      <Cyl rad={0.17} top={0.13} h={2.9} p={[-1.25, 0, -0.95]} c={S.b} />
      <Cyl rad={0.15} h={0.25} p={[-1.25, 2.3, -0.95]} c={FIXED.orange} />
      <Cyl rad={0.15} h={0.2} p={[-1.25, 1.8, -0.95]} c={W} />
      <Smoke p={[-1.25, 2.9, -0.95]} color="#6b7280" size={0.2} active={anim} visible={on} />
      <Cone rad={0.6} h={0.5} p={[1.0, 0, 1.15]} c={tint.a} seg={6} />
      <Pipe rad={0.08} len={1} p={[0.4, 0.8, 0.1]} r={[0, 0.7, 0]} c={S.a} />
    </group>
  );
}

function SolarFarm({ tint, on }: ModelProps) {
  const panels: Array<[number, number]> = [];
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) panels.push([-1.1 + col * 1.1, -1.05 + row * 1.05]);
  const panelMat = mat(tint.b, { emissive: tint.a, glow: on ? 0.18 : 0, metal: 0.4, rough: 0.35 });
  return (
    <group>
      {panels.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <Cyl rad={0.04} h={0.35} c={S.b} seg={5} />
          <group position={[0, 0.42, 0]} rotation={[-0.55, 0, 0]}>
            <Box s={[0.98, 0.05, 0.7]} p={[0, -0.025, 0]} c={tint.b} m={panelMat} />
            <Box s={[1.02, 0.03, 0.74]} p={[0, -0.06, 0]} c={S.c} />
          </group>
        </group>
      ))}
      <Box s={[0.35, 0.4, 0.3]} p={[1.45, 0, 1.45]} c={FIXED.amber} />
    </group>
  );
}

function Turbine({ p, h, anim, phase }: { p: [number, number, number]; h: number; anim: boolean; phase: number }) {
  return (
    <group position={p}>
      <Cyl rad={0.09} top={0.05} h={h} c={W} seg={8} />
      <Box s={[0.18, 0.18, 0.4]} p={[0, h - 0.05, -0.05]} c={FIXED.light} />
      <Spin axis="z" speed={2.2} active={anim} p={[0, h + 0.04, 0.17]}>
        <group rotation={[0, 0, phase]}>
          {[0, 1, 2].map((blade) => (
            <group key={blade} rotation={[0, 0, (blade * Math.PI * 2) / 3]}>
              <Box s={[0.09, 0.95, 0.03]} p={[0, 0.02, 0]} c={W} />
            </group>
          ))}
          <Ball rad={0.07} c={FIXED.light} seg={6} />
        </group>
      </Spin>
    </group>
  );
}

function WindFarm({ anim, seed }: ModelProps) {
  return (
    <group>
      <Turbine p={[-0.9, 0, -0.8]} h={2.6} anim={anim} phase={seed * 6} />
      <Turbine p={[0.95, 0, -0.3]} h={2.3} anim={anim} phase={seed * 3 + 1} />
      <Turbine p={[-0.3, 0, 1.0]} h={2.0} anim={anim} phase={seed * 9 + 2} />
      <Box s={[0.5, 0.35, 0.4]} p={[1.2, 0, 1.3]} c={C.a} />
    </group>
  );
}

// ---------- Extraction ----------

function HeadframeMine({ tint, on, anim, seed }: ModelProps) {
  const legs: Array<[number, number]> = [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]];
  return (
    <group>
      <group position={[-0.5, 0, -0.4]}>
        {legs.map(([x, z]) => <Box key={`${x}${z}`} s={[0.09, 2.2, 0.09]} p={[x, 0, z]} c={FIXED.orange} />)}
        {[0.6, 1.3].map((y) => <Box key={y} s={[0.72, 0.06, 0.72]} p={[0, y, 0]} c={TINTS.red.b} m={mat(TINTS.red.b, { wire: true })} />)}
        <Box s={[0.8, 0.1, 0.8]} p={[0, 2.2, 0]} c={TINTS.red.b} />
        <Box s={[0.09, 2.3, 0.09]} p={[0.75, 0, 0]} r={[0, 0, 0.42]} c={TINTS.red.a} />
        <Spin axis="z" speed={2.5} active={anim} p={[0, 2.45, 0.15]}>
          <mesh material={mat(S.c)} castShadow>
            <torusGeometry args={[0.3, 0.04, 5, 12]} />
          </mesh>
          <Box s={[0.6, 0.04, 0.04]} p={[0, -0.02, 0]} c={S.c} />
        </Spin>
      </group>
      <Box s={[1.3, 0.7, 1.0]} p={[0.75, 0, -0.55]} c={C.a} />
      <Roof w={1.0} h={0.35} len={1.3} p={[0.75, 0.7, -0.55]} c={tint.b} />
      <Glow s={[0.9, 0.14, 0.02]} p={[0.75, 0.38, -0.04]} c="#ffe19a" on={on} />
      <Cone rad={0.75} h={0.7} p={[0.5, 0, 1.05]} c={tint.a} seg={7} />
      <Cone rad={0.45} h={0.45} p={[1.25, 0, 1.25]} c={tint.c} seg={6} />
      <Box s={[0.5, 0.28, 0.32]} p={[-1.2, 0, 1.0 - seed * 0.4]} c={FIXED.amber} />
      <Box s={[0.42, 0.14, 0.26]} p={[-1.2, 0.28, 1.0 - seed * 0.4]} c={tint.a} />
    </group>
  );
}

function Quarry({ tint, anim }: ModelProps) {
  return (
    <group>
      <Box s={[3.1, 0.35, 2.6]} p={[0, 0, -0.35]} c={tint.b} />
      <Box s={[2.4, 0.3, 2.0]} p={[-0.2, 0.35, -0.55]} c={tint.a} />
      <Box s={[1.6, 0.3, 1.3]} p={[-0.35, 0.65, -0.75]} c={tint.b} />
      <Box s={[0.9, 0.25, 0.7]} p={[-0.45, 0.95, -0.9]} c={tint.c} />
      <group position={[0.85, 0.35, 0.35]} rotation={[0, -0.6, 0]}>
        <Box s={[0.55, 0.22, 0.4]} c={FIXED.amber} />
        <Box s={[0.25, 0.22, 0.3]} p={[-0.1, 0.22, 0]} c={FIXED.amber} />
        <Rock axis="z" amount={0.25} speed={1.6} active={anim} p={[0.2, 0.3, 0]}>
          <Box s={[0.7, 0.07, 0.07]} p={[0.32, 0.05, 0]} r={[0, 0, 0.55]} c={TINTS.amber.b} />
        </Rock>
      </group>
      <group position={[0.2, 0, 1.35]}>
        <Box s={[0.75, 0.25, 0.4]} p={[0, 0.1, 0]} c={FIXED.amber} />
        <Box s={[0.5, 0.22, 0.36]} p={[0.1, 0.35, 0]} c={tint.a} />
        <Box s={[0.22, 0.25, 0.38]} p={[-0.3, 0.35, 0]} c={TINTS.amber.b} />
        {[-0.25, 0.25].map((x) => <Pipe key={x} rad={0.1} len={0.44} p={[x, 0.1, 0]} r={[0, Math.PI / 2, 0]} c={D} />)}
      </group>
      <Cone rad={0.5} h={0.45} p={[-1.25, 0, 1.25]} c={tint.c} seg={6} />
    </group>
  );
}

function BucketExcavator({ tint, anim }: ModelProps) {
  return (
    <group>
      <Cone rad={1.1} h={0.9} p={[0.75, 0, 0.75]} c={tint.a} seg={7} />
      <group position={[-0.4, 0, -0.3]} rotation={[0, 0.5, 0]}>
        <Box s={[1.2, 0.25, 1.0]} c={D} />
        <Box s={[0.9, 0.55, 0.75]} p={[0, 0.25, 0]} c={FIXED.amber} />
        <Box s={[0.4, 0.35, 0.45]} p={[-0.1, 0.8, 0]} c={TINTS.amber.b} />
        <Box s={[2.0, 0.12, 0.14]} p={[1.0, 0.95, 0]} r={[0, 0, 0.28]} c={TINTS.amber.b} />
        <Box s={[0.9, 0.1, 0.12]} p={[-0.8, 0.9, 0]} r={[0, 0, -0.35]} c={TINTS.amber.b} />
        <Box s={[0.4, 0.4, 0.4]} p={[-1.15, 0.55, 0]} c={C.b} />
        <Spin axis="z" speed={-1.6} active={anim} p={[1.95, 1.25, 0]}>
          <mesh material={mat(S.b)} castShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.16, 10]} />
          </mesh>
          {Array.from({ length: 8 }, (_, index) => (
            <group key={index} rotation={[0, 0, (index * Math.PI) / 4]}>
              <Box s={[0.18, 0.18, 0.24]} p={[0, 0.5, 0]} c={tint.b} />
            </group>
          ))}
        </Spin>
      </group>
    </group>
  );
}

function Derrick({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <group position={[-0.7, 0, -0.6]}>
        <mesh material={mat(S.c, { wire: true })} position={[0, 1.4, 0]}>
          <coneGeometry args={[0.65, 2.8, 4, 6, true]} />
        </mesh>
        <Box s={[1.1, 0.12, 1.1]} p={[0, 0.3, 0]} r={[0, Math.PI / 4, 0]} c={S.b} />
        <Box s={[0.2, 0.2, 0.2]} p={[0, 2.75, 0]} c={FIXED.orange} />
      </group>
      <group position={[0.5, 0, 0.75]}>
        <Box s={[1.4, 0.12, 0.45]} c={D} />
        <Box s={[0.12, 0.8, 0.35]} p={[0, 0.1, 0]} c={tint.a} />
        <Rock axis="z" amount={0.3} speed={1.8} active={anim} p={[0, 0.9, 0]}>
          <Box s={[1.5, 0.12, 0.14]} p={[0, -0.06, 0]} c={tint.a} />
          <Box s={[0.2, 0.45, 0.16]} p={[0.75, -0.35, 0]} c={tint.b} />
          <Box s={[0.28, 0.28, 0.2]} p={[-0.65, -0.3, 0]} c={D} />
        </Rock>
      </group>
      <Cyl rad={0.5} h={0.7} p={[1.1, 0, -0.85]} c={tint.b} />
      <Cyl rad={0.52} h={0.06} p={[1.1, 0.7, -0.85]} c={tint.c} />
      <Pipe rad={0.05} len={1.4} p={[0.25, 0.1, -0.7]} c={S.a} />
      <Glow s={[0.1, 0.1, 0.1]} p={[-0.7, 2.85, -0.6]} c="#e0602f" on={on} />
    </group>
  );
}

function PumpStation({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <Box s={[1.8, 0.2, 1.4]} p={[-0.6, 0, 0.6]} c={C.b} />
      <Box s={[1.6, 0.06, 1.2]} p={[-0.6, 0.16, 0.6]} c={tint.a} m={mat(tint.a, { emissive: tint.b, glow: 0.25, rough: 0.2, metal: 0.3 })} shadow={false} />
      <Box s={[1.0, 0.75, 0.8]} p={[0.9, 0, 0.7]} c={C.a} />
      <Roof w={0.8} h={0.3} len={1.0} p={[0.9, 0.75, 0.7]} c={tint.b} />
      <Pipe rad={0.09} len={1.2} p={[0.2, 0.35, -0.1]} c={S.b} />
      <group position={[0.6, 0, -0.85]}>
        {[[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].map(([x, z]) => <Box key={`${x}${z}`} s={[0.07, 1.5, 0.07]} p={[x, 0, z]} c={S.b} />)}
        <Cyl rad={0.5} h={0.7} p={[0, 1.5, 0]} c={tint.c} />
        <Cone rad={0.52} h={0.3} p={[0, 2.2, 0]} c={tint.b} />
      </group>
      <Spin axis="x" speed={4} active={anim} p={[-0.6, 0.4, -0.5]}>
        <Box s={[0.08, 0.5, 0.08]} c={FIXED.amber} />
        <Box s={[0.08, 0.08, 0.5]} c={FIXED.amber} />
      </Spin>
      <Glow s={[0.6, 0.12, 0.02]} p={[0.9, 0.45, 1.11]} c="#a2d9fb" on={on} />
    </group>
  );
}

function GasWell({ tint, on, anim }: ModelProps) {
  return (
    <group>
      {[-0.6, 0.55].map((x) => (
        <group key={x} position={[x, 0, -0.7]}>
          {[-0.3, 0.3].map((leg) => <Box key={leg} s={[0.07, 0.4, 0.07]} p={[leg, 0, 0]} c={S.b} />)}
          <Ball rad={0.55} p={[0, 0.85, 0]} c={tint.a} seg={10} />
        </group>
      ))}
      <group position={[-0.7, 0, 0.8]}>
        <Cyl rad={0.12} h={0.5} c={FIXED.orange} />
        <Box s={[0.4, 0.1, 0.1]} p={[0, 0.3, 0]} c={FIXED.orange} />
        <Cyl rad={0.09} h={0.3} p={[0, 0.5, 0]} c={TINTS.red.b} />
      </group>
      <Cyl rad={0.08} top={0.06} h={2.6} p={[1.3, 0, 1.0]} c={S.c} />
      <Flame p={[1.3, 2.6, 1.0]} active={anim} visible={on} />
      <Pipe rad={0.06} len={2.0} p={[0.2, 0.15, 0.4]} c={S.a} />
      <Box s={[0.8, 0.5, 0.6]} p={[0.2, 0, 1.2]} c={C.a} />
    </group>
  );
}

function Harvester({ tint, anim }: ModelProps) {
  return (
    <group>
      <Box s={[3.2, 0.06, 1.6]} p={[0, 0, 0.75]} c={TINTS.earth.b} />
      {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => <Box key={x} s={[0.32, 0.3, 1.45]} p={[x, 0.06, 0.75]} c={tint.a} />)}
      <Box s={[1.3, 0.75, 0.9]} p={[-0.6, 0, -0.9]} c={TINTS.red.a} />
      <Roof w={0.9} h={0.45} len={1.3} p={[-0.6, 0.75, -0.9]} c={TINTS.red.b} />
      <Cyl rad={0.35} h={1.6} p={[0.75, 0, -0.95]} c={S.c} />
      <Dome rad={0.35} p={[0.75, 1.6, -0.95]} c={S.b} />
      <Rock axis="y" amount={0.4} speed={0.5} active={anim} p={[1.25, 0, 0.0]}>
        <Box s={[0.5, 0.3, 0.32]} p={[0, 0.05, 0]} c={TINTS.bio.b} />
        <Box s={[0.12, 0.12, 0.6]} p={[0.3, 0.1, 0]} c={FIXED.amber} />
      </Rock>
    </group>
  );
}

function IceMine({ tint, anim }: ModelProps) {
  const blocks: Array<[number, number, number, number]> = [[-0.9, -0.8, 0.9, 0.7], [-0.1, -1.1, 0.7, 1.0], [0.8, -0.7, 0.8, 0.6], [-1.1, 0.4, 0.6, 0.5], [0.3, 0.3, 0.5, 0.4]];
  return (
    <group>
      {blocks.map(([x, z, w, h], index) => <Box key={index} s={[w, h, w * 0.9]} p={[x, 0, z]} r={[0, index * 0.4, 0]} c={index % 2 ? tint.a : tint.c} m={mat(index % 2 ? tint.a : tint.c, { rough: 0.3, metal: 0.1 })} />)}
      <group position={[1.1, 0, 1.0]}>
        <Box s={[0.12, 2.0, 0.12]} c={FIXED.amber} />
        <Spin axis="y" speed={0.5} active={anim} p={[0, 2.0, 0]}>
          <Box s={[1.6, 0.1, 0.12]} p={[-0.5, 0, 0]} c={FIXED.amber} />
          <Box s={[0.02, 0.8, 0.02]} p={[-1.1, -0.8, 0]} c={D} />
        </Spin>
      </group>
      <Box s={[0.7, 0.5, 0.5]} p={[-0.4, 0, 1.2]} c={TINTS.red.a} />
    </group>
  );
}

// ---------- Processing ----------

function BlastFurnace({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <Cyl rad={0.7} top={0.45} h={2.5} p={[-0.3, 0, -0.2]} c={TINTS.brick.a} />
      <Cyl rad={0.48} top={0.3} h={0.4} p={[-0.3, 2.5, -0.2]} c={S.b} />
      <Smoke p={[-0.3, 2.9, -0.2]} color="#7a818e" size={0.25} active={anim} visible={on} />
      <Glow s={[0.5, 0.3, 0.05]} p={[-0.3, 0.1, 0.48]} c="#f97316" on={on} />
      {[-1.3, -0.7, -0.1].map((x) => (
        <group key={x} position={[x + 0.4, 0, -1.25]}>
          <Cyl rad={0.26} h={1.8} c={S.a} />
          <Dome rad={0.26} p={[0, 1.8, 0]} c={S.b} />
        </group>
      ))}
      <Box s={[0.12, 1.9, 0.12]} p={[0.55, 1.2, -0.3]} r={[0, 0, 0.75]} c={S.b} />
      <Box s={[1.4, 0.6, 1.0]} p={[1.0, 0, 0.75]} c={C.a} />
      <Roof w={1.0} h={0.3} len={1.4} p={[1.0, 0.6, 0.75]} c={tint.b} />
      {[0, 1, 2].map((index) => <Box key={index} s={[0.32, 0.14, 0.16]} p={[-1.25, index * 0.14, 1.2]} c={tint.a} />)}
    </group>
  );
}

function Smelter({ tint, on, anim, seed }: ModelProps) {
  const stacks = seed > 0.5 ? [-1.0, 0, 1.0] : [-0.8, 0.6];
  return (
    <group>
      <Box s={[3.0, 1.0, 1.5]} p={[0, 0, -0.45]} c={S.b} />
      <Roof w={1.5} h={0.45} len={3.0} p={[0, 1.0, -0.45]} c={tint.b} />
      <Glow s={[2.6, 0.16, 0.02]} p={[0, 0.55, 0.31]} c="#f97316" on={on} />
      {stacks.map((x) => (
        <group key={x}>
          <Cyl rad={0.12} h={1.2} p={[x, 1.1, -0.85]} c={C.b} />
          <Smoke p={[x, 2.3, -0.85]} color="#8b95a3" size={0.16} height={1.2} count={3} active={anim} visible={on} />
        </group>
      ))}
      {[-1.1, -0.6, -0.1].map((x, index) => (
        <group key={x}>
          {[0, 1].map((layer) => <Box key={layer} s={[0.36, 0.12, 0.18]} p={[x, layer * 0.12, 0.9 + (index % 2) * 0.25]} c={layer ? tint.c : tint.a} />)}
        </group>
      ))}
      <Box s={[0.6, 0.35, 0.4]} p={[1.0, 0, 1.0]} c={FIXED.amber} />
    </group>
  );
}

function CokeOven({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <Box s={[2.8, 1.0, 0.9]} p={[-0.2, 0, -0.5]} c={TINTS.brick.a} />
      {Array.from({ length: 8 }, (_, index) => <Box key={index} s={[0.08, 1.0, 0.02]} p={[-1.45 + index * 0.36, 0, -0.04]} c={TINTS.brick.b} />)}
      <Box s={[2.8, 0.1, 0.9]} p={[-0.2, 1.0, -0.5]} c={D} />
      <Cyl rad={0.2} top={0.15} h={2.6} p={[1.45, 0, -1.2]} c={TINTS.brick.b} />
      <Smoke p={[1.45, 2.6, -1.2]} color="#5b6170" size={0.22} active={anim} visible={on} />
      <Box s={[0.6, 1.5, 0.6]} p={[1.2, 0, 0.6]} c={C.a} />
      <Smoke p={[1.2, 1.5, 0.6]} color="#e6edf3" size={0.25} height={1.2} active={anim} visible={on} />
      <Cone rad={0.6} h={0.45} p={[-0.8, 0, 0.9]} c={tint.a} seg={6} />
      <Glow s={[2.6, 0.06, 0.02]} p={[-0.2, 0.1, -0.03]} c="#f97316" on={on} />
    </group>
  );
}

function RotaryKiln({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <group position={[-0.1, 0.55, -0.2]} rotation={[0, 0, 0.08]}>
        <Spin axis="x" speed={1.2} active={anim}>
          <Pipe rad={0.32} len={2.8} c={TINTS.rubber.c} seg={10} />
          {[-0.9, 0, 0.9].map((x) => <Pipe key={x} rad={0.36} len={0.1} p={[x, 0, 0]} c={S.b} seg={10} />)}
        </Spin>
      </group>
      {[-0.9, 0, 0.9].map((x) => <Box key={x} s={[0.2, 0.3, 0.6]} p={[x - 0.1, 0, -0.2]} c={C.b} />)}
      <Box s={[0.7, 2.1, 0.8]} p={[1.35, 0, -0.3]} c={C.a} />
      <Cyl rad={0.12} h={0.9} p={[1.35, 2.1, -0.3]} c={S.b} />
      <Smoke p={[1.35, 3.0, -0.3]} color="#d2cfc7" size={0.2} active={anim} visible={on} />
      <Glow s={[0.04, 0.3, 0.3]} p={[-1.52, 0.4, -0.2]} c="#f97316" on={on} />
      <Cone rad={0.65} h={0.5} p={[-0.6, 0, 1.0]} c={tint.a} seg={7} />
      <Cone rad={0.45} h={0.35} p={[0.5, 0, 1.15]} c={tint.c} seg={6} />
    </group>
  );
}

function Refinery({ tint, on, anim, seed }: ModelProps) {
  const columns: Array<[number, number, number]> = [[-1.1, -0.9, 2.6], [-0.5, -1.05, 2.0], [0.05, -0.85, 2.9 - seed * 0.6]];
  return (
    <group>
      {columns.map(([x, z, h]) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl rad={0.2} h={h} c={S.c} />
          {[0.35, 0.65].map((f) => <Cyl key={f} rad={0.28} h={0.05} p={[0, h * f, 0]} c={FIXED.amber} />)}
          <Dome rad={0.2} p={[0, h, 0]} c={S.c} />
        </group>
      ))}
      {[[0.9, 0.85], [-0.3, 0.95]].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl rad={0.55} h={0.7} c={tint.a} />
          <Cyl rad={0.57} h={0.06} p={[0, 0.7, 0]} c={tint.c} />
        </group>
      ))}
      <Box s={[2.6, 0.08, 0.3]} p={[-0.1, 0.9, -0.2]} c={S.b} />
      {[-1.2, -0.1, 1.0].map((x) => <Box key={x} s={[0.06, 0.9, 0.06]} p={[x, 0, -0.2]} c={S.b} />)}
      <Cyl rad={0.07} h={2.8} p={[1.35, 0, -1.25]} c={S.b} />
      <Flame p={[1.35, 2.8, -1.25]} active={anim} visible={on} />
    </group>
  );
}

function ChemPlant({ tint, on, anim, seed }: ModelProps) {
  return (
    <group>
      <Cyl rad={0.45} h={1.8} p={[-0.9, 0, -0.8]} c={tint.a} />
      <Dome rad={0.45} p={[-0.9, 1.8, -0.8]} c={tint.c} />
      <Cyl rad={0.48} h={0.08} p={[-0.9, 1.0, -0.8]} c={FIXED.amber} />
      {[[0.35, -1.0], [1.1, -0.45]].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          {[-0.2, 0.2].map((leg) => <Box key={leg} s={[0.06, 0.35, 0.06]} p={[leg, 0, 0]} c={S.b} />)}
          <Ball rad={0.42} p={[0, 0.72, 0]} c={W} seg={10} />
        </group>
      ))}
      <Pipe rad={0.06} len={2.2} p={[0, 1.2, -0.75]} c={S.b} />
      <Pipe rad={0.06} len={1.6} p={[0.2, 0.25, 0.1]} r={[0, 0.4, 0]} c={tint.b} />
      <Box s={[1.4, 0.8, 1.0]} p={[0.55, 0, 0.95]} c={C.a} />
      <Box s={[1.5, 0.08, 1.1]} p={[0.55, 0.8, 0.95]} c={tint.b} />
      <Glow s={[1.1, 0.14, 0.02]} p={[0.55, 0.45, 1.46]} c={tint.c} on={on} />
      <Cyl rad={0.1} h={2.0} p={[-1.35, 0, 0.6 + seed * 0.4]} c={S.c} />
      <Smoke p={[-1.35, 2.0, 0.6 + seed * 0.4]} color={tint.c} size={0.16} count={3} active={anim} visible={on} />
    </group>
  );
}

function WaterTreatment({ tint, on, anim }: ModelProps) {
  return (
    <group>
      {[[-0.75, -0.7], [0.75, -0.7]].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl rad={0.75} h={0.35} c={C.c} seg={14} />
          <Cyl rad={0.66} h={0.02} p={[0, 0.33, 0]} c={tint.a} seg={14} m={mat(tint.a, { emissive: tint.b, glow: 0.2, rough: 0.2 })} shadow={false} />
          <Spin axis="y" speed={0.6} active={anim} p={[0, 0.4, 0]}>
            <Box s={[1.3, 0.05, 0.08]} c={FIXED.amber} />
          </Spin>
        </group>
      ))}
      <Box s={[2.0, 0.8, 0.9]} p={[0, 0, 0.9]} c={W} />
      <Box s={[2.1, 0.08, 1.0]} p={[0, 0.8, 0.9]} c={tint.b} />
      <Glow s={[1.6, 0.14, 0.02]} p={[0, 0.45, 1.36]} c="#a2d9fb" on={on} />
    </group>
  );
}

function Centrifuge({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <Box s={[3.0, 0.15, 2.0]} p={[0, 0, -0.5]} c={C.b} />
      {[0, 1].map((row) => [0, 1, 2, 3, 4].map((col) => (
        <group key={`${row}-${col}`} position={[-1.1 + col * 0.55, 0.15, -0.95 + row * 0.8]}>
          <Cyl rad={0.16} h={1.3} c={S.c} />
          <Spin axis="y" speed={6} active={anim} p={[0, 1.3, 0]}>
            <Box s={[0.26, 0.12, 0.08]} c={tint.a} m={mat(tint.a, { emissive: tint.a, glow: on ? 0.5 : 0 })} />
          </Spin>
        </group>
      )))}
      <Box s={[1.4, 0.7, 0.8]} p={[0.6, 0, 1.15]} c={W} />
      <Box s={[0.6, 0.12, 0.02]} p={[0.6, 0.45, 1.56]} c={FIXED.amber} />
      <Cone rad={0.3} h={0.4} p={[-1.1, 0, 1.2]} c={tint.b} />
    </group>
  );
}

function RollingMill({ tint, on, anim, seed }: ModelProps) {
  const pipes = seed > 0.66;
  const coils = !pipes && seed > 0.33;
  return (
    <group>
      <Box s={[3.2, 1.0, 1.3]} p={[0, 0, -0.55]} c={S.a} />
      <Roof w={1.3} h={0.4} len={3.2} p={[0, 1.0, -0.55]} c={S.b} />
      <Box s={[0.8, 0.7, 0.04]} p={[-1.0, 0, 0.12]} c={D} />
      <Glow s={[1.6, 0.14, 0.02]} p={[0.6, 0.6, 0.12]} c="#f97316" on={on} />
      <Cyl rad={0.14} h={1.1} p={[1.3, 1.0, -0.9]} c={C.b} />
      <Smoke p={[1.3, 2.1, -0.9]} color="#9aa4b2" size={0.15} count={3} height={1} active={anim} visible={on} />
      <group position={[0, 0, 1.0]}>
        {pipes && [0, 1, 2].map((layer) => [0, 1, 2, 3].slice(layer).map((index) => <Pipe key={`${layer}-${index}`} rad={0.1} len={1.6} p={[0.4, 0.1 + layer * 0.17, -0.3 + index * 0.2 - layer * 0.1 + layer * 0.1]} c={tint.a} />))}
        {coils && [-1.1, -0.5, 0.1, 0.7].map((x) => (
          <mesh key={x} material={mat(tint.a)} position={[x, 0.28, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <torusGeometry args={[0.2, 0.09, 5, 10]} />
          </mesh>
        ))}
        {!pipes && !coils && [0, 1, 2, 3].map((layer) => <Box key={layer} s={[1.8, 0.08, 0.9]} p={[0, layer * 0.09, 0]} c={layer % 2 ? tint.c : tint.a} />)}
      </group>
      <Box s={[0.35, 0.3, 0.25]} p={[1.35, 0, 1.25]} c={FIXED.amber} />
    </group>
  );
}

function BatchPlant({ tint, anim }: ModelProps) {
  return (
    <group>
      {[-0.95, -0.25].map((x) => (
        <group key={x} position={[x, 0, -0.8]}>
          {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([lx, lz]) => <Box key={`${lx}${lz}`} s={[0.06, 0.9, 0.06]} p={[lx, 0, lz]} c={S.b} />)}
          <Cone rad={0.32} h={0.4} p={[0, 0.9, 0]} r={[Math.PI, 0, 0]} c={C.c} />
          <Cyl rad={0.32} h={1.4} p={[0, 1.3, 0]} c={C.c} />
          <Cone rad={0.34} h={0.2} p={[0, 2.7, 0]} c={tint.b} />
        </group>
      ))}
      <Box s={[2.2, 0.08, 0.3]} p={[0.65, 0.95, -0.55]} r={[0, 0, -0.55]} c={S.b} />
      <Box s={[0.8, 0.9, 0.8]} p={[1.15, 0, 0.15]} c={C.a} />
      <group position={[-0.4, 0, 0.9]} rotation={[0, 0.3, 0]}>
        <Box s={[1.3, 0.2, 0.45]} p={[0, 0.12, 0]} c={D} />
        <Box s={[0.35, 0.38, 0.45]} p={[0.5, 0.32, 0]} c={FIXED.amber} />
        <Spin axis="x" speed={2} active={anim} p={[-0.2, 0.55, 0]}>
          <group rotation={[0, 0, 0.25]}>
            <Pipe rad={0.24} len={0.8} c={tint.a} />
            <Box s={[0.8, 0.04, 0.5]} c={FIXED.orange} />
          </group>
        </Spin>
      </group>
    </group>
  );
}

function Glassworks({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <Box s={[2.4, 0.9, 1.4]} p={[-0.3, 0, 0.4]} c={C.a} />
      <Roof w={1.4} h={0.35} len={2.4} p={[-0.3, 0.9, 0.4]} c={S.b} />
      <Cone rad={0.65} h={2.6} p={[0.9, 0, -0.85]} c={TINTS.brick.a} seg={8} />
      <Glow s={[0.3, 0.3, 0.3]} p={[0.9, 2.3, -0.85]} c="#fb923c" on={on} />
      <Smoke p={[0.9, 2.6, -0.85]} color="#c6d1de" size={0.18} count={3} active={anim} visible={on} />
      <Glow s={[1.8, 0.2, 0.02]} p={[-0.3, 0.5, 1.11]} c="#fb923c" on={on} />
      {[0, 1, 2, 3].map((index) => <Box key={index} s={[0.04, 0.55, 0.55]} p={[-1.2 + index * 0.12, 0, -0.95]} c={tint.a} m={mat(tint.c, { rough: 0.15, metal: 0.2, opacity: 0.85 })} />)}
    </group>
  );
}

// ---------- Finished goods ----------

function Factory({ tint, on, anim, seed }: ModelProps) {
  const teeth = seed > 0.5 ? 4 : 3;
  const depth = 2.2;
  const toothW = depth / teeth;
  const glass = mat("#a6ecf7", { emissive: "#37c6de", glow: on ? 0.45 : 0.05, rough: 0.3 });
  return (
    <group>
      <Box s={[2.9, 0.9, depth]} p={[0, 0, -0.25]} c={TINTS.alu.c} />
      <Box s={[2.92, 0.12, depth + 0.02]} p={[0, 0.32, -0.25]} c={tint.a} />
      {Array.from({ length: teeth }, (_, index) => (
        <group key={index}>
          <Roof w={toothW} h={0.45} len={2.9} skew={1} p={[0, 0.9, -0.25 - depth / 2 + toothW * (index + 0.5)]} c={S.b} />
          <Box s={[2.8, 0.4, 0.02]} p={[0, 0.92, -0.25 - depth / 2 + toothW * index + 0.02]} c="#a6ecf7" m={glass} shadow={false} />
        </group>
      ))}
      <Box s={[0.7, 0.55, 0.04]} p={[-0.8, 0, 0.86]} c={D} />
      <Box s={[0.9, 0.3, 0.05]} p={[0.6, 0.5, 0.88]} c={tint.b} m={mat(tint.a, { emissive: tint.a, glow: on ? 0.35 : 0 })} />
      <Cyl rad={0.13} h={1.5} p={[seed > 0.5 ? 1.25 : -1.25, 0.9, -1.15]} c={C.b} />
      <Smoke p={[seed > 0.5 ? 1.25 : -1.25, 2.4, -1.15]} color="#9aa4b2" size={0.14} count={3} height={1} active={anim} visible={on} />
      {[-0.4, 0.4].map((x) => (
        <Spin key={x} axis="y" speed={5} active={anim} p={[x, 1.38, -0.25]}>
          <Box s={[0.32, 0.03, 0.06]} c={FIXED.slate} />
          <Box s={[0.06, 0.03, 0.32]} c={FIXED.slate} />
        </Spin>
      ))}
      <Box s={[0.45, 0.35, 0.35]} p={[1.3, 0, 1.3]} c={TINTS.wood.a} />
      <Box s={[0.35, 0.3, 0.3]} p={[0.85, 0, 1.4]} c={tint.a} />
    </group>
  );
}

function Lab({ tint, on, anim, seed }: ModelProps) {
  const glass = mat("#7dd3fc", { emissive: "#22d3ee", glow: on ? 0.5 : 0.05, rough: 0.2, metal: 0.3 });
  return (
    <group>
      <Box s={[2.4, 0.5, 1.8]} p={[-0.2, 0, -0.2]} c={W} />
      <Box s={[2.42, 0.3, 1.82]} p={[-0.2, 0.5, -0.2]} c="#7dd3fc" m={glass} />
      <Box s={[2.4, 0.5, 1.8]} p={[-0.2, 0.8, -0.2]} c={W} />
      <Box s={[2.44, 0.08, 1.84]} p={[-0.2, 1.3, -0.2]} c={tint.a} />
      <Dome rad={0.55} p={[-0.6, 1.38, -0.4]} c={FIXED.light} />
      <group position={[0.55, 1.38, -0.5]}>
        <Cyl rad={0.04} h={0.6} c={S.b} />
        <Spin axis="y" speed={1} active={anim} p={[0, 0.65, 0]}>
          <group rotation={[0.9, 0, 0]}>
            <Cone rad={0.3} h={0.12} c={W} seg={10} />
          </group>
        </Spin>
      </group>
      <Box s={[0.5, 0.45, 0.04]} p={[0.4, 0, 0.71]} c={D} />
      <Box s={[0.9, 0.1, 0.6]} p={[0.4, 0.45, 0.95]} c={tint.b} />
      {[-1.4, 1.4].map((x) => <Cone key={x} rad={0.25} h={0.6} p={[x, 0.15, 1.3 - seed * 0.3]} c={TINTS.bio.b} seg={6} />)}
      {[-1.4, 1.4].map((x) => <Cyl key={x} rad={0.05} h={0.15} p={[x, 0, 1.3 - seed * 0.3]} c={TINTS.wood.b} seg={5} />)}
    </group>
  );
}

function Hangar({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <mesh material={mat(S.c)} position={[-0.6, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 0.95, 2.6, 12, 1, false, Math.PI / 2, Math.PI]} />
      </mesh>
      <mesh material={mat(D)} position={[-0.6, 0, 1.19]}>
        <circleGeometry args={[0.85, 12, 0, Math.PI]} />
      </mesh>
      <Box s={[1.9, 0.1, 0.1]} p={[-0.6, 0, -1.4]} c={tint.a} />
      <group position={[1.15, 0, 0.5]}>
        <Box s={[0.9, 0.12, 0.9]} c={C.b} />
        {[-0.32, 0.32].map((x) => <Box key={x} s={[0.07, 2.3, 0.07]} p={[x, 0.12, -0.32]} c={FIXED.orange} />)}
        {[0.7, 1.4].map((y) => <Box key={y} s={[0.7, 0.05, 0.3]} p={[0, y, -0.2]} c={FIXED.orange} />)}
        <Cyl rad={0.2} h={1.6} p={[0, 0.3, 0]} c={W} />
        {[0, 1, 2].map((fin) => <Box key={fin} s={[0.04, 0.3, 0.22]} p={[Math.sin((fin * Math.PI * 2) / 3) * 0.2, 0.3, Math.cos((fin * Math.PI * 2) / 3) * 0.2]} r={[0, (fin * Math.PI * 2) / 3, 0]} c={tint.a} />)}
        <Cone rad={0.2} h={0.5} p={[0, 1.9, 0]} c={tint.a} />
        <Cone rad={0.16} h={0.2} p={[0, 0.12, 0]} c={D} />
      </group>
      <Box s={[0.6, 0.3, 0.4]} p={[1.1, 0, -1.2]} c={C.a} />
    </group>
  );
}

// ---------- Housing & storage ----------

function Housing({ seed }: ModelProps) {
  const homes: Array<[number, number, string, string]> = [
    [-0.9, -0.9, TINTS.lime.a, TINTS.brick.a],
    [0.8, -0.95, TINTS.sand.c, TINTS.red.b],
    [-0.95, 0.75, TINTS.silica.c, TINTS.water.b],
    [0.75, 0.8, TINTS.lime.c, TINTS.brick.b],
  ];
  return (
    <group>
      {homes.map(([x, z, wall, roof], index) => (
        <group key={index} position={[x, 0, z]} rotation={[0, ((index + Math.round(seed * 3)) % 2) * (Math.PI / 2), 0]}>
          <Box s={[1.0, 0.55, 0.8]} c={wall} />
          <Roof w={0.9} h={0.42} len={1.1} p={[0, 0.55, 0]} c={roof} />
          <Box s={[0.18, 0.3, 0.02]} p={[0.2, 0, 0.41]} c={TINTS.wood.b} />
          <Box s={[0.18, 0.14, 0.02]} p={[-0.25, 0.25, 0.41]} c="#ffe19a" m={mat("#ffe19a", { emissive: "#f5b83d", glow: 0.4 })} />
          <Box s={[0.12, 0.3, 0.12]} p={[0.35, 0.6, -0.15]} c={TINTS.brick.b} />
        </group>
      ))}
      <Cone rad={0.25} h={0.7} p={[0, 0.15, 0]} c={TINTS.bio.b} seg={6} />
      <Cyl rad={0.05} h={0.15} p={[0, 0, 0]} c={TINTS.wood.b} seg={5} />
    </group>
  );
}

function Warehouse({ tint, on, seed }: ModelProps) {
  return (
    <group>
      <Box s={[3.0, 1.1, 2.0]} p={[0, 0, -0.35]} c={tint.a} />
      <Roof w={2.0} h={0.55} len={3.04} p={[0, 1.1, -0.35]} c={tint.b} />
      {[-0.9, 0, 0.9].map((x) => <Box key={x} s={[0.6, 0.7, 0.03]} p={[x, 0, 0.66]} c={D} />)}
      <Box s={[3.0, 0.08, 0.3]} p={[0, 0.8, 0.8]} c={S.b} />
      <Glow s={[0.2, 0.08, 0.02]} p={[1.3, 0.9, 0.66]} c="#ffe19a" on={on} />
      {[[-1.2, 1.25], [-0.8, 1.35], [0.9 + seed * 0.3, 1.3]].map(([x, z], index) => <Box key={index} s={[0.35, 0.3, 0.35]} p={[x, 0, z]} c={TINTS.wood.a} />)}
      <Box s={[0.3, 0.3, 0.35]} p={[-1.0, 0.3, 1.3]} c={TINTS.wood.c} />
    </group>
  );
}

function MegaWarehouse(props: ModelProps) {
  const { tint } = props;
  return (
    <group>
      {[-1.0, 0.0, 1.0].map((z, index) => (
        <group key={z} position={[index === 1 ? 0.15 : -0.1, 0, z]}>
          <Box s={[3.1, 0.9, 0.85]} c={index === 1 ? tint.c : tint.a} />
          <Roof w={0.85} h={0.3} len={3.12} p={[0, 0.9, 0]} c={tint.b} />
          <Box s={[0.5, 0.55, 0.02]} p={[0.9, 0, 0.43]} c={D} />
        </group>
      ))}
    </group>
  );
}

function Silos({ tint }: ModelProps) {
  return (
    <group>
      {[-0.9, 0, 0.9].map((x, index) => (
        <group key={x} position={[x, 0, -0.4]}>
          <Cyl rad={0.42} h={2.2 - index * 0.15} c={C.c} seg={12} />
          <Cone rad={0.44} h={0.35} p={[0, 2.2 - index * 0.15, 0]} c={tint.b} seg={12} />
          <Cyl rad={0.43} h={0.06} p={[0, 1.0, 0]} c={tint.a} seg={12} />
        </group>
      ))}
      <Box s={[2.0, 0.12, 0.2]} p={[0, 2.3, -0.4]} c={S.b} />
      <Box s={[1.6, 0.6, 0.8]} p={[0.2, 0, 1.0]} c={C.a} />
      <Cone rad={0.4} h={0.35} p={[-1.2, 0, 1.2]} c={tint.a} seg={6} />
    </group>
  );
}

function Tanks({ tint }: ModelProps) {
  return (
    <group>
      {[[-0.75, -0.6, 0.75], [0.85, -0.5, 0.65], [0.0, 0.95, 0.55]].map(([x, z, rad]) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl rad={rad} h={1.0} c={W} seg={14} />
          <Cyl rad={rad + 0.02} h={0.12} p={[0, 0.55, 0]} c={tint.a} seg={14} />
          <Cyl rad={rad} top={rad * 0.7} h={0.18} p={[0, 1.0, 0]} c={FIXED.light} seg={14} />
        </group>
      ))}
      <Pipe rad={0.06} len={2.0} p={[0, 0.2, 0.2]} c={S.b} />
    </group>
  );
}

function Gasholder({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <Cyl rad={1.15} h={0.12} c={C.b} seg={14} />
      <Cyl rad={1.0} h={1.5} p={[0, 0.12, 0]} c={tint.a} seg={14} />
      <Cyl rad={0.92} h={0.4} p={[0, 1.62, 0]} c={tint.c} seg={14} />
      <mesh material={mat(TINTS.red.b, { wire: true })} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 2.2, 10, 3, true]} />
      </mesh>
      <Glow s={[0.1, 0.1, 0.1]} p={[0, 2.3, 0]} c="#e0602f" on={on && anim} />
    </group>
  );
}

function CryoTanks({ tint, on, anim }: ModelProps) {
  return (
    <group>
      {[[-0.7, -0.5], [0.8, 0.3]].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          {[[-0.3, 0], [0.3, 0], [0, 0.35], [0, -0.35]].map(([lx, lz]) => <Box key={`${lx}${lz}`} s={[0.07, 0.55, 0.07]} p={[lx, 0, lz]} c={S.b} />)}
          <Ball rad={0.65} p={[0, 1.15, 0]} c={W} seg={12} />
          <Cyl rad={0.67} h={0.1} p={[0, 1.1, 0]} c={tint.a} seg={12} />
          <Smoke p={[0, 0.3, 0]} color="#e2f6fb" size={0.18} height={0.4} count={3} active={anim} visible={on} />
        </group>
      ))}
      <Box s={[0.8, 0.5, 0.6]} p={[-0.9, 0, 1.15]} c={C.a} />
    </group>
  );
}

function Vault({ tint, on }: ModelProps) {
  return (
    <group>
      <Box s={[2.8, 1.0, 2.2]} p={[0, 0, -0.4]} c={C.a} />
      <Box s={[3.0, 0.15, 2.4]} p={[0, 1.0, -0.4]} c={C.b} />
      <Box s={[2.82, 0.16, 2.22]} p={[0, 0.15, -0.4]} c={FIXED.amber} />
      <mesh material={mat(tint.a, { metal: 0.6, rough: 0.35 })} position={[0, 0.5, 0.72]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.1, 12]} />
      </mesh>
      <Box s={[0.5, 0.06, 0.04]} p={[0, 0.48, 0.79]} c={D} />
      <Glow s={[0.12, 0.12, 0.04]} p={[0.65, 0.65, 0.71]} c={tint.c} on={on} />
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x) => <Box key={x} s={[0.05, 0.5, 0.05]} p={[x, 0, 1.4]} c={S.b} />)}
      <Box s={[3.2, 0.03, 0.03]} p={[0, 0.45, 1.4]} c={S.b} />
    </group>
  );
}

/** Generic workshop used for any facility without a dedicated model. */
export function FallbackModel({ tint, on, anim }: ModelProps) {
  return (
    <group>
      <Box s={[2.4, 1.0, 1.8]} p={[0, 0, -0.2]} c={C.a} />
      <Roof w={1.8} h={0.45} len={2.4} p={[0, 1.0, -0.2]} c={tint.b} />
      <Box s={[0.7, 0.6, 0.03]} p={[-0.5, 0, 0.71]} c={D} />
      <Glow s={[0.7, 0.14, 0.02]} p={[0.55, 0.55, 0.71]} c="#ffe19a" on={on} />
      <Cyl rad={0.12} h={1.8} p={[1.0, 0, -0.9]} c={S.b} />
      <Smoke p={[1.0, 1.8, -0.9]} size={0.15} count={3} active={anim} visible={on} />
      <Box s={[0.4, 0.35, 0.4]} p={[1.2, 0, 1.2]} c={tint.a} />
    </group>
  );
}

// ---------- Registry ----------

const ARCHETYPES = {
  powerStation: PowerStation, solarFarm: SolarFarm, windFarm: WindFarm,
  headframeMine: HeadframeMine, quarry: Quarry, bucketExcavator: BucketExcavator, derrick: Derrick,
  pumpStation: PumpStation, gasWell: GasWell, harvester: Harvester, iceMine: IceMine,
  blastFurnace: BlastFurnace, smelter: Smelter, cokeOven: CokeOven, rotaryKiln: RotaryKiln, refinery: Refinery,
  chemPlant: ChemPlant, waterTreatment: WaterTreatment, centrifuge: Centrifuge, rollingMill: RollingMill,
  batchPlant: BatchPlant, glassworks: Glassworks, factory: Factory, lab: Lab, hangar: Hangar,
  housing: Housing, warehouse: Warehouse, megaWarehouse: MegaWarehouse, silos: Silos, tanks: Tanks,
  gasholder: Gasholder, cryoTanks: CryoTanks, vault: Vault, fallback: FallbackModel,
} satisfies Record<string, ComponentType<ModelProps>>;

type Archetype = keyof typeof ARCHETYPES;

/** Archetype + tint per facility. Tints follow each facility's sprite / main product colour. */
const FACILITY_MODELS: Record<FacilityId, [Archetype, TintName]> = {
  // Power
  coalGenerator: ["powerStation", "coal"], solarPanels: ["solarFarm", "cyan"], windTurbines: ["windFarm", "steel"],
  // Extraction
  ironOreMine: ["headframeMine", "iron"], copperMine: ["headframeMine", "copper"], goldMine: ["headframeMine", "gold"],
  silverMine: ["headframeMine", "silver"], titaniumMine: ["headframeMine", "titanium"], uraniumMine: ["headframeMine", "uranium"],
  tungstenMine: ["headframeMine", "tungsten"], rareEarthMine: ["headframeMine", "rare"], bauxiteMine: ["quarry", "bauxite"],
  silicaQuarry: ["quarry", "silica"], limestoneQuarry: ["quarry", "lime"], sandDredge: ["quarry", "sand"],
  coalExcavator: ["bucketExcavator", "coal"], quicklimeHarvester: ["bucketExcavator", "lime"],
  oilRig: ["derrick", "oil"], waterPump: ["pumpStation", "water"], lithiumWell: ["pumpStation", "lithium"],
  gasExtractionPlant: ["gasWell", "gas"], sulfurExtractor: ["gasWell", "sulfur"], biomassHarvester: ["harvester", "bio"],
  glacierIceMine: ["iceMine", "silica"],
  // Processing
  blastFurnace: ["blastFurnace", "iron"], copperFoundry: ["smelter", "copper"], aluminumSmelter: ["smelter", "alu"],
  titaniumSmelter: ["smelter", "titanium"], alloyFoundry: ["smelter", "purple"], compositeFoundry: ["smelter", "tungsten"],
  preciousMetalRefinery: ["smelter", "gold"], tungstenProcessor: ["smelter", "tungsten"],
  cokeOven: ["cokeOven", "coal"], limeKiln: ["rotaryKiln", "lime"],
  oilRefinery: ["refinery", "fuel"], gasCracker: ["refinery", "gas"], biofuelPlant: ["refinery", "bio"],
  quartzPurifier: ["chemPlant", "silica"], acidPlant: ["chemPlant", "sulfur"], polymerPlant: ["chemPlant", "plastic"],
  lithiumProcessor: ["chemPlant", "lithium"], rareEarthSeparator: ["chemPlant", "rare"], coolantFactory: ["chemPlant", "water"],
  rubberVulcanizer: ["chemPlant", "rubber"], waterPurificationPlant: ["waterTreatment", "cyan"], centrifuge: ["centrifuge", "uranium"],
  rollingMill: ["rollingMill", "steel"], wireMill: ["rollingMill", "copper"], pipeMill: ["rollingMill", "titanium"],
  steelBeamMill: ["rollingMill", "steel"], hardwarePress: ["rollingMill", "silver"],
  concreteBatchPlant: ["batchPlant", "concrete"], glassworks: ["glassworks", "silica"], glassPanePlant: ["glassworks", "gas"],
  fiberglassMill: ["glassworks", "plastic"],
  // Manufacturing
  electronicsAssembler: ["factory", "copper"], phoneFactory: ["factory", "coal"], circuitShop: ["factory", "circuit"],
  motorFactory: ["factory", "copper"], pumpAssembler: ["factory", "red"], batteryFactory: ["factory", "amber"],
  solarCellPlant: ["factory", "cyan"], machiningShop: ["factory", "steel"], cableInsulationPlant: ["factory", "rubber"],
  engineWorks: ["factory", "iron"], fuelCellPlant: ["factory", "cyan"], valveWorkshop: ["factory", "cyan"],
  transformerPlant: ["factory", "copper"], chassisAssembly: ["factory", "tungsten"], batteryPackPlant: ["factory", "circuit"],
  fiberOpticsWorks: ["factory", "cyan"], roboticsFactory: ["factory", "amber"], controlSystemFacility: ["factory", "amber"],
  pcbAssemblyLine: ["factory", "gold"], fuelInjectorLine: ["factory", "fuel"], radiatorWorks: ["factory", "red"],
  powerElectronicsPlant: ["factory", "steel"],
  semiconductorCleanroom: ["lab", "cyan"], sensorCleanroom: ["lab", "red"], superconductorLab: ["lab", "cyan"],
  quantumComputerLab: ["lab", "purple"], matrixIntegrationPlant: ["lab", "purple"], ionPropulsionLab: ["lab", "purple"],
  avionicsWorkshop: ["lab", "silver"], lifeSupportWorks: ["lab", "bio"], nuclearFuelFabricator: ["lab", "uranium"],
  rocketEngineFacility: ["hangar", "red"], satelliteHangar: ["hangar", "cyan"], orbitalHullFabricator: ["hangar", "silver"],
  vesselFabricationYard: ["hangar", "steel"],
  // Housing & storage
  workerHousing: ["housing", "brick"], warehouse: ["warehouse", "steel"], megaWarehouseArray: ["megaWarehouse", "amber"],
  oreSilo: ["silos", "concrete"], liquidStorageTank: ["tanks", "water"], gasGasholder: ["gasholder", "gas"],
  cryogenicStorageTank: ["cryoTanks", "silica"], hazardousVault: ["vault", "amber"], highSecurityVault: ["vault", "gold"],
  radioactiveVault: ["vault", "uranium"],
};

/**
 * Drop-in replacements keyed by facility ID (e.g. a Kenney glTF wrapped in a component that
 * accepts ModelProps). Anything registered here wins over the code-generated model.
 */
const MODEL_OVERRIDES: Partial<Record<FacilityId, ComponentType<ModelProps>>> = {};

export function registerFacilityModel(facilityId: FacilityId, model: ComponentType<ModelProps>) {
  MODEL_OVERRIDES[facilityId] = model;
}

export type ResolvedModel = { Model: ComponentType<ModelProps>; tint: Tint; seed: number; archetype: string };

export function getFacilityModel(facilityId: string): ResolvedModel {
  const entry = FACILITY_MODELS[facilityId as FacilityId];
  const override = MODEL_OVERRIDES[facilityId as FacilityId];
  const archetype: Archetype = entry?.[0] ?? "fallback";
  return {
    Model: override ?? ARCHETYPES[archetype] ?? FallbackModel,
    tint: TINTS[entry?.[1] ?? "steel"],
    seed: hashUnit(facilityId),
    archetype: override ? "override" : archetype,
  };
}
