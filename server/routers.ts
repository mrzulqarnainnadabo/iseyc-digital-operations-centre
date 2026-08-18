import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { nationalPresidentProcedure, officerAdminProcedure, officerProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createHeartbeatJob } from "./_core/heartbeat";
import { parse as parseCookie } from "cookie";
import {
  approveSubmission,
  confirmAction,
  fallbackScheduleMetadata,
  getApprovedActions,
  getQueue,
  getSettings,
  getSubmissionDetail,
  processSubmission,
  recordSectionReview,
  listOfficerDirectory,
  setOfficerAccess,
  setDocRole,
  storeSubmission,
  updateFallbackSchedule,
} from "./meeting/service";
import { createCommandBrief, createContentDraft, generateCommandBrief, generateContentDraft, getCommandBrief, getCommandBriefs, getContentDraft, getContentQueue, getDocOverview, loadSampleContent, reviewCommandBrief, reviewContentDraft } from "./doc/service";
import { approveMentorship, confirmParticipation, confirmParticipationRecord, createGrowthPlan, getCommunityTopology, getDevelopmentGovernanceQueue, getMyDevelopmentProfile, recordMentorshipCheckIn, requestMentorship, submitParticipation, updateMyDevelopmentProfile, verifyNationalPresidentAccess } from "./development/service";
import { addChamberParticipant, createChamberSession, getChamberSessionDetail, listChamberDirectory, listChamberSessions, requestChamberTrackerDraft, setParticipantAdmission, transitionChamberSession, uploadChamberDocument } from "./chamber/service";

const sensitivitySchema = z.enum(["public", "internal", "confidential", "restricted", "not_recorded"]);
const documentTypeSchema = z.enum(["agenda", "minutes", "notes", "transcript", "decision_log", "action_list", "other"]);
const fileSchema = z.object({
  originalName: z.string().min(1).max(512),
  documentType: documentTypeSchema,
  mimeType: z.string().min(1).max(255),
  base64: z.string().min(1),
  sourceText: z.string().max(120000).optional(),
});

const sampleMaterial = `ISEYC National Programmes Committee — Sample Review Meeting\nDate: 12 Aug 2026\nChair: Programme Director\nRecord keeper: Operations Officer\n\nAgenda\n1. Review community outreach readiness.\n2. Confirm reporting cadence.\n3. Identify implementation dependencies.\n\nDecision\nThe Committee approved a monthly readiness report beginning 30 Sep 2026, subject to each regional focal point providing source updates by the 25th of each month.\n\nAction\nRegional Focal Point — submit regional readiness update by 25 Sep 2026. Status: Open.\nOperations Officer — circulate the approved reporting template by 05 Sep 2026. Status: Open.\n\nRisk\nTwo regions have not confirmed access to the reporting template. This may delay the first reporting cycle.\n\nOpen question\nConfirm the final list of regional focal points at the next Committee meeting.`;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  development: router({
    myProfile: protectedProcedure.query(({ ctx }) => getMyDevelopmentProfile(ctx.user.id)),
    topology: protectedProcedure.query(() => getCommunityTopology()),
    updateMyProfile: protectedProcedure.input(z.object({
      consentStatus: z.enum(["not_requested", "active", "withdrawn"]),
      visibilityLevel: z.enum(["private", "mentor_guided", "institutional_limited"]),
      developmentDirection: z.array(z.string().min(1).max(120)).max(8),
      developmentGoals: z.string().max(5000).optional(),
      mentoringPreference: z.enum(["not_selected", "open_to_mentoring", "seeking_mentor", "mentoring_others", "not_now"]),
      tierId: z.number().int().positive().optional(),
      pillarIds: z.array(z.number().int().positive()).max(7),
    })).mutation(({ ctx, input }) => updateMyDevelopmentProfile({ ...input, userId: ctx.user.id })),
    createGrowthPlan: protectedProcedure.input(z.object({ focusPeriod: z.string().min(2).max(120), goalStatement: z.string().min(10).max(5000), nextAction: z.string().max(5000).optional(), memberReflection: z.string().max(5000).optional() })).mutation(({ ctx, input }) => createGrowthPlan({ ...input, userId: ctx.user.id })),
    requestMentorship: protectedProcedure.input(z.object({ agreedFocus: z.string().min(10).max(5000) })).mutation(({ ctx, input }) => requestMentorship({ ...input, userId: ctx.user.id })),
    recordMentorshipCheckIn: protectedProcedure.input(z.object({ relationshipId: z.number().int().positive(), memberReflection: z.string().max(5000).optional(), mentorGuidance: z.string().max(5000).optional(), nextStep: z.string().max(5000).optional() })).mutation(({ ctx, input }) => recordMentorshipCheckIn({ ...input, actorUserId: ctx.user.id })),
    submitParticipation: protectedProcedure.input(z.object({ participationType: z.enum(["meeting_contribution", "community_contribution", "development_reflection", "department_activity"]), title: z.string().min(3).max(255), detail: z.string().max(5000).optional() })).mutation(({ ctx, input }) => submitParticipation({ ...input, userId: ctx.user.id })),
    confirmParticipation: officerAdminProcedure.input(z.object({ userId: z.number().int().positive(), participationType: z.enum(["meeting_contribution", "community_contribution", "development_reflection", "department_activity"]), title: z.string().min(3).max(255), detail: z.string().max(5000).optional(), sourceRecordId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => confirmParticipation({ ...input, confirmedByUserId: ctx.user.id })),
    confirmParticipationRecord: officerAdminProcedure.input(z.object({ participationId: z.number().int().positive() })).mutation(({ ctx, input }) => confirmParticipationRecord({ ...input, confirmedByUserId: ctx.user.id })),
    governanceQueue: officerAdminProcedure.query(() => getDevelopmentGovernanceQueue()),
    approveMentorship: officerAdminProcedure.input(z.object({ relationshipId: z.number().int().positive(), mentorUserId: z.number().int().positive(), agreedFocus: z.string().max(5000).optional() })).mutation(({ ctx, input }) => approveMentorship({ ...input, approvedByUserId: ctx.user.id })),
    nationalPresidentAccess: nationalPresidentProcedure.query(({ ctx }) => verifyNationalPresidentAccess(ctx.user.id, ctx.user.docRole)),
  }),
  chamber: router({
    sessions: officerProcedure.input(z.object({ isTestMode: z.boolean().default(false) })).query(({ ctx, input }) => listChamberSessions(ctx.user, input.isTestMode)),
    directory: officerProcedure.query(() => listChamberDirectory()),
    session: officerProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const detail = await getChamberSessionDetail(input.sessionId, ctx.user);
      const isTestMode = detail.session.isTestMode;
      return {
        ...detail,
        participants: detail.participants.filter(item => item.isTestMode === isTestMode),
        audit: detail.audit.filter(item => item.isTestMode === isTestMode),
        documents: detail.documents.filter(item => item.isTestMode === isTestMode),
      };
    }),
    createSession: officerProcedure.input(z.object({
      title: z.string().min(3).max(512),
      description: z.string().max(5000).optional(),
      sessionType: z.enum(["internal_meeting", "visitor_session", "seminar"]),
      conveningBody: z.string().max(255).optional(),
      sensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
      agenda: z.array(z.string().min(1).max(500)).max(30),
      scheduledStartAt: z.date().optional(),
      scheduledEndAt: z.date().optional(),
      isTestMode: z.boolean().default(false),
    })).mutation(({ ctx, input }) => createChamberSession({ ...input, actor: ctx.user })),
    addParticipant: officerProcedure.input(z.object({
      sessionId: z.number().int().positive(),
      participantType: z.enum(["internal", "authorised_visitor"]),
      sessionRole: z.enum(["presenter", "participant", "observer"]),
      targetUserId: z.number().int().positive().optional(),
      visitorName: z.string().min(2).max(255).optional(),
      visitorEmail: z.string().email().max(320).optional(),
    })).mutation(({ ctx, input }) => addChamberParticipant({ ...input, actor: ctx.user })),
    setAdmission: officerProcedure.input(z.object({ sessionId: z.number().int().positive(), participantId: z.number().int().positive(), admissionStatus: z.enum(["admitted", "declined", "removed"]) })).mutation(({ ctx, input }) => setParticipantAdmission({ ...input, actor: ctx.user })),
    transitionSession: officerProcedure.input(z.object({ sessionId: z.number().int().positive(), nextStatus: z.enum(["draft", "scheduled", "open", "closed", "cancelled", "archived"]) })).mutation(({ ctx, input }) => transitionChamberSession({ ...input, actor: ctx.user })),
    uploadDocument: officerProcedure.input(z.object({ sessionId: z.number().int().positive(), originalName: z.string().min(1).max(512), mimeType: z.string().min(1).max(255), base64: z.string().min(1), sourceText: z.string().max(120000).optional() })).mutation(({ ctx, input }) => uploadChamberDocument({ ...input, actor: ctx.user })),
    requestTrackerDraft: officerProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(({ ctx, input }) => requestChamberTrackerDraft({ ...input, actor: ctx.user })),
  }),
  meeting: router({
    queue: officerProcedure.input(z.object({ isTestMode: z.boolean().default(false) })).query(({ ctx, input }) =>
      getQueue({ id: ctx.user.id, role: ctx.user.role }, input.isTestMode),
    ),
    detail: officerProcedure.input(z.object({ submissionId: z.number().int().positive() })).query(({ ctx, input }) =>
      getSubmissionDetail(input.submissionId, { id: ctx.user.id, role: ctx.user.role }),
    ),
    settings: officerProcedure.query(() => getSettings()),
    fallbackMetadata: officerAdminProcedure.query(() => fallbackScheduleMetadata()),
    submit: officerProcedure.input(z.object({
      meetingTitle: z.string().min(2).max(512),
      meetingDate: z.string().max(64).optional(),
      conveningBody: z.string().max(255).optional(),
      sensitivity: sensitivitySchema,
      sourceGroupKey: z.string().min(3).max(160),
      isTestMode: z.boolean().default(false),
      files: z.array(fileSchema).min(1).max(10),
    })).mutation(({ ctx, input }) => storeSubmission({ ...input, submittedByUserId: ctx.user.id })),
    loadSample: officerProcedure.mutation(({ ctx }) => storeSubmission({
      meetingTitle: "Sample — National Programmes Committee Review",
      meetingDate: "12 Aug 2026",
      conveningBody: "National Programmes Committee",
      sensitivity: "internal",
      sourceGroupKey: `sample-${ctx.user.id}-${Date.now()}`,
      isTestMode: true,
      submittedByUserId: ctx.user.id,
      files: [{
        originalName: "sample-programmes-committee-meeting.txt",
        documentType: "minutes",
        mimeType: "text/plain",
        base64: Buffer.from(sampleMaterial, "utf8").toString("base64"),
        sourceText: sampleMaterial,
      }],
    })),
    processSample: officerProcedure.input(z.object({ submissionId: z.number().int().positive() })).mutation(({ ctx, input }) =>
      processSubmission(input.submissionId, { testOnly: true, actorUserId: ctx.user.id }),
    ),
    beginReview: officerAdminProcedure.input(z.object({ submissionId: z.number().int().positive() })).mutation(({ ctx, input }) =>
      recordSectionReview({ submissionId: input.submissionId, sectionKey: "record_control", decision: "revision_requested", reviewNote: "Review formally opened by authorised officer.", reviewerUserId: ctx.user.id }),
    ),
    reviewSection: officerAdminProcedure.input(z.object({
      submissionId: z.number().int().positive(),
      sectionKey: z.string().min(1).max(100),
      decision: z.enum(["approved", "revision_requested", "rejected"]),
      reviewNote: z.string().max(5000).optional(),
    })).mutation(({ ctx, input }) => recordSectionReview({ ...input, reviewerUserId: ctx.user.id })),
    approve: officerAdminProcedure.input(z.object({ submissionId: z.number().int().positive() })).mutation(({ ctx, input }) =>
      approveSubmission({ submissionId: input.submissionId, reviewerUserId: ctx.user.id, reviewerRole: ctx.user.role }),
    ),
    actions: officerProcedure.query(({ ctx }) => getApprovedActions({ id: ctx.user.id, role: ctx.user.role })),
    confirmAction: officerAdminProcedure.input(z.object({ actionId: z.number().int().positive() })).mutation(({ ctx, input }) =>
      confirmAction({ actionId: input.actionId, reviewerUserId: ctx.user.id, reviewerRole: ctx.user.role }),
    ),
    configureFallback: officerAdminProcedure.mutation(async ({ ctx }) => {
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const job = await createHeartbeatJob({
        name: "ise yc-meeting-fallback".replace(" ", ""),
        cron: "0 */15 * * * *",
        path: "/api/scheduled/meeting-fallback",
        description: "ISEYC Meeting & Decision Tracker fallback scan for eligible live submissions.",
      }, sessionToken);
      await updateFallbackSchedule(job.taskUid);
      return job;
    }),
    officerDirectory: officerAdminProcedure.query(() => listOfficerDirectory()),
    setOfficerAccess: officerAdminProcedure.input(z.object({ targetUserId: z.number().int().positive(), authorised: z.boolean() })).mutation(({ ctx, input }) =>
      setOfficerAccess({ ...input, actorUserId: ctx.user.id }),
    ),
    setDocRole: officerAdminProcedure.input(z.object({ targetUserId: z.number().int().positive(), docRole: z.enum(["member", "officer", "administrator", "presidential_council", "national_president"]) })).mutation(({ ctx, input }) =>
      setDocRole({ ...input, actorUserId: ctx.user.id }),
    ),
  }),
  doc: router({
    overview: officerProcedure.query(() => getDocOverview()),
    commandBriefs: nationalPresidentProcedure.input(z.object({ isTestMode: z.boolean().default(false) })).query(({ input }) => getCommandBriefs(input.isTestMode)),
    commandBrief: nationalPresidentProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getCommandBrief(input.id)),
    createCommandBrief: nationalPresidentProcedure.input(z.object({ coverageStart: z.date(), coverageEnd: z.date(), sourceSummary: z.string().min(20).max(120000), isTestMode: z.boolean().default(false) })).mutation(({ ctx, input }) => createCommandBrief({ ...input, actorUserId: ctx.user.id })),
    generateCommandBrief: nationalPresidentProcedure.input(z.object({ id: z.number().int().positive(), testOnly: z.boolean().optional() })).mutation(({ ctx, input }) => generateCommandBrief(input.id, { actorUserId: ctx.user.id, testOnly: input.testOnly })),
    reviewCommandBrief: nationalPresidentProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["under_review", "approved_for_internal_use", "withheld_for_review"]), note: z.string().max(5000).optional() })).mutation(({ ctx, input }) => reviewCommandBrief(input.id, ctx.user.id, input.decision, input.note)),
    contentQueue: officerProcedure.input(z.object({ isTestMode: z.boolean().default(false) })).query(({ ctx, input }) => getContentQueue({ id: ctx.user.id, role: ctx.user.role }, input.isTestMode)),
    contentDraft: officerProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getContentDraft(input.id, { id: ctx.user.id, role: ctx.user.role })),
    createContentDraft: officerProcedure.input(z.object({ title: z.string().min(3).max(512), requestType: z.enum(["platform_draft", "response_suggestion", "outreach_research", "calendar_item", "internal_brief"]), objective: z.string().min(10).max(5000), intendedAudience: z.string().min(2).max(255), channels: z.array(z.string().min(1)).min(1).max(5), sourceReference: z.string().min(3).max(5000), sourceMaterial: z.string().min(20).max(120000), sourceApprovalStatus: z.enum(["approved_external", "approved_internal", "pending_confirmation", "restricted"]), sensitivity: z.enum(["public", "internal", "confidential", "restricted"]), targetDate: z.date().optional(), isTestMode: z.boolean().default(false) })).mutation(({ ctx, input }) => createContentDraft({ ...input, actorUserId: ctx.user.id })),
    generateContentDraft: officerProcedure.input(z.object({ id: z.number().int().positive(), testOnly: z.boolean().optional() })).mutation(({ ctx, input }) => generateContentDraft(input.id, { actorUserId: ctx.user.id, testOnly: input.testOnly })),
    reviewContentDraft: officerAdminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["revision_requested", "approved_for_publication", "withheld_for_governance_review"]) })).mutation(({ ctx, input }) => reviewContentDraft(input.id, ctx.user.id, input.decision)),
    loadSampleContent: officerProcedure.mutation(({ ctx }) => loadSampleContent(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
