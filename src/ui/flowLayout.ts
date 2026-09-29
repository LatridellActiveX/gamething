import type { FacilityId, GameState, ResourceId } from "../game/state/types";

type Facility = GameState["facilities"][FacilityId];

export type FlowGroupKey = "power" | "extraction" | "processing" | "finished" | "support";
export type FlowGroup = { key: FlowGroupKey; label: string; facilities: Facility[] };

const GROUP_ORDER: Array<{ key: FlowGroupKey; label: string }> = [
  { key: "power", label: "Power generation" },
  { key: "extraction", label: "Raw extraction" },
  { key: "processing", label: "Processing" },
  { key: "finished", label: "Finished goods" },
  { key: "support", label: "Housing & storage" },
];

const materialKeys = (rates: Facility["inputRate"]) => (Object.keys(rates) as ResourceId[]).filter((resourceId) => resourceId !== "power");
const byTierThenName = (a: Facility, b: Facility) => a.tier - b.tier || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

/**
 * Lay out built facilities by production chain (visual only):
 * power generators get their own group, then raw extraction -> processing -> finished goods,
 * then housing/storage. "Finished goods" are facilities whose outputs no other built facility consumes.
 * Inside each group, facilities are ordered with a few barycenter sweeps so producers sit near
 * the consumers they feed, which keeps conveyor lines short and reduces crossings.
 * The result depends only on which facilities are built (plus static definitions), never on
 * levels or status, so the map doesn't reshuffle as things are upgraded.
 */
export function layoutFacilitiesByChain(facilities: Facility[]): FlowGroup[] {
  const sorted = [...facilities].sort(byTierThenName);
  const outputs = new Map(sorted.map((facility) => [facility.id, materialKeys(facility.outputRate)]));
  const inputs = new Map(sorted.map((facility) => [facility.id, materialKeys(facility.inputRate)]));

  const consumed = new Set<ResourceId>(sorted.flatMap((facility) => inputs.get(facility.id) ?? []));
  const producers = new Map<FacilityId, FacilityId[]>();
  const consumers = new Map<FacilityId, FacilityId[]>();
  for (const consumer of sorted) {
    const upstream = sorted.filter((producer) => producer.id !== consumer.id && (inputs.get(consumer.id) ?? []).some((resourceId) => (outputs.get(producer.id) ?? []).includes(resourceId)));
    producers.set(consumer.id, upstream.map((producer) => producer.id));
    for (const producer of upstream) consumers.set(producer.id, [...(consumers.get(producer.id) ?? []), consumer.id]);
  }

  const classify = (facility: Facility): FlowGroupKey => {
    const out = outputs.get(facility.id) ?? [];
    const inp = inputs.get(facility.id) ?? [];
    if (out.length === 0) return (facility.outputRate.power ?? 0) > 0 ? "power" : "support";
    if (inp.length === 0) return "extraction";
    return out.some((resourceId) => consumed.has(resourceId)) ? "processing" : "finished";
  };

  // Longest path from the raw end of the chain; seeds processing order so upstream steps come first.
  const depthMemo = new Map<FacilityId, number>();
  const depth = (id: FacilityId, trail = new Set<FacilityId>()): number => {
    const cached = depthMemo.get(id);
    if (cached !== undefined) return cached;
    if (trail.has(id)) return 0;
    trail.add(id);
    const upstream = producers.get(id) ?? [];
    const value = upstream.length === 0 ? 0 : 1 + Math.max(...upstream.map((producerId) => depth(producerId, trail)));
    trail.delete(id);
    depthMemo.set(id, value);
    return value;
  };

  const groups = new Map<FlowGroupKey, Facility[]>(GROUP_ORDER.map(({ key }) => [key, []]));
  for (const facility of sorted) groups.get(classify(facility))!.push(facility);
  groups.get("processing")!.sort((a, b) => depth(a.id) - depth(b.id) || byTierThenName(a, b));

  const position = new Map<FacilityId, number>();
  const refreshPositions = () => groups.forEach((members) => members.forEach((facility, index) => position.set(facility.id, index)));
  const barycenter = (ids: FacilityId[]) => {
    const known = ids.map((id) => position.get(id)).filter((value): value is number => value !== undefined);
    return known.length === 0 ? Number.POSITIVE_INFINITY : known.reduce((total, value) => total + value, 0) / known.length;
  };
  const reorder = (key: FlowGroupKey, neighbours: (id: FacilityId) => FacilityId[]) => {
    const members = groups.get(key)!;
    const current = new Map(members.map((facility, index) => [facility.id, index]));
    const score = new Map(members.map((facility) => [facility.id, barycenter(neighbours(facility.id))]));
    members.sort((a, b) => score.get(a.id)! - score.get(b.id)! || current.get(a.id)! - current.get(b.id)!);
    refreshPositions();
  };

  refreshPositions();
  const both = (id: FacilityId) => [...(producers.get(id) ?? []), ...(consumers.get(id) ?? [])];
  for (let sweep = 0; sweep < 4; sweep += 1) {
    reorder("extraction", (id) => consumers.get(id) ?? []);
    reorder("processing", both);
    reorder("finished", (id) => producers.get(id) ?? []);
    reorder("processing", both);
  }
  reorder("power", (id) => producers.get(id) ?? []);

  return GROUP_ORDER.map(({ key, label }) => ({ key, label, facilities: groups.get(key)! })).filter((group) => group.facilities.length > 0);
}
