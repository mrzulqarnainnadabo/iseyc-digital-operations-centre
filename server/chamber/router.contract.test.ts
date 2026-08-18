import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const chamberMocks = vi.hoisted(() => ({
  addChamberParticipant: vi.fn(), createChamberSession: vi.fn(), getChamberSessionDetail: vi.fn(), listChamberDirectory: vi.fn(), listChamberSessions: vi.fn(), requestChamberTrackerDraft: vi.fn(), setParticipantAdmission: vi.fn(), transitionChamberSession: vi.fn(), uploadChamberDocument: vi.fn(),
}));
vi.mock("./service", () => chamberMocks);

import { appRouter } from "../routers";

function contextFor(user: NonNullable<TrpcContext["user"]>): TrpcContext { return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
function officer() { return { id: 14, openId: "chamber-contract", name: "Chamber Officer", email: "officer@iseyc.example", loginMethod: "manus", role: "user" as const, docRole: "officer" as const, isAuthorizedOfficer: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }; }

describe("Digital Chamber router contracts", () => {
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

  it("propagates source scope-protection failures from document upload and tracker handoff instead of creating mixed-scope work", async () => {
    chamberMocks.uploadChamberDocument.mockRejectedValueOnce(new Error("Cross-scope Chamber source material is not permitted."));
    chamberMocks.requestChamberTrackerDraft.mockRejectedValue(new Error("Cross-scope Chamber source material is not permitted."));
    const caller = appRouter.createCaller(contextFor(officer()));
    await expect(caller.chamber.uploadDocument({ sessionId: 18, originalName: "blocked.txt", mimeType: "text/plain", base64: "c291cmNl" })).rejects.toThrow("Cross-scope Chamber source material is not permitted.");
    await expect(caller.chamber.requestTrackerDraft({ sessionId: 17 })).rejects.toThrow("Cross-scope Chamber source material is not permitted.");
  });

  it("filters intentionally mixed participant, audit, and document fixtures at the Chamber session-detail contract", async () => {
    chamberMocks.getChamberSessionDetail.mockResolvedValue({
      session: { id: 17, isTestMode: true },
      participants: [{ id: 1, isTestMode: false, displayName: "Live Officer" }, { id: 2, isTestMode: true, displayName: "Test Officer" }],
      audit: [{ id: 3, isTestMode: false, eventType: "session_created" }, { id: 4, isTestMode: true, eventType: "session_created" }],
      documents: [{ id: 5, isTestMode: false, originalName: "live.txt" }, { id: 6, isTestMode: true, originalName: "test.txt" }],
      canManage: true,
      documentDesk: { enabled: true, message: "controlled" },
    });
    const caller = appRouter.createCaller(contextFor(officer()));
    const detail = await caller.chamber.session({ sessionId: 17 });
    expect(detail.participants).toEqual([{ id: 2, isTestMode: true, displayName: "Test Officer" }]);
    expect(detail.audit).toEqual([{ id: 4, isTestMode: true, eventType: "session_created" }]);
    expect(detail.documents).toEqual([{ id: 6, isTestMode: true, originalName: "test.txt" }]);
  });
});
