export const APPROVED_GRASSROOTS_TIERS = [
  "Street Representative",
  "Line Coordinator",
  "Ward Coordinator",
  "Central Leadership",
] as const;

export const APPROVED_RESPONSIBILITY_PILLARS = [
  "Safety & Emergency Response",
  "Health & Wellbeing",
  "Education & Capacity Building",
  "Economic Linkages & Livelihoods",
  "Sanitation & Environment",
  "Data, Intelligence & Documentation",
  "Community Voice & Participation",
] as const;

type TopologyOption = { id: number; name: string };

export function assertApprovedTopologySelection(input: { tiers: TopologyOption[]; pillars: TopologyOption[]; tierId?: number; pillarIds: number[] }) {
  const approvedTierIds = new Set(input.tiers.filter(item => (APPROVED_GRASSROOTS_TIERS as readonly string[]).includes(item.name)).map(item => item.id));
  const approvedPillarIds = new Set(input.pillars.filter(item => (APPROVED_RESPONSIBILITY_PILLARS as readonly string[]).includes(item.name)).map(item => item.id));
  if (input.tierId && !approvedTierIds.has(input.tierId)) throw new Error("The selected grassroots tier is not an approved ISEYC tier.");
  if (input.pillarIds.some(id => !approvedPillarIds.has(id))) throw new Error("One or more selected Responsibility Pillars are not approved ISEYC pillars.");
}
