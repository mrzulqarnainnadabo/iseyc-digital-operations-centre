import { getContentQueue } from "../doc/service";
import { getApprovedActions, getQueue } from "../meeting/service";
import { listChamberSessions } from "../chamber/service";

type OperationsActor = {
  id: number;
  role: "user" | "admin";
  docRole: string;
  name?: string | null;
  email?: string | null;
};

/**
 * Read-only operational snapshot composed from the same authorization-aware
 * services used by the existing modules. This deliberately avoids a second
 * data-access path so the Command Centre cannot accidentally broaden access.
 */
export async function getOperationsSnapshot(actor: OperationsActor) {
  const [meetings, actions, chamberSessions, contentDrafts] = await Promise.all([
    getQueue({ id: actor.id, role: actor.role }, false),
    getApprovedActions({ id: actor.id, role: actor.role }),
    listChamberSessions(actor, false),
    getContentQueue({ id: actor.id, role: actor.role }, false),
  ]);

  const meetingCounts = countBy(meetings, row => row.status);
  const actionCounts = countBy(actions, row => row.confirmationStatus);
  const chamberCounts = countBy(chamberSessions, row => row.status);
  const contentCounts = countBy(contentDrafts, row => row.status);

  const attention = [
    meetings
      .filter(row => ["needs_human_review", "blocked"].includes(row.status))
      .slice(0, 8)
      .map(row => ({
        type: "meeting" as const,
        id: row.id,
        title: row.meetingTitle,
        status: row.status,
        reason: row.statusReason || "Meeting record requires review.",
      })),
    contentDrafts
      .filter(row => ["revision_requested", "withheld_for_governance_review"].includes(row.status))
      .slice(0, 8)
      .map(row => ({
        type: "content" as const,
        id: row.id,
        title: row.title,
        status: row.status,
        reason: row.status === "revision_requested"
          ? "Content draft has revision feedback."
          : "Content draft is withheld for governance review.",
      })),
    chamberSessions
      .filter(row => row.status === "cancelled")
      .slice(0, 8)
      .map(row => ({
        type: "chamber" as const,
        id: row.id,
        title: row.title,
        status: row.status,
        reason: "Chamber session is cancelled and should be reviewed for follow-on work.",
      })),
  ].flat();

  return {
    generatedAt: new Date().toISOString(),
    scope: {
      liveOnly: true,
      actorId: actor.id,
      actorRole: actor.docRole,
    },
    totals: {
      meetings: meetings.length,
      actions: actions.length,
      chamberSessions: chamberSessions.length,
      contentDrafts: contentDrafts.length,
      attentionItems: attention.length,
    },
    status: {
      meetings: meetingCounts,
      actions: actionCounts,
      chamberSessions: chamberCounts,
      contentDrafts: contentCounts,
    },
    attention,
    safeguards: {
      readOnly: true,
      testRecordsExcluded: true,
      externalActionsPerformed: false,
      authorizationSource: "existing module service boundaries",
    },
  };
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = key(item);
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}
