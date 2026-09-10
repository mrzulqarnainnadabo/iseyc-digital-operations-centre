/**
 * Development Journey — experience layer over existing governed records.
 * No scoring, no AI assessment, no automatic promotion.
 */

import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import {
  developmentGrowthPlans,
  developmentParticipationRecords,
  memberCommunityAffiliations,
  memberPillarFocuses,
  mentorshipCheckIns,
  mentorshipRelationships,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { ensureDevelopmentProfile, getCommunityTopology } from "./service";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Development journey service is unavailable.");
  return db;
}

export type JourneyMilestoneKind =
  | "profile_established"
  | "focus_updated"
  | "participation_submitted"
  | "participation_confirmed"
  | "mentorship_requested"
  | "mentorship_approved"
  | "mentorship_check_in"
  | "affiliation_confirmed"
  | "growth_plan_active";

export type JourneyMilestone = {
  id: string;
  kind: JourneyMilestoneKind;
  title: string;
  at: string;
  status: "pending" | "confirmed" | "approved" | "active";
  detail?: string;
};

export type NextStep = {
  code: string;
  title: string;
  reason: string;
  destination: string;
};

export type DevelopmentJourneyView = {
  state: {
    hasActiveConsent: boolean;
    visibilityLevel: string;
    mentoringPreference: string;
    focusSummary: string | null;
    activeGrowthPlan: {
      id: number;
      focusPeriod: string;
      goalStatement: string;
      nextAction: string | null;
      status: string;
    } | null;
    mentorship: {
      status: string;
      role: "mentee" | "mentor" | "none";
      agreedFocus: string | null;
      relationshipId: number | null;
      latestCheckInAt: string | null;
    };
    pendingParticipationCount: number;
    confirmedContributionCount: number;
    pendingAffiliationCount: number;
  };
  nextStep: NextStep;
  milestones: JourneyMilestone[];
  contributions: Array<{
    id: number;
    title: string;
    participationType: string;
    status: "confirmed";
    confirmedAt: string | null;
    detail: string | null;
  }>;
  pendingParticipations: Array<{
    id: number;
    title: string;
    participationType: string;
    status: "pending";
    createdAt: string;
  }>;
  recentActivity: Array<{ label: string; at: string; tone: "pending" | "confirmed" }>;
};

function deriveNextStep(input: {
  hasActiveConsent: boolean;
  hasFocus: boolean;
  hasGrowthPlan: boolean;
  pendingParticipationCount: number;
  mentorshipStatus: string;
  hasCheckIn: boolean;
}): NextStep {
  if (!input.hasActiveConsent) {
    return {
      code: "complete_profile",
      title: "Complete your development profile",
      reason: "Active consent and visibility preferences are required before institutional development records can accumulate.",
      destination: "/development#profile-settings",
    };
  }
  if (!input.hasFocus && !input.hasGrowthPlan) {
    return {
      code: "set_focus",
      title: "Set your development focus",
      reason: "A clear focus period and goal help officers and mentors support continuous growth.",
      destination: "/development#growth-plan",
    };
  }
  if (input.pendingParticipationCount > 0) {
    return {
      code: "await_confirmation",
      title: "Await confirmation of submitted participation",
      reason: `${input.pendingParticipationCount} participation record(s) are pending human confirmation and are not yet official.`,
      destination: "/development#contributions",
    };
  }
  if (input.mentorshipStatus === "requested") {
    return {
      code: "mentorship_pending",
      title: "Follow up on your mentorship request",
      reason: "Your mentorship request is awaiting human review. No mentor relationship is active yet.",
      destination: "/development#mentorship",
    };
  }
  if (input.mentorshipStatus === "active" && !input.hasCheckIn) {
    return {
      code: "first_check_in",
      title: "Record a mentorship check-in",
      reason: "An active mentorship benefits from documented check-ins so progress remains continuous and accountable.",
      destination: "/development#mentorship",
    };
  }
  if (input.hasGrowthPlan) {
    return {
      code: "continue_plan",
      title: "Continue your active growth plan",
      reason: "Review your stated next action and record participation when you complete meaningful work.",
      destination: "/development#growth-plan",
    };
  }
  return {
    code: "record_participation",
    title: "Record a development contribution",
    reason: "Confirmed participation builds your institutional contribution portfolio over time.",
    destination: "/development-continuity",
  };
}

export async function getDevelopmentJourney(userId: number): Promise<DevelopmentJourneyView> {
  const db = await requireDb();
  const profile = await ensureDevelopmentProfile(userId);

  const [
    topology,
    affiliations,
    pillarFocuses,
    confirmedParticipation,
    pendingParticipation,
    growthPlans,
    mentorships,
  ] = await Promise.all([
    getCommunityTopology(),
    db.select().from(memberCommunityAffiliations).where(eq(memberCommunityAffiliations.userId, userId)),
    db.select().from(memberPillarFocuses).where(eq(memberPillarFocuses.userId, userId)),
    db
      .select()
      .from(developmentParticipationRecords)
      .where(
        and(
          eq(developmentParticipationRecords.userId, userId),
          isNotNull(developmentParticipationRecords.confirmedAt)
        )
      )
      .orderBy(desc(developmentParticipationRecords.confirmedAt)),
    db
      .select()
      .from(developmentParticipationRecords)
      .where(
        and(
          eq(developmentParticipationRecords.userId, userId),
          isNull(developmentParticipationRecords.confirmedAt)
        )
      )
      .orderBy(desc(developmentParticipationRecords.createdAt)),
    db
      .select()
      .from(developmentGrowthPlans)
      .where(eq(developmentGrowthPlans.userId, userId))
      .orderBy(desc(developmentGrowthPlans.updatedAt)),
    db
      .select()
      .from(mentorshipRelationships)
      .where(
        or(
          eq(mentorshipRelationships.menteeUserId, userId),
          eq(mentorshipRelationships.mentorUserId, userId)
        )
      )
      .orderBy(desc(mentorshipRelationships.updatedAt)),
  ]);

  void topology;

  const relationshipIds = mentorships.map(m => m.id);
  const checkIns =
    relationshipIds.length > 0
      ? (
          await Promise.all(
            relationshipIds.map(relationshipId =>
              db
                .select()
                .from(mentorshipCheckIns)
                .where(eq(mentorshipCheckIns.relationshipId, relationshipId))
                .orderBy(desc(mentorshipCheckIns.checkInDate))
            )
          )
        ).flat()
      : [];

  const activePlan = growthPlans.find(p => p.status === "active") ?? growthPlans[0] ?? null;
  const primaryMentorship = mentorships[0] ?? null;
  const mentorshipRole: "mentee" | "mentor" | "none" = !primaryMentorship
    ? "none"
    : primaryMentorship.menteeUserId === userId
      ? "mentee"
      : "mentor";

  const latestCheckIn = checkIns[0] ?? null;
  const hasActiveConsent = profile.consentStatus === "active";
  const focusParts = [
    activePlan?.goalStatement?.trim() || null,
    pillarFocuses.length ? `${pillarFocuses.length} pillar focus area(s)` : null,
  ].filter(Boolean);
  const focusSummary = focusParts.length ? focusParts.join(" · ") : null;

  const pendingAffiliationCount = affiliations.filter(a => a.affiliationStatus === "self_declared").length;

  const nextStep = deriveNextStep({
    hasActiveConsent,
    hasFocus: pillarFocuses.length > 0 || Boolean(activePlan),
    hasGrowthPlan: Boolean(activePlan && activePlan.status === "active"),
    pendingParticipationCount: pendingParticipation.length,
    mentorshipStatus: primaryMentorship?.status ?? "none",
    hasCheckIn: Boolean(latestCheckIn),
  });

  const milestones: JourneyMilestone[] = [];
  milestones.push({
    id: `profile-${profile.id}`,
    kind: "profile_established",
    title: "Development profile established",
    at: profile.createdAt.toISOString(),
    status: hasActiveConsent ? "confirmed" : "pending",
    detail: hasActiveConsent
      ? "Consent is active for developmental records."
      : "Consent is not yet active.",
  });

  if (activePlan) {
    milestones.push({
      id: `growth-${activePlan.id}`,
      kind: "growth_plan_active",
      title: `Growth plan: ${activePlan.focusPeriod}`,
      at: activePlan.updatedAt.toISOString(),
      status: activePlan.status === "active" ? "active" : "pending",
      detail: activePlan.goalStatement.slice(0, 180),
    });
  }

  for (const row of pendingParticipation.slice(0, 20)) {
    milestones.push({
      id: `participation-pending-${row.id}`,
      kind: "participation_submitted",
      title: row.title,
      at: row.createdAt.toISOString(),
      status: "pending",
      detail: "Awaiting human confirmation — not an official achievement.",
    });
  }

  for (const row of confirmedParticipation.slice(0, 30)) {
    milestones.push({
      id: `participation-confirmed-${row.id}`,
      kind: "participation_confirmed",
      title: row.title,
      at: (row.confirmedAt ?? row.createdAt).toISOString(),
      status: "confirmed",
      detail: row.participationType.replace(/_/g, " "),
    });
  }

  for (const rel of mentorships) {
    milestones.push({
      id: `mentorship-${rel.id}`,
      kind: rel.status === "active" ? "mentorship_approved" : "mentorship_requested",
      title: rel.status === "active" ? "Mentorship relationship active" : "Mentorship requested",
      at: rel.updatedAt.toISOString(),
      status: rel.status === "active" ? "approved" : "pending",
      detail: rel.agreedFocus ?? undefined,
    });
  }

  for (const ci of checkIns.slice(0, 15)) {
    milestones.push({
      id: `checkin-${ci.id}`,
      kind: "mentorship_check_in",
      title: "Mentorship check-in recorded",
      at: ci.checkInDate.toISOString(),
      status: "confirmed",
      detail: ci.nextStep ?? ci.memberReflection ?? undefined,
    });
  }

  for (const aff of affiliations.filter(a => a.affiliationStatus === "confirmed")) {
    milestones.push({
      id: `aff-${aff.id}`,
      kind: "affiliation_confirmed",
      title: "Community affiliation confirmed",
      at: (aff.confirmedAt ?? aff.updatedAt).toISOString(),
      status: "confirmed",
    });
  }

  milestones.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const recentActivity = milestones.slice(0, 8).map(m => ({
    label: m.title,
    at: m.at,
    tone: m.status === "pending" ? ("pending" as const) : ("confirmed" as const),
  }));

  return {
    state: {
      hasActiveConsent,
      visibilityLevel: profile.visibilityLevel,
      mentoringPreference: profile.mentoringPreference,
      focusSummary,
      activeGrowthPlan: activePlan
        ? {
            id: activePlan.id,
            focusPeriod: activePlan.focusPeriod,
            goalStatement: activePlan.goalStatement,
            nextAction: activePlan.nextAction,
            status: activePlan.status,
          }
        : null,
      mentorship: {
        status: primaryMentorship?.status ?? "none",
        role: mentorshipRole,
        agreedFocus: primaryMentorship?.agreedFocus ?? null,
        relationshipId: primaryMentorship?.id ?? null,
        latestCheckInAt: latestCheckIn ? latestCheckIn.checkInDate.toISOString() : null,
      },
      pendingParticipationCount: pendingParticipation.length,
      confirmedContributionCount: confirmedParticipation.length,
      pendingAffiliationCount,
    },
    nextStep,
    milestones: milestones.slice(0, 40),
    contributions: confirmedParticipation.slice(0, 25).map(row => ({
      id: row.id,
      title: row.title,
      participationType: row.participationType,
      status: "confirmed" as const,
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
      detail: row.detail,
    })),
    pendingParticipations: pendingParticipation.slice(0, 15).map(row => ({
      id: row.id,
      title: row.title,
      participationType: row.participationType,
      status: "pending" as const,
      createdAt: row.createdAt.toISOString(),
    })),
    recentActivity,
  };
}

export { deriveNextStep };
