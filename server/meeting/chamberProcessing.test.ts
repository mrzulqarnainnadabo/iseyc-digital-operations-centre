import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), invokeLLM: vi.fn() }));
vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { processSubmission } from "./service";

function makeDb(records: unknown[][], updates: Array<Record<string, unknown>>, inserts: Array<Record<string, unknown>>) {
  let read = 0;
  const select = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => {
    const result = records[read++] || [];
    Object.assign(result, { limit: vi.fn(async () => result), orderBy: vi.fn(async () => result) });
    return result;
  }) })) }));
  return {
    select,
    update: vi.fn(() => ({ set: vi.fn((payload: Record<string, unknown>) => { updates.push(payload); return { where: vi.fn(async () => undefined) }; }) })),
    insert: vi.fn(() => ({ values: vi.fn((payload: Record<string, unknown>) => { inserts.push(payload); return Object.assign(Promise.resolve([{ id: 701 }]), { returning: vi.fn(async () => [{ id: 701 }]) }); }) })),
  } as any;
}

function meetingDraft() {
  return {
    meetingIdentity: { officialTitle: "Controlled Chamber", dateTime: "Not recorded.", conveningBody: "ISEYC", meetingType: "Internal meeting", chair: "Not recorded.", recordKeeper: "Not recorded.", sensitivity: "internal" },
    attendance: { attendees: [], apologies: [], absentees: [] },
    agendaPurpose: "Review controlled source.",
    keyDiscussions: ["Source discussion"],
    decisions: [],
    actionItems: [{ actionDescription: "Prepare the source for human review", accountableOwner: "Owner not recorded", supportingParties: "", dueDate: "", sourceStatus: "draft", dependency: "", evidenceLocation: "controlled-source.txt" }],
    risks: [],
    openQuestions: [],
    continuityNotes: [],
    qualityGate: { completeness: "Draft", ownershipClarity: "Human review required", deadlinesVisible: "Not recorded", humanReviewRequired: "Yes", reviewReason: "Source-only Chamber handoff" },
    sourceTraceability: [{ outputArea: "discussion", sourceReference: "controlled-source.txt", traceabilityNote: "Derived from protected source text" }],
    closingLine: "Empowering Youths, Shaping Communities.",
  };
}

describe("Chamber source-only Meeting & Decision processing", () => {
  beforeEach(() => { mocks.getDb.mockReset(); mocks.invokeLLM.mockReset(); });

  it("processes only protected source text into a draft record and individually unconfirmed action candidate", async () => {
    const updates: Array<Record<string, unknown>> = []; const inserts: Array<Record<string, unknown>> = [];
    const submission = { id: 101, meetingTitle: "Controlled Chamber", meetingDate: null, conveningBody: "ISEYC", sensitivity: "internal", status: "pending_consolidation", isTestMode: true };
    const handoffFile = { id: 22, submissionId: 101, originalName: "controlled-source.txt", documentType: "other", extractedText: "Controlled source text only. It contains no generated interpretation.", isTestMode: true };
    mocks.getDb.mockResolvedValue(makeDb([[submission], [handoffFile]], updates, inserts));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(meetingDraft()) } }] });

    await expect(processSubmission(101, { testOnly: true, actorUserId: 4 })).resolves.toEqual({ outcome: "draft_ready" });
    const sourcePrompt = mocks.invokeLLM.mock.calls[0]?.[0]?.messages?.[1]?.content as string;
    expect(sourcePrompt).toContain("Controlled source text only.");
    expect(sourcePrompt).not.toContain("Executive Summary");
    const recordUpdate = updates.find(update => update.status === "draft_ready");
    expect(recordUpdate).toMatchObject({ status: "draft_ready", recordJson: expect.any(Object) });
    expect(JSON.stringify(recordUpdate?.recordJson)).not.toContain("Executive Summary");
    expect(inserts).toContainEqual(expect.arrayContaining([expect.objectContaining({ submissionId: 101, confirmationStatus: "draft" })]));
    expect(updates).not.toContainEqual(expect.objectContaining({ status: "approved" }));
  });
});
