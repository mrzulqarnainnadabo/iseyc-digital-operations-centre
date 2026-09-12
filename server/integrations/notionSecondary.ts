/**
 * Notion secondary engine — archival snapshots only.
 * Keeps Supabase lean: live ops stay in Postgres; summaries/archives go to Notion.
 * Notion is never institutional authority.
 */

import type { DevelopmentJourneyView } from "../development/journey";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export type NotionArchiveResult =
  | { ok: true; pageId: string; url?: string }
  | { ok: false; skipped?: boolean; error: string };

function notionConfig() {
  const token = (process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || "").trim();
  const databaseId = (
    process.env.NOTION_JOURNEY_DATABASE_ID ||
    process.env.NOTION_ARCHIVE_DATABASE_ID ||
    ""
  ).trim();
  return { token, databaseId };
}

export function isNotionSecondaryEnabled(): boolean {
  const { token, databaseId } = notionConfig();
  return Boolean(token && databaseId);
}

export async function archiveJourneySnapshotToNotion(input: {
  userId: number;
  memberKey: string;
  journey: DevelopmentJourneyView;
}): Promise<NotionArchiveResult> {
  const { token, databaseId } = notionConfig();
  if (!token || !databaseId) {
    return {
      ok: false,
      skipped: true,
      error:
        "Notion secondary engine is not configured (set NOTION_TOKEN and NOTION_JOURNEY_DATABASE_ID).",
    };
  }

  const title = `Journey · ${input.memberKey} · ${new Date().toISOString().slice(0, 10)}`;
  const body = {
    parent: { database_id: databaseId.replace(/-/g, "") },
    properties: {
      Name: { title: [{ text: { content: title.slice(0, 200) } }] },
      "Record Type": { select: { name: "journey_snapshot" } },
      Status: { select: { name: "archived" } },
      Source: { select: { name: "doc_app" } },
      "Member Key": {
        rich_text: [{ text: { content: input.memberKey.slice(0, 200) } }],
      },
      "User ID": { number: input.userId },
      "Confirmed Count": {
        number: input.journey.state.confirmedContributionCount,
      },
      "Pending Count": {
        number: input.journey.state.pendingParticipationCount,
      },
      "Next Step": {
        rich_text: [
          {
            text: {
              content: (input.journey.nextStep.title || "").slice(0, 500),
            },
          },
        ],
      },
      Notes: {
        rich_text: [
          {
            text: {
              content: [
                input.journey.state.focusSummary
                  ? `Focus: ${input.journey.state.focusSummary}`
                  : "Focus: not set",
                `Mentorship: ${input.journey.state.mentorship.status}`,
                `Consent: ${input.journey.state.hasActiveConsent ? "active" : "inactive"}`,
              ]
                .join(" · ")
                .slice(0, 1800),
            },
          },
        ],
      },
    },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Next meaningful step" } }],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `${input.journey.nextStep.title}: ${input.journey.nextStep.reason}`.slice(
                  0,
                  1800
                ),
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "Recent milestones (summary)" } }],
        },
      },
      {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: {
                content:
                  input.journey.milestones
                    .slice(0, 8)
                    .map(m => `${m.status}: ${m.title}`)
                    .join(" | ")
                    .slice(0, 1800) || "No milestones yet",
              },
            },
          ],
        },
      },
    ],
  };

  try {
    const res = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      id?: string;
      url?: string;
      message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: json.message || `Notion archive failed (${res.status})`,
      };
    }
    return { ok: true, pageId: json.id || "", url: json.url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Notion archive request failed",
    };
  }
}
