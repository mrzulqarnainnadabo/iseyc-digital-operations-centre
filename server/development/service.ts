import { and, asc, desc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { communityTiers, developmentGrowthPlans, developmentParticipationRecords, developmentalProfiles, memberCommunityAffiliations, memberPillarFocuses, mentorshipCheckIns, mentorshipRelationships, responsibilityPillars, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { profileConsentPolicy } from "./consent";
import { canApproveMentorship, canConfirmParticipation, canRecordMentorshipCheckIn } from "./governance";
import { assertApprovedTopologySelection } from "./approvedTopology";

const CONSENT_VERSION = "ISEYC-DOC-DEVELOPMENT-1.0";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Development profile service is unavailable.");
  return db;
}

export async function ensureDevelopmentProfile(userId: number) {
  const db = await requireDb();
  await db.insert(developmentalProfiles).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  return (await db.select().from(developmentalProfiles).where(eq(developmentalProfiles.userId, userId)).limit(1))[0]!;
}

export async function getCommunityTopology() {
  const db = await requireDb();
  const [tiers, pillars] = await Promise.all([
    db.select().from(communityTiers).where(eq(communityTiers.isActive, true)).orderBy(asc(communityTiers.hierarchyOrder)),
    db.select().from(responsibilityPillars).where(eq(responsibilityPillars.isActive, true)).orderBy(asc(responsibilityPillars.responsibilityOrder)),
  ]);
  return { tiers, pillars };
}

export async function getMyDevelopmentProfile(userId: number) {
  const db = await requireDb();
  const profile = await ensureDevelopmentProfile(userId);
  const [topology, affiliations, pillarFocuses, participationHistory, growthPlans, mentorships] = await Promise.all([
    getCommunityTopology(),
    db.select().from(memberCommunityAffiliations).where(eq(memberCommunityAffiliations.userId, userId)),
    db.select().from(memberPillarFocuses).where(eq(memberPillarFocuses.userId, userId)),
    db.select().from(developmentParticipationRecords).where(and(eq(developmentParticipationRecords.userId, userId), isNotNull(developmentParticipationRecords.confirmedAt))).orderBy(desc(developmentParticipationRecords.confirmedAt)),
    db.select().from(developmentGrowthPlans).where(eq(developmentGrowthPlans.userId, userId)).orderBy(desc(developmentGrowthPlans.updatedAt)),
    db.select().from(mentorshipRelationships).where(or(eq(mentorshipRelationships.menteeUserId, userId), eq(mentorshipRelationships.mentorUserId, userId))).orderBy(desc(mentorshipRelationships.updatedAt)),
  ]);
  const activeRelationshipIds = mentorships.map(item => item.id);
  const checkIns = activeRelationshipIds.length
    ? await Promise.all(activeRelationshipIds.map(relationshipId => db.select().from(mentorshipCheckIns).where(eq(mentorshipCheckIns.relationshipId, relationshipId)).orderBy(desc(mentorshipCheckIns.checkInDate))))
    : [];
  return { profile, topology, affiliations, pillarFocuses, participationHistory, growthPlans, mentorships, mentorshipCheckIns: checkIns.flat() };
}

export async function updateMyDevelopmentProfile(input: {
  userId: number;
  consentStatus: "not_requested" | "active" | "withdrawn";
  visibilityLevel: "private" | "mentor_guided" | "institutional_limited";
  developmentDirection: string[];
  developmentGoals?: string;
  mentoringPreference: "not_selected" | "open_to_mentoring" | "seeking_mentor" | "mentoring_others" | "not_now";
  tierId?: number;
  pillarIds: number[];
}) {
  const db = await requireDb();
  const topology = await getCommunityTopology();
  assertApprovedTopologySelection({ tiers: topology.tiers, pillars: topology.pillars, tierId: input.tierId, pillarIds: input.pillarIds });

  const consentPolicy = profileConsentPolicy(input.consentStatus);
  await db.insert(developmentalProfiles).values({
    userId: input.userId,
    consentStatus: input.consentStatus,
    consentedAt: consentPolicy.isActive ? new Date() : null,
    consentVersion: consentPolicy.consentVersion,
    visibilityLevel: consentPolicy.isActive ? input.visibilityLevel : "private",
    developmentDirection: consentPolicy.shouldRetainVoluntaryDevelopmentData ? input.developmentDirection : null,
    developmentGoals: consentPolicy.shouldRetainVoluntaryDevelopmentData ? input.developmentGoals || null : null,
    mentoringPreference: consentPolicy.isActive ? input.mentoringPreference : "not_selected",
    profileStatus: consentPolicy.profileStatus,
  }).onDuplicateKeyUpdate({
    set: {
      consentStatus: input.consentStatus,
      consentedAt: consentPolicy.isActive ? new Date() : null,
      consentVersion: consentPolicy.consentVersion,
      visibilityLevel: consentPolicy.isActive ? input.visibilityLevel : "private",
      developmentDirection: consentPolicy.shouldRetainVoluntaryDevelopmentData ? input.developmentDirection : null,
      developmentGoals: consentPolicy.shouldRetainVoluntaryDevelopmentData ? input.developmentGoals || null : null,
      mentoringPreference: consentPolicy.isActive ? input.mentoringPreference : "not_selected",
      profileStatus: consentPolicy.profileStatus,
    },
  });

  await db.delete(memberCommunityAffiliations).where(eq(memberCommunityAffiliations.userId, input.userId));
  await db.delete(memberPillarFocuses).where(eq(memberPillarFocuses.userId, input.userId));
  if (consentPolicy.shouldClearVoluntaryDevelopmentHistory) {
    const menteeRelationships = await db.select({ id: mentorshipRelationships.id }).from(mentorshipRelationships).where(eq(mentorshipRelationships.menteeUserId, input.userId));
    const relationshipIds = menteeRelationships.map(item => item.id);
    if (relationshipIds.length) await db.delete(mentorshipCheckIns).where(inArray(mentorshipCheckIns.relationshipId, relationshipIds));
    await db.delete(mentorshipRelationships).where(eq(mentorshipRelationships.menteeUserId, input.userId));
    await db.delete(developmentParticipationRecords).where(eq(developmentParticipationRecords.userId, input.userId));
    await db.delete(developmentGrowthPlans).where(eq(developmentGrowthPlans.userId, input.userId));
  }
  if (consentPolicy.isActive && input.tierId) {
    await db.insert(memberCommunityAffiliations).values({ userId: input.userId, tierId: input.tierId, affiliationStatus: "self_declared" });
  }
  if (consentPolicy.isActive && input.pillarIds.length) {
    await db.insert(memberPillarFocuses).values(input.pillarIds.map(pillarId => ({ userId: input.userId, pillarId, focusStatus: "interested" as const, visibilityLevel: input.visibilityLevel })));
  }
  return getMyDevelopmentProfile(input.userId);
}

export async function verifyNationalPresidentAccess(userId: number, docRole: string) {
  if (docRole !== "national_president") throw new Error("Full Presidential Command access is reserved for the National President.");
  return { userId, commandAccess: "full" as const };
}

export async function createGrowthPlan(input: { userId: number; focusPeriod: string; goalStatement: string; nextAction?: string; memberReflection?: string }) {
  const db = await requireDb();
  const profile = await ensureDevelopmentProfile(input.userId);
  if (profile.consentStatus !== "active") throw new Error("Activate your developmental profile before creating a growth plan.");
  const result = await db.insert(developmentGrowthPlans).values({ ...input, status: "active" });
  return { id: Number(result[0].insertId) };
}

export async function requestMentorship(input: { userId: number; agreedFocus: string }) {
  const db = await requireDb();
  const profile = await ensureDevelopmentProfile(input.userId);
  if (profile.consentStatus !== "active") throw new Error("Activate your developmental profile before requesting mentorship.");
  const existing = await db.select().from(mentorshipRelationships).where(and(eq(mentorshipRelationships.menteeUserId, input.userId), eq(mentorshipRelationships.status, "requested"))).limit(1);
  if (existing[0]) throw new Error("A mentorship request is already awaiting human review.");
  const result = await db.insert(mentorshipRelationships).values({ menteeUserId: input.userId, status: "requested", agreedFocus: input.agreedFocus });
  return { id: Number(result[0].insertId), status: "requested" as const };
}

export async function confirmParticipation(input: { userId: number; participationType: "meeting_contribution" | "community_contribution" | "development_reflection" | "department_activity"; title: string; detail?: string; sourceRecordId?: number; confirmedByUserId: number }) {
  const db = await requireDb();
  const result = await db.insert(developmentParticipationRecords).values({ ...input, confirmedAt: new Date() });
  return { id: Number(result[0].insertId) };
}

export async function submitParticipation(input: { userId: number; participationType: "meeting_contribution" | "community_contribution" | "development_reflection" | "department_activity"; title: string; detail?: string }) {
  const db = await requireDb();
  const profile = await ensureDevelopmentProfile(input.userId);
  if (profile.consentStatus !== "active") throw new Error("Activate your developmental profile before submitting a contribution for confirmation.");
  const result = await db.insert(developmentParticipationRecords).values(input);
  return { id: Number(result[0].insertId), status: "awaiting_human_confirmation" as const };
}

export async function confirmParticipationRecord(input: { participationId: number; confirmedByUserId: number }) {
  const db = await requireDb();
  const record = (await db.select().from(developmentParticipationRecords).where(eq(developmentParticipationRecords.id, input.participationId)).limit(1))[0];
  if (!record) throw new Error("Participation record not found.");
  if (!canConfirmParticipation(record.confirmedAt)) throw new Error("This participation record has already been confirmed.");
  await db.update(developmentParticipationRecords).set({ confirmedByUserId: input.confirmedByUserId, confirmedAt: new Date() }).where(eq(developmentParticipationRecords.id, input.participationId));
}

export async function getDevelopmentGovernanceQueue() {
  const db = await requireDb();
  const [pendingParticipation, mentorshipRequests, mentorCandidates] = await Promise.all([
    db.select({ record: developmentParticipationRecords, member: { id: users.id, name: users.name, email: users.email } }).from(developmentParticipationRecords).leftJoin(users, eq(developmentParticipationRecords.userId, users.id)).where(isNull(developmentParticipationRecords.confirmedAt)).orderBy(desc(developmentParticipationRecords.createdAt)),
    db.select({ relationship: mentorshipRelationships, member: { id: users.id, name: users.name, email: users.email } }).from(mentorshipRelationships).leftJoin(users, eq(mentorshipRelationships.menteeUserId, users.id)).where(eq(mentorshipRelationships.status, "requested")).orderBy(desc(mentorshipRelationships.createdAt)),
    db.select({ id: users.id, name: users.name, email: users.email, docRole: users.docRole }).from(users).where(and(eq(users.isAuthorizedOfficer, true), or(eq(users.docRole, "officer"), eq(users.docRole, "administrator"), eq(users.docRole, "presidential_council"), eq(users.docRole, "national_president")))).orderBy(asc(users.name)),
  ]);
  return { pendingParticipation, mentorshipRequests, mentorCandidates };
}

export async function approveMentorship(input: { relationshipId: number; mentorUserId: number; approvedByUserId: number; agreedFocus?: string }) {
  const db = await requireDb();
  const relationship = (await db.select().from(mentorshipRelationships).where(eq(mentorshipRelationships.id, input.relationshipId)).limit(1))[0];
  if (!relationship || !canApproveMentorship(relationship.status)) throw new Error("Only a pending mentorship request can be approved.");
  await db.update(mentorshipRelationships).set({ mentorUserId: input.mentorUserId, approvedByUserId: input.approvedByUserId, approvedAt: new Date(), agreedFocus: input.agreedFocus || relationship.agreedFocus, status: "active" }).where(eq(mentorshipRelationships.id, input.relationshipId));
}

export async function recordMentorshipCheckIn(input: { relationshipId: number; actorUserId: number; memberReflection?: string; mentorGuidance?: string; nextStep?: string }) {
  const db = await requireDb();
  const relationship = (await db.select().from(mentorshipRelationships).where(eq(mentorshipRelationships.id, input.relationshipId)).limit(1))[0];
  if (!relationship || !canRecordMentorshipCheckIn({ status: relationship.status, menteeUserId: relationship.menteeUserId, mentorUserId: relationship.mentorUserId, actorUserId: input.actorUserId })) throw new Error("An active, human-approved mentorship relationship and an agreed mentor or mentee are required.");
  const result = await db.insert(mentorshipCheckIns).values({ relationshipId: input.relationshipId, checkInDate: new Date(), memberReflection: input.memberReflection || null, mentorGuidance: input.mentorGuidance || null, nextStep: input.nextStep || null, recordedByUserId: input.actorUserId });
  return { id: Number(result[0].insertId) };
}
