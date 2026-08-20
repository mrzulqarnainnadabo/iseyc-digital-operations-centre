import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createChamberTrackerDraftSubmission: vi.fn(), storagePut: vi.fn(), invokeLLM: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("../meeting/service", () => ({ createChamberTrackerDraftSubmission: mocks.createChamberTrackerDraftSubmission }));
vi.mock("../storage", () => ({ storagePut: mocks.storagePut }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { addChamberParticipant, getChamberSessionDetail, requestChamberDocumentIntelligence, requestChamberTrackerDraft, reviewChamberDocumentIntelligence, transitionChamberSession, uploadChamberDocument } from "./service";

const chair = { id: 4, role: "user" as const, docRole: "officer", name: "Session Chair", email: "chair@iseyc.example" };
const draftSession = { id: 17, chairUserId: 4, createdByUserId: 4, status: "draft" as const, sessionType: "internal_meeting" as const, trackerLinkStatus: "not_linked" as const, isTestMode: false, title: "Live Chamber", sensitivity: "internal" as const, conveningBody: "ISEYC", scheduledStartAt: null };

function makeDb(records: unknown[][], updates: Array<Record<string, unknown>> = [], inserts: Array<Record<string, unknown>> = []) {
  let read = 0;
  const select = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => {
    const result = records[read++] || [];
    Object.assign(result, { limit: vi.fn(async () => result), orderBy: vi.fn(async () => result) });
    return result;
  }) })) }));
  return {
    select,
    update: vi.fn(() => ({ set: vi.fn((payload: Record<string, unknown>) => { updates.push(payload); return { where: vi.fn(async () => undefined) }; }) })),
    insert: vi.fn(() => ({ values: vi.fn((payload: Record<string, unknown>) => { inserts.push(payload); return Object.assign(Promise.resolve([{ id: 81 }]), { returning: vi.fn(async () => [{ id: 81 }]) }); }) })),
  } as any;
}

describe("Digital Chamber service flows", () => {
  beforeEach(() => { mocks.getDb.mockReset(); mocks.createChamberTrackerDraftSubmission.mockReset(); mocks.storagePut.mockReset(); mocks.invokeLLM.mockReset(); });

  it("creates a linked draft-only tracker submission from controlled Chamber sources", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const source = { id: 70, originalName: "chamber-note.txt", mimeType: "text/plain", fileSizeBytes: 12, storageKey: "source", storageUrl: "/source", extractedText: "source", isTestMode: false };
    mocks.getDb.mockResolvedValue(makeDb([[draftSession], [source]], updates, inserts));
    mocks.createChamberTrackerDraftSubmission.mockResolvedValue(91);
    await expect(requestChamberTrackerDraft({ sessionId: 17, actor: chair })).resolves.toEqual({ status: "linked", submissionId: 91 });
    expect(mocks.createChamberTrackerDraftSubmission).toHaveBeenCalledWith(expect.objectContaining({ chamberSessionId: 17, isTestMode: false, submittedByUserId: 4 }));
    expect(updates[0]).toEqual({ trackerLinkStatus: "linked", linkedMeetingSubmissionId: 91 });
    expect(inserts[0]).toMatchObject({ eventType: "tracker_draft_linked", isTestMode: false });
  });

  it("does not pass live Chamber documents into a test-mode tracker handoff", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const testSession = { ...draftSession, isTestMode: true, title: "Test Chamber" };
    const liveSource = { id: 70, originalName: "live.txt", mimeType: "text/plain", fileSizeBytes: 12, storageKey: "live", storageUrl: "/live", extractedText: "live", isTestMode: false };
    const testSource = { id: 71, originalName: "test.txt", mimeType: "text/plain", fileSizeBytes: 12, storageKey: "test", storageUrl: "/test", extractedText: "test", isTestMode: true };
    mocks.getDb.mockResolvedValue(makeDb([[testSession], [liveSource, testSource]], updates, inserts));
    mocks.createChamberTrackerDraftSubmission.mockResolvedValue(92);
    await requestChamberTrackerDraft({ sessionId: 17, actor: chair });
    expect(mocks.createChamberTrackerDraftSubmission).toHaveBeenCalledWith(expect.objectContaining({ isTestMode: true, files: [expect.objectContaining({ originalName: "test.txt" })] }));
  });

  it("uses protected source material—not a Chamber intelligence draft—for tracker handoff and cannot create authoritative outcomes", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const source = { id: 70, originalName: "approved-source.txt", mimeType: "text/plain", fileSizeBytes: 42, storageKey: "source", storageUrl: "/source", extractedText: "Controlled source wording.", intelligenceStatus: "analysis_draft_ready", isTestMode: false };
    mocks.getDb.mockResolvedValue(makeDb([[draftSession], [source]], updates, inserts));
    mocks.createChamberTrackerDraftSubmission.mockResolvedValue(93);
    await requestChamberTrackerDraft({ sessionId: 17, actor: chair });
    const handoff = mocks.createChamberTrackerDraftSubmission.mock.calls[0]?.[0];
    expect(handoff).toMatchObject({ chamberSessionId: 17, files: [expect.objectContaining({ originalName: "approved-source.txt", extractedText: "Controlled source wording." })] });
    expect(JSON.stringify(handoff)).not.toContain("Executive Summary");
    expect(inserts).toContainEqual(expect.objectContaining({ eventType: "tracker_draft_linked", detail: expect.stringContaining("intelligence drafts were excluded") }));
    expect(updates).toEqual([{ trackerLinkStatus: "linked", linkedMeetingSubmissionId: 93 }]);
  });

  it("returns only same-scope participants, audit entries, and documents from session detail", async () => {
    const liveParticipant = { id: 1, isTestMode: false, displayName: "Live Officer" };
    const testParticipant = { id: 2, isTestMode: true, displayName: "Test Officer" };
    const liveAudit = { id: 3, isTestMode: false, eventType: "session_created" };
    const testAudit = { id: 4, isTestMode: true, eventType: "session_created" };
    const liveDocument = { id: 5, isTestMode: false, originalName: "live.txt" };
    const testDocument = { id: 6, isTestMode: true, originalName: "test.txt" };
    mocks.getDb.mockResolvedValue(makeDb([[draftSession], [liveParticipant, testParticipant], [liveAudit, testAudit], [liveDocument, testDocument]]));
    const detail = await getChamberSessionDetail(17, chair);
    expect(detail.participants).toEqual([liveParticipant]);
    expect(detail.audit).toEqual([liveAudit]);
    expect(detail.documents).toEqual([liveDocument]);
  });

  it("does not return private intelligence drafts to an admitted participant who cannot manage the Chamber", async () => {
    const participant = { ...chair, id: 8, name: "Admitted Participant" };
    const admittedMembership = { id: 2, sessionId: 17, userId: 8, admissionStatus: "admitted", isTestMode: false };
    mocks.getDb.mockResolvedValue(makeDb([[draftSession], [admittedMembership], [], [], []]));
    const detail = await getChamberSessionDetail(17, participant);
    expect(detail.canManage).toBe(false);
    expect(detail.intelligenceDrafts).toEqual([]);
  });

  it("persists a Chair document under the session test scope and does not infer analysis", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const testSession = { ...draftSession, isTestMode: true };
    mocks.getDb.mockResolvedValue(makeDb([[testSession]], [], inserts));
    mocks.storagePut.mockResolvedValue({ key: "digital-chamber/test/17/source.txt", url: "/manus-storage/source.txt" });
    await uploadChamberDocument({ sessionId: 17, originalName: "source.txt", mimeType: "text/plain", base64: Buffer.from("source").toString("base64"), actor: chair });
    expect(inserts[0]).toMatchObject({ sessionId: 17, isTestMode: true, originalName: "source.txt" });
    expect(inserts[1]).toMatchObject({ eventType: "document_uploaded", isTestMode: true });
  });

  it("blocks an invalid direct transition from draft to open", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    mocks.getDb.mockResolvedValue(makeDb([[draftSession]], updates, inserts));
    await expect(transitionChamberSession({ sessionId: 17, nextStatus: "open", actor: chair })).rejects.toThrow("cannot move from draft to open");
    expect(updates).toHaveLength(0);
  });

  it("blocks a Session Chair from adding a visitor to an internal meeting", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    mocks.getDb.mockResolvedValue(makeDb([[draftSession]], updates, inserts));
    await expect(addChamberParticipant({ sessionId: 17, participantType: "authorised_visitor", sessionRole: "observer", visitorName: "Visitor", visitorEmail: "visitor@example.com", actor: chair })).rejects.toThrow("only be added to a controlled visitor session or seminar");
    expect(inserts).toHaveLength(0);
  });

  it("creates a versioned, Chair-requested structured draft without activating audio, records, decisions, or actions", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const source = { id: 70, originalName: "controlled-note.txt", extractedText: "A controlled institutional source text that is long enough for a disciplined draft explanation.", isTestMode: false };
    mocks.getDb.mockResolvedValue(makeDb([[draftSession], [source]], updates, inserts));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ executiveSummary: "Draft summary", keyPoints: ["Point"], institutionalImplications: "Question for review", suggestedDiscussionQuestions: ["Question"], sourceTraceability: "Controlled note", reviewFlags: [], humanReviewRequired: "DRAFT — HUMAN REVIEW REQUIRED" }) } }] });
    await expect(requestChamberDocumentIntelligence({ sessionId: 17, documentId: 70, actor: chair })).resolves.toEqual({ id: 81, status: "draft_ready" });
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ response_format: expect.any(Object) }));
    expect(inserts[0]).toMatchObject({ sessionId: 17, documentId: 70, requestedByUserId: 4, isTestMode: false, status: "analysis_requested" });
    expect(updates).toContainEqual(expect.objectContaining({ intelligenceStatus: "analysis_requested" }));
    expect(updates).toContainEqual(expect.objectContaining({ status: "draft_ready" }));
    expect(inserts).toEqual(expect.arrayContaining([expect.objectContaining({ eventType: "document_intelligence_requested" }), expect.objectContaining({ eventType: "document_intelligence_draft_ready" })]));
  });

  it("blocks a non-Chair from requesting intelligence and does not invoke the model", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    mocks.getDb.mockResolvedValue(makeDb([[draftSession]], updates, inserts));
    const otherOfficer = { ...chair, id: 22, name: "Other Officer" };
    await expect(requestChamberDocumentIntelligence({ sessionId: 17, documentId: 70, actor: otherOfficer })).rejects.toThrow("Only the Session Chair");
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
  });

  it("blocks a live session from using a test-scope source document", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const testSource = { id: 70, originalName: "test-only.txt", extractedText: "Controlled test source that must not be analysed inside a live Chamber session.", isTestMode: true };
    mocks.getDb.mockResolvedValue(makeDb([[draftSession], [testSource]], updates, inserts));
    await expect(requestChamberDocumentIntelligence({ sessionId: 17, documentId: 70, actor: chair })).rejects.toThrow("not found in this session scope");
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
  });

  it("requires human source confirmation before a draft may be marked eligible for a separate audio step", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const generatedDraft = { id: 91, sessionId: 17, documentId: 70, draftJson: { executiveSummary: "Draft only" }, isTestMode: false, status: "draft_ready" };
    mocks.getDb.mockResolvedValue(makeDb([[draftSession], [generatedDraft]], [], inserts));
    await expect(reviewChamberDocumentIntelligence({ sessionId: 17, draftId: 91, decision: "approved_for_audio", sourceSetConfirmed: false, actor: chair })).rejects.toThrow("source set");
    expect(inserts).toHaveLength(0);
  });
});
