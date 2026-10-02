// Small low-poly building blocks shared by every facility model.
// Geometries and materials are cached so dozens of buildings share GPU resources.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

export type Vec3 = [number, number, number];

type MatOptions = { emissive?: string; glow?: number; metal?: number; rough?: number; opacity?: number; wire?: boolean };
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/** Shared flat-shaded material for a colour (+ optional glow). */
export function mat(color: string, options: MatOptions = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${options.emissive ?? ""}|${options.glow ?? 0}|${options.metal ?? 0.08}|${options.rough ?? 0.82}|${options.opacity ?? 1}|${options.wire ? 1 : 0}`;
  let material = materialCache.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: options.rough ?? 0.82,
      metalness: options.metal ?? 0.08,
      emissive: options.emissive ?? "#000000",
      emissiveIntensity: options.glow ?? 0,
      transparent: (options.opacity ?? 1) < 1,
      opacity: options.opacity ?? 1,
      wireframe: options.wire ?? false,
    });
    materialCache.set(key, material);
  }
  return material;
}

const geometryCache = new Map<string, THREE.BufferGeometry>();
function cachedGeometry(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = make();
    geometryCache.set(key, geometry);
  }
  return geometry;
}

const unitBox = () => cachedGeometry("box", () => new THREE.BoxGeometry(1, 1, 1));

type Common = { p?: Vec3; r?: Vec3; c: string; m?: THREE.Material; shadow?: boolean };

/** Box sitting on its base: `p` is the bottom-centre. */
export function Box({ s, p = [0, 0, 0], r, c, m, shadow = true }: Common & { s: Vec3 }) {
  return (
    <mesh geometry={unitBox()} material={m ?? mat(c)} position={[p[0], p[1] + s[1] / 2, p[2]]} rotation={r} scale={s} castShadow={shadow} receiveShadow />
  );
}

/** Cylinder (or frustum) sitting on its base. */
export function Cyl({ rad, top, h, p = [0, 0, 0], r, c, m, seg = 10, open = false, shadow = true }: Common & { rad: number; top?: number; h: number; seg?: number; open?: boolean }) {
  const geometry = cachedGeometry(`cyl|${top ?? rad}|${rad}|${seg}|${open}`, () => new THREE.CylinderGeometry(top ?? rad, rad, 1, seg, 1, open));
  return <mesh geometry={geometry} material={m ?? mat(c)} position={[p[0], p[1] + h / 2, p[2]]} rotation={r} scale={[1, h, 1]} castShadow={shadow} receiveShadow />;
}

/** Cylinder centred on `p` and lying along the X axis (pipes, rollers, kilns). */
export function Pipe({ rad, len, p = [0, 0, 0], r, c, m, seg = 8 }: Common & { rad: number; len: number; seg?: number }) {
  const geometry = cachedGeometry(`pipe|${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg).rotateZ(Math.PI / 2));
  return <mesh geometry={geometry} material={m ?? mat(c)} position={p} rotation={r} scale={[len, rad, rad]} castShadow receiveShadow />;
}

export function Cone({ rad, h, p = [0, 0, 0], r, c, m, seg = 8 }: Common & { rad: number; h: number; seg?: number }) {
  const geometry = cachedGeometry(`cone|${seg}`, () => new THREE.ConeGeometry(1, 1, seg));
  return <mesh geometry={geometry} material={m ?? mat(c)} position={[p[0], p[1] + h / 2, p[2]]} rotation={r} scale={[rad, h, rad]} castShadow receiveShadow />;
}

export function Ball({ rad, p = [0, 0, 0], c, m, seg = 8, squash = 1 }: Common & { rad: number; seg?: number; squash?: number }) {
  const geometry = cachedGeometry(`ball|${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(4, Math.round(seg * 0.6))));
  return <mesh geometry={geometry} material={m ?? mat(c)} position={p} scale={[rad, rad * squash, rad]} castShadow receiveShadow />;
}

/** Half-dome on top of a tank or lab. */
export function Dome({ rad, p = [0, 0, 0], c, m, seg = 10 }: Common & { rad: number; seg?: number }) {
  const geometry = cachedGeometry(`dome|${seg}`, () => new THREE.SphereGeometry(1, seg, 5, 0, Math.PI * 2, 0, Math.PI / 2));
  return <mesh geometry={geometry} material={m ?? mat(c)} position={p} scale={[rad, rad, rad]} castShadow receiveShadow />;
}

/**
 * Triangular prism along X: a gable roof (`skew` 0) or a sawtooth tooth (`skew` 1).
 * `p` is the centre of the base.
 */
export function Roof({ w, h, len, p = [0, 0, 0], r, c, m, skew = 0 }: Common & { w: number; h: number; len: number; skew?: 0 | 1 }) {
  const geometry = cachedGeometry(`roof|${skew}`, () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, 0);
    shape.lineTo(0.5, 0);
    shape.lineTo(skew ? 0.5 : 0, 1);
    shape.closePath();
    const extruded = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
    extruded.translate(0, 0, -0.5);
    extruded.rotateY(Math.PI / 2);
    return extruded;
  });
  return <mesh geometry={geometry} material={m ?? mat(c)} position={p} rotation={r} scale={[len, h, w]} castShadow receiveShadow />;
}

const towerInside = new THREE.MeshStandardMaterial({ color: "#3a4252", side: THREE.BackSide, flatShading: true, roughness: 1 });

/** Hyperboloid cooling tower shell (open top, darker inside). */
export function CoolingTower({ rad, h, p = [0, 0, 0], c }: { rad: number; h: number; p?: Vec3; c: string }) {
  const geometry = cachedGeometry("tower", () => {
    const points = [
      new THREE.Vector2(1, 0),
      new THREE.Vector2(0.86, 0.25),
      new THREE.Vector2(0.66, 0.6),
      new THREE.Vector2(0.62, 0.78),
      new THREE.Vector2(0.68, 1),
    ];
    return new THREE.LatheGeometry(points, 12);
  });
  return (
    <group position={p}>
      <mesh geometry={geometry} material={mat(c)} scale={[rad, h, rad]} castShadow receiveShadow />
      <mesh geometry={geometry} material={towerInside} scale={[rad * 0.97, h * 0.995, rad * 0.97]} />
    </group>
  );
}

/** Rotates its children around one axis while `active`. */
export function Spin({ axis = "y", speed = 1, active, p, children }: { axis?: "x" | "y" | "z"; speed?: number; active: boolean; p?: Vec3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (active && ref.current) ref.current.rotation[axis] += delta * speed;
  });
  return <group ref={ref} position={p}>{children}</group>;
}

/** Rocks its children back and forth (pumpjack beams). */
export function Rock({ axis = "z", amount = 0.3, speed = 2, active, p, children }: { axis?: "x" | "y" | "z"; amount?: number; speed?: number; active: boolean; p?: Vec3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (active && ref.current) ref.current.rotation[axis] = Math.sin(clock.elapsedTime * speed) * amount;
  });
  return <group ref={ref} position={p}>{children}</group>;
}

/**
 * Rising puffs of smoke or steam. Animated only while `active`; when `visible` but not
 * animated (reduced motion) a static plume is shown so the building still reads as running.
 */
export function Smoke({ p = [0, 0, 0], color = "#9aa4b2", size = 0.22, height = 1.6, count = 4, active, visible }: { p?: Vec3; color?: string; size?: number; height?: number; count?: number; active: boolean; visible: boolean }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const materials = useMemo(() => Array.from({ length: count }, () => new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.5, flatShading: true, roughness: 1, depthWrite: false })), [color, count]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  const seed = useMemo(() => Math.random(), []);
  const geometry = cachedGeometry("puff", () => new THREE.IcosahedronGeometry(1, 0));
  useFrame(({ clock }) => {
    if (!active) return;
    const time = clock.elapsedTime * 0.35 + seed;
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const f = (time + index / count) % 1;
      mesh.position.set(f * 0.35, f * height, f * 0.12);
      mesh.scale.setScalar(size * (0.55 + f * 1.1));
      materials[index].opacity = 0.55 * (1 - f);
    });
  });
  if (!visible) return null;
  return (
    <group position={p}>
      {materials.map((material, index) => {
        const f = (index + 0.5) / count;
        return (
          <mesh
            key={index}
            ref={(mesh) => {
              refs.current[index] = mesh;
            }}
            geometry={geometry}
            material={material}
            position={[f * 0.35, f * height, f * 0.12]}
            scale={size * (0.55 + f * 1.1)}
          />
        );
      })}
    </group>
  );
}

/** Flickering flare flame. */
export function Flame({ p = [0, 0, 0], size = 0.18, active, visible }: { p?: Vec3; size?: number; active: boolean; visible: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!active || !ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 13) * 0.12 + Math.sin(clock.elapsedTime * 7.3) * 0.08;
    ref.current.scale.set(s, s * 1.15, s);
  });
  if (!visible) return null;
  return (
    <group ref={ref} position={p}>
      <Cone rad={size} h={size * 3} c="#f5b83d" m={mat("#f5b83d", { emissive: "#f59e0b", glow: 1.4 })} />
      <Cone rad={size * 0.55} h={size * 2} c="#fff0a0" m={mat("#fff0a0", { emissive: "#ffe19a", glow: 1.6 })} p={[0, 0.02, 0]} />
    </group>
  );
}

/** Glowing panel (furnace mouths, windows). Glows only while running. */
export function Glow({ s, p, c = "#f59e0b", on }: { s: Vec3; p: Vec3; c?: string; on: boolean }) {
  return <Box s={s} p={p} c={c} shadow={false} m={on ? mat(c, { emissive: c, glow: 1.2 }) : mat("#3a4252")} />;
}

/** Deterministic pseudo-random number in [0, 1) from a string, for per-facility variation. */
export function hashUnit(text: string, salt = 0): number {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}
