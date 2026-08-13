import { PageHeading } from "@/components/PageHeading";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Check, ChevronLeft, FileCheck2, Loader2, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";

type Draft = {
  meetingIdentity?: Record<string, string>;
  attendance?: { attendees?: string[]; apologies?: string[]; absentees?: string[] };
  agendaPurpose?: string;
  keyDiscussions?: string[];
  decisions?: Array<{ statement: string; status: string; decisionMaker: string; decisionDate: string; conditions: string; evidenceLocation: string }>;
  actionItems?: Array<{ actionDescription: string; accountableOwner: string; supportingParties: string; dueDate: string; sourceStatus: string; dependency: string; evidenceLocation: string }>;
  risks?: Array<{ issue: string; category: string; evidenceStatus: string; effect: string; requiredReview: string; evidenceLocation: string }>;
  openQuestions?: string[];
  continuityNotes?: string[];
  qualityGate?: Record<string, string>;
  sourceTraceability?: Array<{ outputArea: string; sourceReference: string; traceabilityNote: string }>;
};

const sections = [
  ["meeting_identity", "Meeting identity"],
  ["agenda_purpose", "Agenda and purpose"],
  ["key_discussions", "Key discussions"],
  ["decisions", "Decisions"],
  ["action_items", "Action items"],
  ["risks", "Risks, issues, and dependencies"],
  ["open_questions", "Open questions and parking lot"],
  ["continuity_notes", "Institutional continuity notes"],
] as const;

function EmptyState() { return <p className="text-sm italic text-slate-500">Not recorded.</p>; }

export default function ReviewRecord() {
  const [, params] = useRoute("/review/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const id = Number(params?.id);
  const detail = trpc.meeting.detail.useQuery({ submissionId: id }, { enabled: Number.isFinite(id) });
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const review = trpc.meeting.reviewSection.useMutation({ onSuccess: () => { setNote(""); utils.meeting.detail.invalidate({ submissionId: id }); utils.meeting.queue.invalidate(); } });
  const openReview = trpc.meeting.beginReview.useMutation({ onSuccess: () => { utils.meeting.detail.invalidate({ submissionId: id }); utils.meeting.queue.invalidate(); } });
  const approve = trpc.meeting.approve.useMutation({ onSuccess: () => { utils.meeting.detail.invalidate({ submissionId: id }); utils.meeting.queue.invalidate(); } });
  const item = detail.data?.submission;
  const draft = useMemo(() => (item?.recordJson || {}) as Draft, [item?.recordJson]);
  const canReview = user?.role === "admin" && !!item && ["draft_ready", "under_review", "needs_human_review"].includes(item.status);

  if (detail.isLoading) return <div className="mx-auto max-w-7xl p-10 text-sm text-slate-500">Loading controlled record…</div>;
  if (!item) return <div className="mx-auto max-w-7xl p-10"><Button variant="outline" onClick={() => setLocation("/queue")}><ChevronLeft className="mr-2 h-4 w-4" />Return to queue</Button><p className="mt-6 text-slate-600">This record is unavailable or you are not authorised to view it.</p></div>;

  const submitReview = (sectionKey: string, decision: "approved" | "revision_requested" | "rejected") => review.mutate({ submissionId: id, sectionKey, decision, reviewNote: note || undefined });

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={item.isTestMode ? "Isolated test record" : "Controlled review"} title={item.meetingTitle} description="The structured output below is a draft representation of the source material. Approval is a human governance action, not an automated status change."><Button variant="outline" onClick={() => setLocation(item.isTestMode ? "/test-mode" : "/queue")}><ChevronLeft className="mr-2 h-4 w-4" />Return</Button>{canReview && item.status === "draft_ready" ? <Button variant="outline" onClick={() => openReview.mutate({ submissionId: id })} disabled={openReview.isPending}>Open review</Button> : null}{canReview ? <Button className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => approve.mutate({ submissionId: id })} disabled={approve.isPending}>{approve.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}Approve record</Button> : null}</PageHeading>
    {item.isTestMode ? <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">This is an isolated test record. It remains outside live queue and action-register queries, even when a reviewer tests approval controls.</div> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Record control</p><h2 className="mt-1 font-serif text-2xl text-slate-950">Draft Meeting & Decision Record</h2></div><StatusPill status={item.status} /></div><dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">{[["Date", item.meetingDate || "Not recorded"],["Convening body", item.conveningBody || "Not recorded"],["Sensitivity", item.sensitivity],["Prompt version", item.authoritativePromptVersion]].map(([term, value]) => <div key={term}><dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">{term}</dt><dd className="mt-1 text-sm text-slate-700">{value}</dd></div>)}</dl>{item.statusReason ? <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{item.statusReason}</div> : null}</section>
        <RecordSection title="Meeting identity" sectionKey="meeting_identity" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}><KeyValue data={draft.meetingIdentity} /></RecordSection>
        <RecordSection title="Attendance summary" sectionKey="attendance" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}><div className="grid gap-4 sm:grid-cols-3"><Roster label="Attendees" people={draft.attendance?.attendees} /><Roster label="Apologies" people={draft.attendance?.apologies} /><Roster label="Absentees" people={draft.attendance?.absentees} /></div></RecordSection>
        <RecordSection title="Agenda and purpose" sectionKey="agenda_purpose" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}>{draft.agendaPurpose ? <p className="text-sm leading-7 text-slate-700">{draft.agendaPurpose}</p> : <EmptyState />}</RecordSection>
        <RecordSection title="Key discussions" sectionKey="key_discussions" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}><List values={draft.keyDiscussions} /></RecordSection>
        <RecordSection title="Decisions" sectionKey="decisions" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}>{draft.decisions?.length ? <div className="space-y-3">{draft.decisions.map((decision, index) => <div key={index} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900">{decision.statement}</p><StatusPill status={decision.status.toLowerCase().replaceAll(" ", "_")} /></div><p className="mt-2 text-sm text-slate-600">Decision-maker: {decision.decisionMaker || "Not recorded"} · Date: {decision.decisionDate || "Not recorded"}</p><p className="mt-2 text-xs text-slate-500">Conditions: {decision.conditions || "Not recorded"} · Evidence: {decision.evidenceLocation || "Not recorded"}</p></div>)}</div> : <EmptyState />}</RecordSection>
        <RecordSection title="Action items" sectionKey="action_items" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}>{draft.actionItems?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-[.11em] text-slate-400"><tr><th className="pb-3 pr-4">Action</th><th className="pb-3 pr-4">Owner</th><th className="pb-3 pr-4">Due</th><th className="pb-3">Status</th></tr></thead><tbody>{draft.actionItems.map((action, index) => <tr key={index} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-4 text-slate-800">{action.actionDescription}<p className="mt-1 text-xs text-slate-500">{action.evidenceLocation || "Evidence not recorded"}</p></td><td className="py-3 pr-4 text-slate-600">{action.accountableOwner || "Owner not recorded"}</td><td className="py-3 pr-4 text-slate-600">{action.dueDate || "Not recorded"}</td><td className="py-3 text-slate-600">{action.sourceStatus || "Not recorded"}</td></tr>)}</tbody></table></div> : <EmptyState />}</RecordSection>
        <RecordSection title="Risks, issues, and dependencies" sectionKey="risks" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}>{draft.risks?.length ? <div className="space-y-3">{draft.risks.map((risk, index) => <div key={index} className="rounded-xl border border-amber-100 bg-amber-50/40 p-4"><p className="font-medium text-slate-900">{risk.issue}</p><p className="mt-1 text-sm text-slate-600">{risk.effect}</p><p className="mt-2 text-xs text-slate-500">{risk.category} · {risk.evidenceStatus} · Review: {risk.requiredReview || "Not recorded"}</p></div>)}</div> : <EmptyState />}</RecordSection>
        <RecordSection title="Open questions and parking lot" sectionKey="open_questions" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}><List values={draft.openQuestions} /></RecordSection>
        <RecordSection title="Institutional continuity notes" sectionKey="continuity_notes" canReview={canReview} onReview={submitReview} note={note} setNote={setNote}><List values={draft.continuityNotes} /></RecordSection>
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl text-slate-900">Quality and approval gate</h2><KeyValue data={draft.qualityGate} /><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-[.11em] text-slate-400"><tr><th className="pb-3 pr-4">Output</th><th className="pb-3 pr-4">Reference</th><th className="pb-3">Traceability note</th></tr></thead><tbody>{draft.sourceTraceability?.length ? draft.sourceTraceability.map((trace, index) => <tr key={index} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-4">{trace.outputArea}</td><td className="py-3 pr-4 text-slate-600">{trace.sourceReference}</td><td className="py-3 text-slate-600">{trace.traceabilityNote}</td></tr>) : <tr><td colSpan={3} className="py-4 text-slate-500">No traceability notes recorded.</td></tr>}</tbody></table></div></section>
      </div>
      <aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-serif text-xl text-slate-900">Review history</h2><div className="mt-4 space-y-4">{detail.data?.reviews.length ? detail.data.reviews.map(reviewItem => <div key={reviewItem.id} className="border-l-2 border-slate-200 pl-3"><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{reviewItem.sectionKey.replaceAll("_", " ")}</p><p className="mt-1 text-sm font-medium text-slate-800">{reviewItem.decision.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{reviewItem.reviewNote || "No note recorded."}</p></div>) : <p className="text-sm text-slate-500">No section review has been recorded.</p>}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-serif text-xl text-slate-900">Source materials</h2><div className="mt-4 space-y-3">{detail.data?.files.map(file => <a key={file.id} href={file.storageUrl} target="_blank" rel="noreferrer" className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">{file.originalName}<span className="mt-1 block text-xs text-slate-400">{file.documentType.replaceAll("_", " ")}</span></a>)}</div></section><section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-slate-50"><AlertTriangle className="h-5 w-5 text-amber-300" /><h2 className="mt-3 font-serif text-xl">Authority control</h2><p className="mt-2 text-sm leading-6 text-slate-300">Review evidence is retained. Record approval never confirms actions automatically; each approved-record action must be confirmed separately in the Action Register.</p></section></aside>
    </div></div>;
}

function RecordSection({ title, sectionKey, children, canReview, onReview, note, setNote }: { title: string; sectionKey: string; children: React.ReactNode; canReview: boolean; onReview: (section: string, decision: "approved" | "revision_requested" | "rejected") => void; note: string; setNote: (value: string) => void }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><h2 className="font-serif text-xl text-slate-900">{title}</h2>{canReview ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onReview(sectionKey, "revision_requested")}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Revision</Button><Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => onReview(sectionKey, "rejected")}><X className="mr-1.5 h-3.5 w-3.5" />Reject</Button><Button size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => onReview(sectionKey, "approved")}><Check className="mr-1.5 h-3.5 w-3.5" />Approve section</Button></div> : null}</div><div className="mt-5">{children}</div>{canReview ? <Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Optional review note, applied to the next section decision." className="mt-5 min-h-20 text-sm" /> : null}</section>; }
function KeyValue({ data }: { data?: Record<string, string> }) { const entries = Object.entries(data || {}); return entries.length ? <dl className="mt-5 grid gap-4 sm:grid-cols-2">{entries.map(([term, value]) => <div key={term}><dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">{term.replace(/([A-Z])/g, " $1")}</dt><dd className="mt-1 text-sm text-slate-700">{value || "Not recorded."}</dd></div>)}</dl> : <EmptyState />; }
function Roster({ label, people }: { label: string; people?: string[] }) { return <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">{label}</p>{people?.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{people.map((person, index) => <li key={`${person}-${index}`}>{person}</li>)}</ul> : <p className="mt-2 text-sm italic text-slate-500">Not recorded.</p>}</div>; }
function List({ values }: { values?: string[] }) { return values?.length ? <ul className="space-y-2">{values.map((value, index) => <li key={`${value}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />{value}</li>)}</ul> : <EmptyState />; }
