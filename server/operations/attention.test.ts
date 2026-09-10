import { describe, expect, it } from "vitest";
import { User } from "../../drizzle/schema";
import {
  evaluateActionItemAttention,
  evaluateBriefAttention,
  evaluateSubmissionAttention,
  scanOperationalAttention,
  sortAttention,
  summarizeAttention,
} from "./attention";

const NOW = new Date("2026-09-10T12:00:00.000Z");

describe("evaluateActionItemAttention severity policy", () => {
  it("flags missing owner as medium severity assign", () => {
    const items = evaluateActionItemAttention(
      {
        id: 1,
        actionDescription: "Submit regional readiness update",
        accountableOwner: "TBD",
        dueDate: "25 Sep 2026",
        confirmationStatus: "confirmed",
        submissionId: 10,
      },
      { isTestMode: false, meetingTitle: "Committee" },
      NOW
    );
    expect(items.some(i => i.type === "missing_owner" && i.severity === "medium" && i.recommendedAction === "assign")).toBe(true);
  });

  it("flags overdue confirmed actions as high severity (not critical)", () => {
    const items = evaluateActionItemAttention(
      {
        id: 2,
        actionDescription: "Circulate template",
        accountableOwner: "Operations Officer",
        dueDate: "2026-08-01",
        confirmationStatus: "confirmed",
        submissionId: 11,
      },
      { isTestMode: false, meetingTitle: "Committee" },
      NOW
    );
    const overdue = items.find(i => i.type === "overdue_action");
    expect(overdue).toBeTruthy();
    expect(overdue!.severity).toBe("high");
    expect(overdue!.recommendedAction).toBe("follow_up");
  });

  it("does not mark draft actions as overdue institutional work", () => {
    const items = evaluateActionItemAttention(
      {
        id: 3,
        actionDescription: "Draft only action",
        accountableOwner: "Officer A",
        dueDate: "2026-01-01",
        confirmationStatus: "draft",
        submissionId: 12,
      },
      { isTestMode: false, meetingTitle: "Committee" },
      NOW
    );
    expect(items.some(i => i.type === "overdue_action")).toBe(false);
    expect(items.some(i => i.type === "draft_unconfirmed" && i.severity === "low")).toBe(true);
  });
});

describe("evaluateSubmissionAttention severity policy", () => {
  it("flags blocked submissions as high severity (not critical unless designated)", () => {
    const items = evaluateSubmissionAttention(
      {
        id: 5,
        meetingTitle: "Blocked session",
        status: "blocked",
        statusReason: "Conflicting sources",
        isTestMode: false,
        updatedAt: NOW,
      },
      NOW
    );
    expect(items[0]?.type).toBe("blocked");
    expect(items[0]?.severity).toBe("high");
  });

  it("flags needs_human_review as governance_review high severity", () => {
    const items = evaluateSubmissionAttention(
      {
        id: 6,
        meetingTitle: "Needs review",
        status: "needs_human_review",
        statusReason: null,
        isTestMode: false,
        updatedAt: NOW,
      },
      NOW
    );
    expect(items.some(i => i.type === "governance_review" && i.severity === "high")).toBe(true);
  });
});

describe("evaluateBriefAttention", () => {
  it("requires review for draft_ready briefs as medium severity", () => {
    const items = evaluateBriefAttention(
      {
        id: 9,
        status: "draft_ready",
        statusReason: null,
        isTestMode: false,
        coverageStart: NOW,
      },
      NOW
    );
    expect(items[0]?.recommendedAction).toBe("review");
    expect(items[0]?.severity).toBe("medium");
  });
});

describe("sortAttention + summarizeAttention", () => {
  it("orders high before medium", () => {
    const sorted = sortAttention([
      {
        id: "b",
        type: "incomplete",
        severity: "low",
        recordKind: "meeting_action_item",
        recordId: 1,
        title: "x",
        reason: "r",
        recommendedAction: "monitor",
        destination: "/",
        isTestMode: false,
        detectedAt: NOW.toISOString(),
      },
      {
        id: "a",
        type: "blocked",
        severity: "high",
        recordKind: "meeting_submission",
        recordId: 2,
        title: "y",
        reason: "r",
        recommendedAction: "investigate",
        destination: "/",
        isTestMode: false,
        detectedAt: NOW.toISOString(),
      },
    ]);
    expect(sorted[0].severity).toBe("high");
  });

  it("summarizes counts", () => {
    const summary = summarizeAttention([
      {
        id: "1",
        type: "overdue_action",
        severity: "high",
        recordKind: "meeting_action_item",
        recordId: 1,
        title: "t",
        reason: "r",
        recommendedAction: "follow_up",
        destination: "/",
        isTestMode: false,
        detectedAt: NOW.toISOString(),
      },
      {
        id: "2",
        type: "blocked",
        severity: "high",
        recordKind: "meeting_submission",
        recordId: 2,
        title: "t",
        reason: "r",
        recommendedAction: "investigate",
        destination: "/",
        isTestMode: false,
        detectedAt: NOW.toISOString(),
      },
    ]);
    expect(summary.attentionCount).toBe(2);
    expect(summary.highCount).toBe(2);
    expect(summary.overdueActionCount).toBe(1);
  });
});

describe("scanOperationalAttention user context authorization safety", () => {
  it("returns empty attention if user is null or not an authorized officer", async () => {
    const items = await scanOperationalAttention(null);
    expect(items).toEqual([]);

    const unauthorizedUser: Partial<User> = { id: 1, isAuthorizedOfficer: false };
    const items2 = await scanOperationalAttention(unauthorizedUser as User);
    expect(items2).toEqual([]);
  });
});
