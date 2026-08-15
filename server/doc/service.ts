import { and, desc, eq } from "drizzle-orm";
import { commandBriefRuns, contentDrafts, docAuditLog, institutionalPrompts } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { COMMAND_BRIEF_PROMPT_KEY, COMMAND_BRIEF_PROMPT_VERSION, MEDIA_AI_AGENT_SYSTEM_PROMPT, MEDIA_AI_PROMPT_KEY, MEDIA_AI_PROMPT_VERSION, PRESIDENTIAL_COMMAND_BRIEF_SYSTEM_PROMPT } from "./prompts";
import { mediaDraftStatusFor } from "./guards";
import { assertCommandBriefTransition, mediaDraftPersistenceUpdate, mediaReviewPersistenceUpdate, type CommandBriefStatus } from "./lifecycle";

type SourceApprovalStatus = "approved_external" | "approved_internal" | "pending_confirmation" | "restricted";
type RequestType = "platform_draft" | "response_suggestion" | "outreach_research" | "calendar_item" | "internal_brief";

async function requireDb() { const db = await getDb(); if (!db) throw new Error("Database is unavailable."); return db; }
async function audit(moduleKey: string, recordId: number, eventType: string, detail: string, isTestMode: boolean, actorUserId?: number) { const db = await requireDb(); await db.insert(docAuditLog).values({ moduleKey, recordId, eventType, detail, isTestMode, actorUserId }); }

export async function ensureInstitutionalPrompts() {
  const db = await requireDb();
  for (const prompt of [
    { promptKey: COMMAND_BRIEF_PROMPT_KEY, version: COMMAND_BRIEF_PROMPT_VERSION, content: PRESIDENTIAL_COMMAND_BRIEF_SYSTEM_PROMPT },
    { promptKey: MEDIA_AI_PROMPT_KEY, version: MEDIA_AI_PROMPT_VERSION, content: MEDIA_AI_AGENT_SYSTEM_PROMPT },
  ]) {
    const existing = await db.select().from(institutionalPrompts).where(and(eq(institutionalPrompts.promptKey, prompt.promptKey), eq(institutionalPrompts.version, prompt.version))).limit(1);
    if (!existing[0]) await db.insert(institutionalPrompts).values(prompt);
  }
}

export async function getDocOverview() {
  const db = await requireDb();
  await ensureInstitutionalPrompts();
  const [briefs, media] = await Promise.all([
    db.select().from(commandBriefRuns).orderBy(desc(commandBriefRuns.createdAt)).limit(6),
    db.select().from(contentDrafts).where(eq(contentDrafts.isTestMode, false)).orderBy(desc(contentDrafts.updatedAt)).limit(8),
  ]);
  return { briefs, media };
}

export async function createCommandBrief(input: { coverageStart: Date; coverageEnd: Date; sourceSummary: string; isTestMode: boolean; actorUserId: number }) {
  const db = await requireDb(); await ensureInstitutionalPrompts();
  const result = await db.insert(commandBriefRuns).values({ coverageStart: input.coverageStart, coverageEnd: input.coverageEnd, sourceSummary: input.sourceSummary, isTestMode: input.isTestMode, generatedByUserId: input.actorUserId, status: "source_pending", promptVersion: COMMAND_BRIEF_PROMPT_VERSION });
  const id = Number(result[0].insertId); await audit("presidential_command_brief", id, "brief_source_created", "Source material submitted for confidential draft briefing; no brief was sent or approved.", input.isTestMode, input.actorUserId); return id;
}

export async function generateCommandBrief(id: number, input: { actorUserId: number; testOnly?: boolean }) {
  const db = await requireDb(); const brief = (await db.select().from(commandBriefRuns).where(eq(commandBriefRuns.id, id)).limit(1))[0];
  if (!brief) throw new Error("Command Brief source record not found."); if (input.testOnly && !brief.isTestMode) throw new Error("Test generation cannot access live Command Brief records.");
  try {
    const response = await invokeLLM({ model: "gpt-5-mini", max_tokens: 2200, messages: [{ role: "system", content: PRESIDENTIAL_COMMAND_BRIEF_SYSTEM_PROMPT }, { role: "user", content: `Create the confidential draft brief from this authorised source material. Do not execute any decision or action. Coverage: ${brief.coverageStart.toISOString()} to ${brief.coverageEnd.toISOString()}\n\n${brief.sourceSummary}` }] });
    const draftBody = response.choices[0]?.message.content; if (!draftBody || typeof draftBody !== "string") throw new Error("The briefing service did not return draft text.");
    assertCommandBriefTransition(brief.status as CommandBriefStatus, "draft_ready");
    await db.update(commandBriefRuns).set({ draftBody, status: "draft_ready", statusReason: "Confidential draft generated. Human review is required before internal use." }).where(eq(commandBriefRuns.id, id));
    await audit("presidential_command_brief", id, "brief_draft_ready", "Confidential draft generated; no brief was sent, finalised, or acted upon.", brief.isTestMode, input.actorUserId); return { status: "draft_ready" as const };
  } catch (error) { const message = error instanceof Error ? error.message : "Unknown briefing error."; assertCommandBriefTransition(brief.status as CommandBriefStatus, "withheld_for_review"); await db.update(commandBriefRuns).set({ status: "withheld_for_review", statusReason: message }).where(eq(commandBriefRuns.id, id)); await audit("presidential_command_brief", id, "brief_generation_withheld", message, brief.isTestMode, input.actorUserId); throw error; }
}

export async function getCommandBriefs(isTestMode = false) { const db = await requireDb(); return db.select().from(commandBriefRuns).where(eq(commandBriefRuns.isTestMode, isTestMode)).orderBy(desc(commandBriefRuns.updatedAt)); }
export async function getCommandBrief(id: number) { const db = await requireDb(); return (await db.select().from(commandBriefRuns).where(eq(commandBriefRuns.id, id)).limit(1))[0] || null; }
export async function reviewCommandBrief(id: number, actorUserId: number, decision: "under_review" | "approved_for_internal_use" | "withheld_for_review", note?: string) { const db = await requireDb(); const brief = await getCommandBrief(id); if (!brief) throw new Error("Command Brief not found."); if (!["draft_ready", "under_review", "withheld_for_review"].includes(brief.status)) throw new Error("Only a generated Command Brief draft can be reviewed."); assertCommandBriefTransition(brief.status as CommandBriefStatus, decision); await db.update(commandBriefRuns).set({ status: decision, reviewedByUserId: actorUserId, reviewedAt: new Date(), statusReason: note || "Human review recorded. No distribution performed." }).where(eq(commandBriefRuns.id, id)); await audit("presidential_command_brief", id, "brief_reviewed", `${decision}: ${note || "No note provided."}`, brief.isTestMode, actorUserId); }

function mediaSchema() { const s = { type: "string" }; const object = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", properties, required, additionalProperties: false }); const outreach = object({ organisation: s, relevance: s, officialPublicChannel: s, purpose: s }, ["organisation", "relevance", "officialPublicChannel", "purpose"]); return object({ institutionalObjective: s, sourceGovernanceCheck: s, xDraft: s, whatsappDraft: s, linkedInDraft: s, responseSuggestion: s, outreachResearch: { type: "array", items: outreach }, humanReviewRequired: s, riskFlag: { type: "boolean" }, closingLine: s }, ["institutionalObjective", "sourceGovernanceCheck", "xDraft", "whatsappDraft", "linkedInDraft", "responseSuggestion", "outreachResearch", "humanReviewRequired", "riskFlag", "closingLine"]); }

export async function createContentDraft(input: { title: string; requestType: RequestType; objective: string; intendedAudience: string; channels: string[]; sourceReference: string; sourceMaterial: string; sourceApprovalStatus: SourceApprovalStatus; sensitivity: "public" | "internal" | "confidential" | "restricted"; targetDate?: Date; isTestMode: boolean; actorUserId: number }) {
  const db = await requireDb(); await ensureInstitutionalPrompts();
  const result = await db.insert(contentDrafts).values({ title: input.title, requestType: input.requestType, objective: input.objective, intendedAudience: input.intendedAudience, channelsJson: input.channels, sourceReference: input.sourceReference, sourceMaterial: input.sourceMaterial, sourceApprovalStatus: input.sourceApprovalStatus, sensitivity: input.sensitivity, status: input.sourceApprovalStatus === "restricted" ? "withheld_for_governance_review" : "source_pending_approval", contentOwnerUserId: input.actorUserId, targetDate: input.targetDate || null, isTestMode: input.isTestMode, publicationPerformed: false, promptVersion: MEDIA_AI_PROMPT_VERSION });
  const id = Number(result[0].insertId); await audit("social_media_content_command", id, "content_source_created", "Content source created as a draft-only item; no external action was performed.", input.isTestMode, input.actorUserId); return id;
}

export async function generateContentDraft(id: number, input: { actorUserId: number; testOnly?: boolean }) {
  const db = await requireDb(); const item = (await db.select().from(contentDrafts).where(eq(contentDrafts.id, id)).limit(1))[0];
  if (!item) throw new Error("Content draft source not found."); if (input.testOnly && !item.isTestMode) throw new Error("Test generation cannot access live content records."); if (item.sourceApprovalStatus === "restricted") { await db.update(contentDrafts).set({ status: "withheld_for_governance_review" }).where(eq(contentDrafts.id, id)); await audit("social_media_content_command", id, "content_withheld", "Restricted source material requires human governance review.", item.isTestMode, input.actorUserId); return { status: "withheld_for_governance_review" as const }; }
  try {
    const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: MEDIA_AI_AGENT_SYSTEM_PROMPT }, { role: "user", content: `Create a draft-only content package. Requested channels: ${JSON.stringify(item.channelsJson)}. Objective: ${item.objective}. Audience: ${item.intendedAudience}. Source reference: ${item.sourceReference}. Source approval status: ${item.sourceApprovalStatus}. Sensitivity: ${item.sensitivity}. Source material follows:\n\n${item.sourceMaterial}` }], response_format: { type: "json_schema", json_schema: { name: "ise yc_media_draft".replace(" ", ""), strict: true, schema: mediaSchema() } } });
    const content = response.choices[0]?.message.content; if (!content || typeof content !== "string") throw new Error("The media drafting service did not return structured draft content."); const draft = JSON.parse(content) as { riskFlag: boolean; closingLine: string }; draft.closingLine = "Empowering Youths, Shaping Communities."; const status = mediaDraftStatusFor(item.sourceApprovalStatus as SourceApprovalStatus, Boolean(draft.riskFlag));
    await db.update(contentDrafts).set(mediaDraftPersistenceUpdate(draft, status)).where(eq(contentDrafts.id, id)); await audit("social_media_content_command", id, "content_draft_generated", `Draft generated with ${status}; no content was published, sent, scheduled, or posted.`, item.isTestMode, input.actorUserId); return { status };
  } catch (error) { const message = error instanceof Error ? error.message : "Unknown media drafting error."; await db.update(contentDrafts).set({ status: "withheld_for_governance_review" }).where(eq(contentDrafts.id, id)); await audit("social_media_content_command", id, "content_generation_withheld", message, item.isTestMode, input.actorUserId); throw error; }
}

export async function getContentQueue(actor: { id: number; role: "user" | "admin" }, isTestMode = false) { const db = await requireDb(); const rows = await db.select().from(contentDrafts).where(eq(contentDrafts.isTestMode, isTestMode)).orderBy(desc(contentDrafts.updatedAt)); return actor.role === "admin" ? rows : rows.filter(row => row.contentOwnerUserId === actor.id); }
export async function getContentDraft(id: number, actor: { id: number; role: "user" | "admin" }) { const db = await requireDb(); const item = (await db.select().from(contentDrafts).where(eq(contentDrafts.id, id)).limit(1))[0]; if (!item) return null; if (actor.role !== "admin" && item.contentOwnerUserId !== actor.id) throw new Error("You are not authorised to view this content draft."); return item; }
export async function reviewContentDraft(id: number, actorUserId: number, decision: "revision_requested" | "approved_for_publication" | "withheld_for_governance_review") { const db = await requireDb(); const item = (await db.select().from(contentDrafts).where(eq(contentDrafts.id, id)).limit(1))[0]; if (!item) throw new Error("Content draft not found."); if (!item.draftJson) throw new Error("A generated draft is required before review."); await db.update(contentDrafts).set(mediaReviewPersistenceUpdate(decision, actorUserId)).where(eq(contentDrafts.id, id)); await audit("social_media_content_command", id, "content_reviewed", `${decision}; approval does not publish, send, or schedule content.`, item.isTestMode, actorUserId); }
export async function loadSampleContent(actorUserId: number) { return createContentDraft({ title: "Sample — Community Readiness Update", requestType: "platform_draft", objective: "Prepare a factual institutional update on approved programme readiness.", intendedAudience: "ISEYC members and community partners", channels: ["X", "WhatsApp", "LinkedIn"], sourceReference: "Approved sample operational update — DOC test material", sourceMaterial: "ISEYC has confirmed that regional focal points are preparing readiness updates using the approved template. The first internal reporting checkpoint is 25 Sep 2026. This sample is for controlled test use only and must not be presented as a live public announcement.", sourceApprovalStatus: "approved_external", sensitivity: "internal", isTestMode: true, actorUserId }); }
