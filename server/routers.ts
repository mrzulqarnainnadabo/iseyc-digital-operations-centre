import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { officerAdminProcedure, officerProcedure, presidentialProcedure, publicProcedure, router } from "./_core/trpc";
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
    commandBriefs: presidentialProcedure.input(z.object({ isTestMode: z.boolean().default(false) })).query(({ input }) => getCommandBriefs(input.isTestMode)),
    commandBrief: presidentialProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getCommandBrief(input.id)),
    createCommandBrief: presidentialProcedure.input(z.object({ coverageStart: z.date(), coverageEnd: z.date(), sourceSummary: z.string().min(20).max(120000), isTestMode: z.boolean().default(false) })).mutation(({ ctx, input }) => createCommandBrief({ ...input, actorUserId: ctx.user.id })),
    generateCommandBrief: presidentialProcedure.input(z.object({ id: z.number().int().positive(), testOnly: z.boolean().optional() })).mutation(({ ctx, input }) => generateCommandBrief(input.id, { actorUserId: ctx.user.id, testOnly: input.testOnly })),
    reviewCommandBrief: officerAdminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["under_review", "approved_for_internal_use", "withheld_for_review"]), note: z.string().max(5000).optional() })).mutation(({ ctx, input }) => reviewCommandBrief(input.id, ctx.user.id, input.decision, input.note)),
    contentQueue: officerProcedure.input(z.object({ isTestMode: z.boolean().default(false) })).query(({ ctx, input }) => getContentQueue({ id: ctx.user.id, role: ctx.user.role }, input.isTestMode)),
    contentDraft: officerProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getContentDraft(input.id, { id: ctx.user.id, role: ctx.user.role })),
    createContentDraft: officerProcedure.input(z.object({ title: z.string().min(3).max(512), requestType: z.enum(["platform_draft", "response_suggestion", "outreach_research", "calendar_item", "internal_brief"]), objective: z.string().min(10).max(5000), intendedAudience: z.string().min(2).max(255), channels: z.array(z.string().min(1)).min(1).max(5), sourceReference: z.string().min(3).max(5000), sourceMaterial: z.string().min(20).max(120000), sourceApprovalStatus: z.enum(["approved_external", "approved_internal", "pending_confirmation", "restricted"]), sensitivity: z.enum(["public", "internal", "confidential", "restricted"]), targetDate: z.date().optional(), isTestMode: z.boolean().default(false) })).mutation(({ ctx, input }) => createContentDraft({ ...input, actorUserId: ctx.user.id })),
    generateContentDraft: officerProcedure.input(z.object({ id: z.number().int().positive(), testOnly: z.boolean().optional() })).mutation(({ ctx, input }) => generateContentDraft(input.id, { actorUserId: ctx.user.id, testOnly: input.testOnly })),
    reviewContentDraft: officerAdminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["revision_requested", "approved_for_publication", "withheld_for_governance_review"]) })).mutation(({ ctx, input }) => reviewContentDraft(input.id, ctx.user.id, input.decision)),
    loadSampleContent: officerProcedure.mutation(({ ctx }) => loadSampleContent(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
