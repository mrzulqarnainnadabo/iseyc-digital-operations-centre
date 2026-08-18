import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function contextFor(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function user(overrides: Partial<NonNullable<TrpcContext["user"]>>) {
  return { id: 14, openId: "doc-test-user", name: "DOC Test User", email: "doc@test.example", loginMethod: "manus", role: "user" as const, docRole: "officer" as const, isAuthorizedOfficer: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), ...overrides };
}

describe("DOC router access controls", () => {
  it("blocks an ordinary officer from the confidential Command Brief module before any service query", async () => {
    const caller = appRouter.createCaller(contextFor(user({ docRole: "officer" })));
    await expect(caller.doc.commandBriefs({ isTestMode: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a Presidential Council role from the full National President Command layer", async () => {
    const caller = appRouter.createCaller(contextFor(user({ docRole: "presidential_council" })));
    await expect(caller.doc.commandBriefs({ isTestMode: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a signed-in but unauthorised account from Media AI Agent data", async () => {
    const caller = appRouter.createCaller(contextFor(user({ isAuthorizedOfficer: false })));
    await expect(caller.doc.contentQueue({ isTestMode: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a non-administrator from the developmental governance queue", async () => {
    const caller = appRouter.createCaller(contextFor(user({ role: "user", docRole: "officer" })));
    await expect(caller.development.governanceQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a non-administrator from direct participation confirmation and mentorship approval routes", async () => {
    const caller = appRouter.createCaller(contextFor(user({ role: "user", docRole: "officer" })));
    await expect(caller.development.confirmParticipationRecord({ participationId: 13 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.development.approveMentorship({ relationshipId: 21, mentorUserId: 8, agreedFocus: "Attempted direct approval" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks an unauthorised account from the Digital Chamber session register", async () => {
    const caller = appRouter.createCaller(contextFor(user({ isAuthorizedOfficer: false })));
    await expect(caller.chamber.sessions({ isTestMode: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
