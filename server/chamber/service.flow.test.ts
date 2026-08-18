import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createChamberTrackerDraftSubmission: vi.fn(), storagePut: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("../meeting/service", () => ({ createChamberTrackerDraftSubmission: mocks.createChamberTrackerDraftSubmission }));
vi.mock("../storage", () => ({ storagePut: mocks.storagePut }));

import { addChamberParticipant, getChamberSessionDetail, requestChamberTrackerDraft, transitionChamberSession, uploadChamberDocument } from "./service";

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
    insert: vi.fn(() => ({ values: vi.fn(async (payload: Record<string, unknown>) => { inserts.push(payload); return [{ insertId: 81 }]; }) })),
  } as any;
}

describe("Digital Chamber service flows", () => {
  beforeEach(() => { mocks.getDb.mockReset(); mocks.createChamberTrackerDraftSubmission.mockReset(); mocks.storagePut.mockReset(); });

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
});
