// 3D operations map (lazy-loaded). Visual only: reads facility state and reports clicks,
// never mutates game state.
import { Html, MapControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import type { FacilityId, GameState } from "../../game/state/types";
import { buildCityLayout, LOT_PAD, LOT_PITCH, STREET, type CityLayout, type District } from "./cityLayout";
import { getFacilityModel } from "./models";
import { SCENE, STATUS_COLORS } from "./palette";
import { Ball, Box, Cyl, hashUnit, mat } from "./primitives";

type Facility = GameState["facilities"][FacilityId];

export type FactoryMap3DProps = {
  facilities: Facility[];
  onSelect: (facilityId: FacilityId) => void;
  reducedMotion: boolean;
  /** Grid demand exceeds production (starved powered facilities are shown as "no power"). */
  powerShort: boolean;
  flashKeys: Partial<Record<FacilityId, number>>;
};

/** Canvas aspect below which the starting camera looks along the city's long axis. */
const PORTRAIT_ASPECT = 0.9;

type StatusKey = keyof typeof STATUS_COLORS;
type StatusInfo = { key: StatusKey; label: string };

function statusOf(facility: Facility, powerShort: boolean): StatusInfo {
  switch (facility.status) {
    case "online":
      return { key: "running", label: "Running" };
    case "starved":
      return powerShort && facility.powerConsumption > 0 ? { key: "noPower", label: "No power" } : { key: "idle", label: "Idle: waiting for inputs" };
    case "storage-full":
      return { key: "full", label: "Idle: storage full" };
    default:
      return { key: "off", label: facility.active ? "Offline" : "Paused" };
  }
}

/** Level shows as footprint and height growth, capped so buildings stay on their lot. */
function levelScale(level: number): [number, number, number] {
  const step = Math.min(Math.max(level, 1) - 1, 6);
  const wide = 0.9 + step * 0.045;
  return [wide, 0.9 + step * 0.085, wide];
}

/** Small screens and touch devices: lower pixel ratio, no real-time shadows. */
function detectLowPower(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return coarse || window.innerWidth < 760;
}

const STATUS_MATERIALS = Object.fromEntries(
  Object.entries(STATUS_COLORS).map(([key, color]) => [key, mat(color, { emissive: color, glow: key === "off" ? 0.1 : 1.3 })]),
) as Record<StatusKey, THREE.MeshStandardMaterial>;

function StatusLight({ status, blink }: { status: StatusKey; blink: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.visible = !blink || Math.sin(clock.elapsedTime * 6) > -0.4;
  });
  return (
    <group position={[LOT_PAD / 2 - 0.25, 0, LOT_PAD / 2 - 0.25]}>
      <Cyl rad={0.04} h={0.55} c="#3a4252" seg={5} shadow={false} />
      <mesh ref={ref} position={[0, 0.62, 0]} material={STATUS_MATERIALS[status]}>
        <sphereGeometry args={[0.12, 8, 6]} />
      </mesh>
    </group>
  );
}

const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
const hitGeometry = new THREE.BoxGeometry(1, 1, 1);
const ringGeometry = new THREE.RingGeometry(LOT_PAD * 0.5, LOT_PAD * 0.5 + 0.16, 4, 1).rotateX(-Math.PI / 2).rotateY(Math.PI / 4);
const ringMaterial = mat(SCENE.hover, { emissive: SCENE.hover, glow: 1.2 });

type BuildingProps = {
  facility: Facility;
  x: number;
  z: number;
  status: StatusInfo;
  hovered: boolean;
  motion: boolean;
  flashKey?: number;
  onHover: React.Dispatch<React.SetStateAction<FacilityId | null>>;
  onSelect: (facilityId: FacilityId) => void;
};

const Building = memo(function Building({ facility, x, z, status, hovered, motion, flashKey, onHover, onSelect }: BuildingProps) {
  const { Model, tint, seed } = useMemo(() => getFacilityModel(facility.id), [facility.id]);
  const scale = levelScale(facility.level);
  const running = status.key === "running";
  const bodyRef = useRef<THREE.Group>(null);
  const popStart = useRef(-1);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (flashKey !== undefined && motion) popStart.current = performance.now();
  }, [flashKey, motion]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;
    let pop = hovered ? 1.04 : 1;
    if (popStart.current >= 0) {
      const t = (performance.now() - popStart.current) / 600;
      if (t >= 1) popStart.current = -1;
      else pop *= 1 + Math.sin(t * Math.PI) * 0.18;
    }
    body.scale.set(scale[0] * pop, scale[1] * pop, scale[2] * pop);
  });
  useEffect(() => invalidate(), [hovered, invalidate]);

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onHover(facility.id);
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta > 8) return; // it was a drag, not a click
    onSelect(facility.id);
  };

  return (
    <group position={[x, 0.18, z]}>
      <group ref={bodyRef} scale={scale}>
        <Model tint={tint} on={running} anim={running && motion} seed={seed} />
      </group>
      <StatusLight status={status.key} blink={status.key === "noPower" && motion} />
      {hovered && <mesh geometry={ringGeometry} material={ringMaterial} position={[0, 0.02, 0]} />}
      <mesh
        geometry={hitGeometry}
        material={hitMaterial}
        position={[0, 1.4 * scale[1], 0]}
        scale={[LOT_PAD, 2.8 * scale[1], LOT_PAD]}
        onPointerOver={handleOver}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHover((current) => (current === facility.id ? null : current));
        }}
        onClick={handleClick}
      />
      {hovered && (
        <Html position={[0, 3.2 * scale[1], 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
          <div className="map3d-tip">
            <strong>{facility.name}</strong>
            <span>Lv {facility.level} · <i className={`map3d-dot status-${status.key}`} />{status.label}</span>
          </div>
        </Html>
      )}
    </group>
  );
});

function EmptyLot({ x, z }: { x: number; z: number }) {
  const half = LOT_PAD / 2 - 0.2;
  const len = 0.7;
  const marker = mat(SCENE.emptyMarker, { opacity: 0.5 });
  return (
    <group position={[x, 0.13, z]}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <group key={`${sx}${sz}`}>
          <Box s={[len, 0.02, 0.08]} p={[sx * (half - len / 2), 0, sz * half]} c={SCENE.emptyMarker} m={marker} shadow={false} />
          <Box s={[0.08, 0.02, len]} p={[sx * half, 0, sz * (half - len / 2)]} c={SCENE.emptyMarker} m={marker} shadow={false} />
        </group>
      ))}
      <Box s={[0.5, 0.02, 0.08]} c={SCENE.emptyMarker} m={marker} shadow={false} />
      <Box s={[0.08, 0.02, 0.5]} c={SCENE.emptyMarker} m={marker} shadow={false} />
    </group>
  );
}

function DistrictBlock({ district, portrait }: { district: District; portrait: boolean }) {
  // Label sits on the street along the block's far edge as seen from the starting camera.
  const labelPosition: [number, number, number] = portrait ? [district.x - 0.95, 0.2, district.z + district.d / 2] : [district.x + district.w / 2, 0.2, district.z - 0.95];
  return (
    <group>
      <Box s={[district.w, 0.12, district.d]} p={[district.x + district.w / 2, 0, district.z + district.d / 2]} c={SCENE.sidewalk} shadow={false} />
      {district.lots.map((lot) => (
        <Box key={`${lot.x},${lot.z}`} s={[LOT_PAD, 0.05, LOT_PAD]} p={[lot.x, 0.12, lot.z]} c={lot.facilityId ? SCENE.lot : SCENE.grassDark} shadow={false} />
      ))}
      {district.lots.filter((lot) => !lot.facilityId).map((lot) => <EmptyLot key={`e${lot.x},${lot.z}`} x={lot.x} z={lot.z} />)}
      <Html position={labelPosition} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className={`map3d-district map-group-${district.key}`}>{district.label}</div>
      </Html>
    </group>
  );
}

function Streets({ layout }: { layout: CityLayout }) {
  const dashRef = useRef<THREE.InstancedMesh>(null);
  // Each district block is wrapped in a ring of street; neighbouring rings merge into shared streets.
  const dashes = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ x: number; z: number; horizontal: boolean }> = [];
    const add = (x: number, z: number, horizontal: boolean) => {
      const key = `${Math.round(x * 2)},${Math.round(z * 2)},${horizontal}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ x, z, horizontal });
    };
    for (const district of layout.districts) {
      const half = STREET / 2;
      const x0 = district.x - half;
      const x1 = district.x + district.w + half;
      const z0 = district.z - half;
      const z1 = district.z + district.d + half;
      const DASH = 1.8;
      for (let x = Math.ceil((x0 + 0.8) / DASH) * DASH; x < x1 - 0.6; x += DASH) {
        add(x, z0, true);
        add(x, z1, true);
      }
      for (let z = Math.ceil((z0 + 0.8) / DASH) * DASH; z < z1 - 0.6; z += DASH) {
        add(x0, z, false);
        add(x1, z, false);
      }
    }
    return items;
  }, [layout]);
  useLayoutEffect(() => {
    const mesh = dashRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    dashes.forEach((dash, index) => {
      matrix.compose(new THREE.Vector3(dash.x, 0.02, dash.z), new THREE.Quaternion(), new THREE.Vector3(dash.horizontal ? 0.9 : 0.12, 0.02, dash.horizontal ? 0.12 : 0.9));
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dashes]);
  return (
    <group>
      {layout.districts.map((district) => (
        <mesh key={district.key} position={[district.x + district.w / 2, 0.005, district.z + district.d / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat(SCENE.asphalt)}>
          <planeGeometry args={[district.w + STREET * 2, district.d + STREET * 2]} />
        </mesh>
      ))}
      <instancedMesh key={dashes.length} ref={dashRef} args={[undefined, undefined, dashes.length]} material={mat(SCENE.laneMark, { emissive: SCENE.laneMark, glow: 0.15 })}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}

function Trees({ layout }: { layout: CityLayout }) {
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => {
    const { minX, maxX, minZ, maxZ } = layout.bounds;
    const items: Array<{ x: number; z: number; s: number }> = [];
    for (let index = 0; index < 140; index += 1) {
      const angle = hashUnit("tree", index) * Math.PI * 2;
      const ring = 2 + hashUnit("ring", index) * 16;
      const x = Math.cos(angle) * ((maxX - minX) / 2 + ring);
      const z = Math.sin(angle) * ((maxZ - minZ) / 2 + ring);
      const cx = (minX + maxX) / 2 + x;
      const cz = (minZ + maxZ) / 2 + z;
      if (cx > minX - 1.5 && cx < maxX + 1.5 && cz > minZ - 1.5 && cz < maxZ + 1.5) continue;
      items.push({ x: cx, z: cz, s: 0.7 + hashUnit("size", index) * 0.7 });
    }
    return items;
  }, [layout]);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    trees.forEach((tree, index) => {
      matrix.compose(new THREE.Vector3(tree.x, 0.35 * tree.s + 0.6 * tree.s, tree.z), quaternion, new THREE.Vector3(0.55 * tree.s, 1.2 * tree.s, 0.55 * tree.s));
      crownRef.current?.setMatrixAt(index, matrix);
      matrix.compose(new THREE.Vector3(tree.x, 0.2 * tree.s, tree.z), quaternion, new THREE.Vector3(0.1 * tree.s, 0.4 * tree.s, 0.1 * tree.s));
      trunkRef.current?.setMatrixAt(index, matrix);
    });
    if (crownRef.current) crownRef.current.instanceMatrix.needsUpdate = true;
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
  }, [trees]);
  return (
    <group>
      <instancedMesh key={`c${trees.length}`} ref={crownRef} args={[undefined, undefined, trees.length]} material={mat("#41792b")} castShadow>
        <coneGeometry args={[1, 1, 6]} />
      </instancedMesh>
      <instancedMesh key={`t${trees.length}`} ref={trunkRef} args={[undefined, undefined, trees.length]} material={mat("#5c4430")}>
        <cylinderGeometry args={[1, 1, 1, 5]} />
      </instancedMesh>
    </group>
  );
}

function CameraRig({ layout, controlsRef }: { layout: CityLayout; controlsRef: React.MutableRefObject<MapControlsImpl | null> }) {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera);
  const size = useThree((state) => state.size);
  const placed = useRef(false);
  useLayoutEffect(() => {
    if (placed.current || size.width === 0) return;
    placed.current = true;
    const { minX, maxX, minZ, maxZ } = layout.bounds;
    const aspect = size.width / size.height;
    // Portrait screens look along the city's long (x) axis so it fills the tall viewport.
    const portrait = aspect < PORTRAIT_ASPECT;
    const width = portrait ? maxZ - minZ : maxX - minX;
    const depth = portrait ? maxX - minX : maxZ - minZ;
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const distance = Math.max((width * 0.41) / Math.tan(hHalf), (depth * 0.47) / Math.tan(vHalf)) * (portrait ? 1.12 : 1);
    const direction = (portrait ? new THREE.Vector3(0.78, 0.8, 0.04) : new THREE.Vector3(0.2, 0.78, 0.72)).normalize();
    camera.position.copy(direction.multiplyScalar(distance));
    camera.lookAt(0, 0, 0);
    camera.far = distance * 6;
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.maxDistance = Math.max(distance * 1.4, 30);
      controls.update();
    }
  }, [camera, size, layout, controlsRef]);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    // Test hook (like window.__gameDebug): lets screenshot scripts frame a specific view.
    const debugWindow = window as typeof window & { __map3dDebug?: unknown };
    debugWindow.__map3dDebug = {
      bounds: layout.bounds,
      renderInfo: () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, programs: gl.info.programs?.length ?? 0 }),
      /** Where a facility's lot centre lands in the canvas, as 0..1 fractions. */
      screenOf: (facilityId: FacilityId) => {
        const lot = layout.districts.flatMap((district) => district.lots).find((item) => item.facilityId === facilityId);
        if (!lot) return null;
        const point = new THREE.Vector3(lot.x, 0.8, lot.z).project(camera);
        return [(point.x + 1) / 2, (1 - point.y) / 2];
      },
      setView: (position: [number, number, number], target: [number, number, number]) => {
        camera.position.set(...position);
        controlsRef.current?.target.set(...target);
        controlsRef.current?.update();
        invalidate();
      },
    };
    return () => {
      delete debugWindow.__map3dDebug;
    };
  }, [camera, controlsRef, layout, invalidate, gl]);
  return null;
}

type SceneProps = FactoryMap3DProps & {
  lowPower: boolean;
  hovered: FacilityId | null;
  setHovered: React.Dispatch<React.SetStateAction<FacilityId | null>>;
};

function Scene({ facilities, onSelect, reducedMotion, powerShort, flashKeys, lowPower, hovered, setHovered }: SceneProps) {
  const builtKey = facilities.map((facility) => facility.id).sort().join("|");
  // Layout depends only on which facilities exist, so lots never reshuffle on upgrades or status changes.
  const layout = useMemo(() => buildCityLayout(facilities), [builtKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = new Map(facilities.map((facility) => [facility.id, facility]));
  const controlsRef = useRef<MapControlsImpl | null>(null);
  const size = useThree((state) => state.size);
  const motion = !reducedMotion;
  const [portrait] = useState(() => size.width > 0 && size.width / size.height < PORTRAIT_ASPECT);
  const { minX, maxX, minZ, maxZ } = layout.bounds;
  const span = Math.max(maxX - minX, maxZ - minZ);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
  }, [hovered]);
  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);

  const clampTarget = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const target = controls.target;
    const x = THREE.MathUtils.clamp(target.x, minX + 2, maxX - 2);
    const z = THREE.MathUtils.clamp(target.z, minZ + 2, maxZ - 2);
    if (x !== target.x || z !== target.z || target.y !== 0) {
      const camera = controls.object;
      camera.position.x += x - target.x;
      camera.position.z += z - target.z;
      camera.position.y -= target.y;
      target.set(x, 0, z);
    }
  };

  return (
    <>
      <color attach="background" args={[SCENE.background]} />
      <fog attach="fog" args={[SCENE.background, span * 1.1, span * 3.2]} />
      <hemisphereLight args={["#e0f2fe", "#3d5e47", 1.1]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[span * 0.35, span * 0.7, span * 0.45]}
        intensity={2.1}
        color="#fff4e0"
        castShadow={!lowPower}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
        shadow-camera-left={-span * 0.65}
        shadow-camera-right={span * 0.65}
        shadow-camera-top={span * 0.65}
        shadow-camera-bottom={-span * 0.65}
        shadow-camera-far={span * 3}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow material={mat(SCENE.grass)}>
        <planeGeometry args={[span * 8, span * 8]} />
      </mesh>
      <Streets layout={layout} />
      <Trees layout={layout} />
      {layout.districts.map((district) => <DistrictBlock key={district.key} district={district} portrait={portrait} />)}
      {layout.districts.flatMap((district) => district.lots).map((lot) => {
        const facility = lot.facilityId ? byId.get(lot.facilityId) : undefined;
        if (!facility) return null;
        return (
          <Building
            key={facility.id}
            facility={facility}
            x={lot.x}
            z={lot.z}
            status={statusOf(facility, powerShort)}
            hovered={hovered === facility.id}
            motion={motion}
            flashKey={flashKeys[facility.id]}
            onHover={setHovered}
            onSelect={onSelect}
          />
        );
      })}
      <MapControls
        ref={controlsRef}
        makeDefault
        enableDamping={motion}
        dampingFactor={0.12}
        minDistance={LOT_PITCH * 1.6}
        maxDistance={span * 1.6}
        minPolarAngle={0.2}
        maxPolarAngle={1.18}
        zoomSpeed={0.9}
        onChange={clampTarget}
      />
      <CameraRig layout={layout} controlsRef={controlsRef} />
    </>
  );
}

export default function FactoryMap3D(props: FactoryMap3DProps) {
  const [lowPower] = useState(detectLowPower);
  const [hovered, setHovered] = useState<FacilityId | null>(null);
  return (
    <Canvas
      className="map3d-canvas"
      shadows={!lowPower}
      dpr={lowPower ? [1, 1.5] : [1, 2]}
      frameloop={props.reducedMotion ? "demand" : "always"}
      camera={{ fov: 40, near: 0.5, far: 600, position: [20, 40, 30] }}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      onPointerMissed={() => setHovered(null)}
    >
      <Scene {...props} lowPower={lowPower} hovered={hovered} setHovered={setHovered} />
    </Canvas>
  );
}
