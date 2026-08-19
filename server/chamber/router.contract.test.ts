import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const chamberMocks = vi.hoisted(() => ({
  addChamberParticipant: vi.fn(),
  createChamberSession: vi.fn(),
  getChamberSessionDetail: vi.fn(),
  listChamberDirectory: vi.fn(),
  listChamberSessions: vi.fn(),
  requestChamberDocumentIntelligence: vi.fn(),
  requestChamberTrackerDraft: vi.fn(),
  reviewChamberDocumentIntelligence: vi.fn(),
  setParticipantAdmission: vi.fn(),
  transitionChamberSession: vi.fn(),
  uploadChamberDocument: vi.fn(),
}));
const meetingMocks = vi.hoisted(() => ({
  approveSubmission: vi.fn(), confirmAction: vi.fn(), fallbackScheduleMetadata: vi.fn(), getApprovedActions: vi.fn(), getQueue: vi.fn(), getSettings: vi.fn(), getSubmissionDetail: vi.fn(), processSubmission: vi.fn(), recordSectionReview: vi.fn(), listOfficerDirectory: vi.fn(), setOfficerAccess: vi.fn(), setDocRole: vi.fn(), storeSubmission: vi.fn(), updateFallbackSchedule: vi.fn(),
}));
vi.mock("./service", () => chamberMocks);
vi.mock("../meeting/service", () => meetingMocks);

import { appRouter } from "../routers";

function contextFor(user: NonNullable<TrpcContext["user"]>): TrpcContext { return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
function officer() { return { id: 14, authUserId: "chamber-contract", name: "Chamber Officer", email: "officer@iseyc.example", loginMethod: "email", role: "user" as const, docRole: "officer" as const, isAuthorizedOfficer: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }; }
function member() { return { ...officer(), id: 15, authUserId: "chamber-member", docRole: "member" as const, isAuthorizedOfficer: false }; }
function administrator() { return { ...officer(), id: 16, authUserId: "chamber-admin", role: "admin" as const, docRole: "administrator" as const }; }

describe("Digital Chamber router contracts", () => {
  beforeEach(() => {
    Object.values(chamberMocks).forEach(mock => mock.mockReset());
    Object.values(meetingMocks).forEach(mock => mock.mockReset());
  });

  it("forwards protected Chair document uploads for both live and test sessions only with the authenticated actor", async () => {
    chamberMocks.uploadChamberDocument.mockImplementation(async ({ sessionId }: { sessionId: number }) => ({ id: sessionId, url: `/manus-storage/${sessionId}.txt` }));
    const caller = appRouter.createCaller(contextFor(officer()));
    await caller.chamber.uploadDocument({ sessionId: 17, originalName: "source.txt", mimeType: "text/plain", base64: "c291cmNl", sourceText: "source" });
    await caller.chamber.uploadDocument({ sessionId: 18, originalName: "test-source.txt", mimeType: "text/plain", base64: "c291cmNl" });
    expect(chamberMocks.uploadChamberDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({ sessionId: 17, originalName: "source.txt", actor: expect.objectContaining({ id: 14 }) }));
    expect(chamberMocks.uploadChamberDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({ sessionId: 18, originalName: "test-source.txt", actor: expect.objectContaining({ id: 14 }) }));
  });

  it("supports distinct live and test tracker-handoff calls without sharing authenticated authority", async () => {
    chamberMocks.requestChamberTrackerDraft.mockImplementation(async ({ sessionId }: { sessionId: number }) => ({ status: "linked", submissionId: sessionId + 100 }));
    const caller = appRouter.createCaller(contextFor(officer()));
    await expect(caller.chamber.requestTrackerDraft({ sessionId: 17 })).resolves.toEqual({ status: "linked", submissionId: 117 });
    await expect(caller.chamber.requestTrackerDraft({ sessionId: 18 })).resolves.toEqual({ status: "linked", submissionId: 118 });
    expect(chamberMocks.requestChamberTrackerDraft).toHaveBeenNthCalledWith(1, expect.objectContaining({ sessionId: 17, actor: expect.objectContaining({ id: 14 }) }));
    expect(chamberMocks.requestChamberTrackerDraft).toHaveBeenNthCalledWith(2, expect.objectContaining({ sessionId: 18, actor: expect.objectContaining({ id: 14 }) }));
  });

  it("does not expose a draft-intelligence identifier on the tracker-handoff contract", async () => {
    chamberMocks.requestChamberTrackerDraft.mockResolvedValue({ status: "linked", submissionId: 117 });
    const caller = appRouter.createCaller(contextFor(officer()));
    await caller.chamber.requestTrackerDraft({ sessionId: 17 });
    const forwarded = chamberMocks.requestChamberTrackerDraft.mock.calls[0]?.[0];
    expect(forwarded).toEqual(expect.objectContaining({ sessionId: 17, actor: expect.objectContaining({ id: 14 }) }));
    expect(forwarded).not.toHaveProperty("draftId");
    expect(forwarded).not.toHaveProperty("draftJson");
  });

  it("registers no Chamber contract that can create a decision or action from an intelligence draft", () => {
    const procedures = appRouter._def.procedures as Record<string, unknown>;
    expect(procedures).not.toHaveProperty("chamber.createDecision");
    expect(procedures).not.toHaveProperty("chamber.createAction");
    expect(procedures).not.toHaveProperty("chamber.createActionItem");
    expect(procedures).not.toHaveProperty("chamber.approveDecision");
    expect(procedures).not.toHaveProperty("chamber.activateAudio");
  });

  it("rejects an intelligence-draft field at the Meeting & Decision source-file contract and exposes no decision/action creation contract", async () => {
    const caller = appRouter.createCaller(contextFor(officer()));
    await expect(caller.meeting.submit({
      meetingTitle: "Controlled source handoff",
      sensitivity: "internal",
      sourceGroupKey: "controlled-source-handoff",
      isTestMode: true,
      files: [{ originalName: "source.txt", documentType: "notes", mimeType: "text/plain", base64: "c291cmNl", intelligenceDraftId: 71 }],
    } as any)).rejects.toThrow();
    const procedures = appRouter._def.procedures as Record<string, unknown>;
    expect(procedures).not.toHaveProperty("meeting.createDecisionFromIntelligence");
    expect(procedures).not.toHaveProperty("meeting.createActionFromIntelligence");
    expect(procedures).not.toHaveProperty("meeting.approveIntelligenceDraft");
  });

  it("passes only a source-document payload to real Meeting & Decision submission and blocks intelligence fields before approval or action services run", async () => {
    meetingMocks.storeSubmission.mockResolvedValue({ id: 99 });
    const officerCaller = appRouter.createCaller(contextFor(officer()));
    await officerCaller.meeting.submit({
      meetingTitle: "Controlled source handoff",
      sensitivity: "internal",
      sourceGroupKey: "controlled-source-handoff",
      isTestMode: true,
      files: [{ originalName: "source.txt", documentType: "notes", mimeType: "text/plain", base64: "c291cmNl", sourceText: "Controlled source text" }],
    });
    expect(meetingMocks.storeSubmission).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.objectContaining({ originalName: "source.txt", sourceText: "Controlled source text" })] }));
    expect(JSON.stringify(meetingMocks.storeSubmission.mock.calls[0]?.[0])).not.toContain("intelligenceDraft");
    await expect(officerCaller.meeting.submit({
      meetingTitle: "Blocked draft source",
      sensitivity: "internal",
      sourceGroupKey: "blocked-draft-source",
      isTestMode: true,
      files: [{ originalName: "source.txt", documentType: "notes", mimeType: "text/plain", base64: "c291cmNl", intelligenceDraftJson: { executiveSummary: "Draft" } }],
    } as any)).rejects.toThrow();
    const adminCaller = appRouter.createCaller(contextFor(administrator()));
    await expect(adminCaller.meeting.approve({ submissionId: 99, intelligenceDraftId: 71 } as any)).rejects.toThrow();
    await expect(adminCaller.meeting.confirmAction({ actionId: 33, intelligenceDraftId: 71 } as any)).rejects.toThrow();
    expect(meetingMocks.approveSubmission).not.toHaveBeenCalled();
    expect(meetingMocks.confirmAction).not.toHaveBeenCalled();
  });

  it("forwards Chair document-intelligence draft and review calls with the authenticated officer only", async () => {
    chamberMocks.requestChamberDocumentIntelligence.mockResolvedValue({ id: 71, status: "draft_ready" });
    chamberMocks.reviewChamberDocumentIntelligence.mockResolvedValue({ status: "under_review" });
    const caller = appRouter.createCaller(contextFor(officer()));
    await expect(caller.chamber.requestDocumentIntelligence({ sessionId: 17, documentId: 70 })).resolves.toEqual({ id: 71, status: "draft_ready" });
    await expect(caller.chamber.reviewDocumentIntelligence({ sessionId: 17, draftId: 71, decision: "under_review", sourceSetConfirmed: false, note: "Chair review opened." })).resolves.toEqual({ status: "under_review" });
    expect(chamberMocks.requestChamberDocumentIntelligence).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 17, documentId: 70, actor: expect.objectContaining({ id: 14 }) }));
    expect(chamberMocks.reviewChamberDocumentIntelligence).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 17, draftId: 71, decision: "under_review", actor: expect.objectContaining({ id: 14 }) }));
  });

  it("blocks unauthorised members before they can request or review Chamber intelligence", async () => {
    const caller = appRouter.createCaller(contextFor(member()));
    await expect(caller.chamber.requestDocumentIntelligence({ sessionId: 17, documentId: 70 })).rejects.toThrow();
    await expect(caller.chamber.reviewDocumentIntelligence({ sessionId: 17, draftId: 71, decision: "under_review", sourceSetConfirmed: false })).rejects.toThrow();
    expect(chamberMocks.requestChamberDocumentIntelligence).not.toHaveBeenCalled();
    expect(chamberMocks.reviewChamberDocumentIntelligence).not.toHaveBeenCalled();
  });

  it("propagates source scope-protection failures from document upload and tracker handoff instead of creating mixed-scope work", async () => {
    chamberMocks.uploadChamberDocument.mockRejectedValueOnce(new Error("Cross-scope Chamber source material is not permitted."));
    chamberMocks.requestChamberTrackerDraft.mockRejectedValue(new Error("Cross-scope Chamber source material is not permitted."));
    const caller = appRouter.createCaller(contextFor(officer()));
    await expect(caller.chamber.uploadDocument({ sessionId: 18, originalName: "blocked.txt", mimeType: "text/plain", base64: "c291cmNl" })).rejects.toThrow("Cross-scope Chamber source material is not permitted.");
    await expect(caller.chamber.requestTrackerDraft({ sessionId: 17 })).rejects.toThrow("Cross-scope Chamber source material is not permitted.");
  });

  it("filters intentionally mixed participant, audit, document, and intelligence fixtures at the Chamber session-detail contract", async () => {
    chamberMocks.getChamberSessionDetail.mockResolvedValue({
      session: { id: 17, isTestMode: true },
      participants: [{ id: 1, isTestMode: false, displayName: "Live Officer" }, { id: 2, isTestMode: true, displayName: "Test Officer" }],
      audit: [{ id: 3, isTestMode: false, eventType: "session_created" }, { id: 4, isTestMode: true, eventType: "session_created" }],
      documents: [{ id: 5, isTestMode: false, originalName: "live.txt" }, { id: 6, isTestMode: true, originalName: "test.txt" }],
      intelligenceDrafts: [{ id: 7, isTestMode: false, status: "draft_ready" }, { id: 8, isTestMode: true, status: "draft_ready" }],
      canManage: true,
      documentDesk: { enabled: true, message: "controlled" },
    });
    const caller = appRouter.createCaller(contextFor(officer()));
    const detail = await caller.chamber.session({ sessionId: 17 });
    expect(detail.participants).toEqual([{ id: 2, isTestMode: true, displayName: "Test Officer" }]);
    expect(detail.audit).toEqual([{ id: 4, isTestMode: true, eventType: "session_created" }]);
    expect(detail.documents).toEqual([{ id: 6, isTestMode: true, originalName: "test.txt" }]);
    expect(detail.intelligenceDrafts).toEqual([{ id: 8, isTestMode: true, status: "draft_ready" }]);
  });
});
