import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  invokeLLM: vi.fn(),
}));

vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { generateCommandBrief, generateContentDraft, reviewContentDraft } from "./service";

function makeDb(record: unknown, updates: Array<Record<string, unknown>>) {
  const selectChain = { limit: vi.fn(async () => [record]) };
  const whereChain = { limit: selectChain.limit, orderBy: vi.fn(async () => [record]) };
  const fromChain = { where: vi.fn(() => whereChain), orderBy: vi.fn(async () => [record]) };
  return {
    select: vi.fn(() => ({ from: vi.fn(() => fromChain) })),
    update: vi.fn(() => ({ set: vi.fn((payload: Record<string, unknown>) => { updates.push(payload); return { where: vi.fn(async () => undefined) }; }) })),
    insert: vi.fn(() => ({ values: vi.fn(() => Object.assign(Promise.resolve([{ id: 1 }]), { returning: vi.fn(async () => [{ id: 1 }]) })) })),
  } as any;
}

const liveBrief = {
  id: 10, coverageStart: new Date(), coverageEnd: new Date(), sourceSummary: "Approved operational sources", status: "source_pending", isTestMode: false, generatedByUserId: 1, promptVersion: "ISEYC-PCB-DOC-1.0",
};

const liveContent = {
  id: 20, title: "Live source", requestType: "platform_draft", objective: "Prepare a controlled draft", intendedAudience: "Members", channelsJson: ["X"], sourceReference: "Approved source", sourceMaterial: "Approved institutional source material for a controlled public draft.", sourceApprovalStatus: "approved_external", sensitivity: "public", status: "source_pending_approval", draftJson: null, contentOwnerUserId: 1, isTestMode: false, publicationPerformed: false, promptVersion: "ISEYC-MEDIA-DOC-1.0",
};

describe("DOC service-flow safeguards", () => {
  beforeEach(() => { mocks.getDb.mockReset(); mocks.invokeLLM.mockReset(); });

  it("blocks a test-only Command Brief generation request before any LLM or persistence action can touch a live record", async () => {
    const updates: Array<Record<string, unknown>> = []; mocks.getDb.mockResolvedValue(makeDb(liveBrief, updates));
    await expect(generateCommandBrief(10, { actorUserId: 1, testOnly: true })).rejects.toThrow("Test generation cannot access live Command Brief records.");
    expect(mocks.invokeLLM).not.toHaveBeenCalled(); expect(updates).toHaveLength(0);
  });

  it("blocks a test-only Media AI Agent request before any LLM or persistence action can touch a live content record", async () => {
    const updates: Array<Record<string, unknown>> = []; mocks.getDb.mockResolvedValue(makeDb(liveContent, updates));
    await expect(generateContentDraft(20, { actorUserId: 1, testOnly: true })).rejects.toThrow("Test generation cannot access live content records.");
    expect(mocks.invokeLLM).not.toHaveBeenCalled(); expect(updates).toHaveLength(0);
  });

  it("persists a generated Media AI Agent package as an unpublished draft even when its source is approved for external use", async () => {
    const updates: Array<Record<string, unknown>> = []; mocks.getDb.mockResolvedValue(makeDb(liveContent, updates));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ institutionalObjective: "Inform members", sourceGovernanceCheck: "Clear", xDraft: "A controlled update", whatsappDraft: "A controlled update", linkedInDraft: "A controlled update", responseSuggestion: "Not requested.", outreachResearch: [], humanReviewRequired: "Communications review", riskFlag: false, closingLine: "Empowering Youths, Shaping Communities." }) } }] });
    const result = await generateContentDraft(20, { actorUserId: 1 });
    expect(result.status).toBe("draft_ready"); expect(updates[0]).toMatchObject({ status: "draft_ready", publicationPerformed: false });
  });

  it("keeps publicationPerformed false when an administrator records approval for independent publication", async () => {
    const updates: Array<Record<string, unknown>> = []; mocks.getDb.mockResolvedValue(makeDb({ ...liveContent, draftJson: { xDraft: "Draft" }, status: "draft_ready" }, updates));
    await reviewContentDraft(20, 7, "approved_for_publication");
    expect(updates[0]).toMatchObject({ status: "approved_for_publication", requiredReviewerUserId: 7, publicationPerformed: false });
  });
});
