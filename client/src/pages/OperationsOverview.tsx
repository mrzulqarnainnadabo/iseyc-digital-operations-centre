import { PageHeading } from "@/components/PageHeading";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileText, Landmark, ListChecks, Radio } from "lucide-react";
import { useLocation } from "wouter";

const READ_MODEL_STALE_TIME = 30_000;

export default function OperationsOverview() {
  const [, setLocation] = useLocation();
  const meetings = trpc.meeting.queue.useQuery({ isTestMode: false }, { staleTime: READ_MODEL_STALE_TIME });
  const actions = trpc.meeting.actions.useQuery(undefined, { staleTime: READ_MODEL_STALE_TIME });
  const chamber = trpc.chamber.sessions.useQuery({ isTestMode: false }, { staleTime: READ_MODEL_STALE_TIME });
  const content = trpc.doc.contentQueue.useQuery({ isTestMode: false }, { staleTime: READ_MODEL_STALE_TIME });

  const loading = meetings.isLoading || actions.isLoading || chamber.isLoading || content.isLoading;
  const error = meetings.error || actions.error || chamber.error || content.error;
  const meetingRows = meetings.data ?? [];
  const actionRows = actions.data ?? [];
  const chamberRows = chamber.data ?? [];
  const contentRows = content.data ?? [];

  const attention = [
    ...meetingRows
      .filter(row => ["needs_human_review", "blocked"].includes(row.status))
      .slice(0, 5)
      .map(row => ({ key: `meeting-${row.id}`, type: "Meeting", title: row.meetingTitle, reason: row.statusReason || "Meeting record requires human review.", action: () => setLocation(`/review/${row.id}`) })),
    ...contentRows
      .filter(row => ["revision_requested", "withheld_for_governance_review"].includes(row.status))
      .slice(0, 5)
      .map(row => ({ key: `content-${row.id}`, type: "Content", title: row.title, reason: row.status === "revision_requested" ? "Revision feedback is waiting." : "Governance review is required.", action: () => setLocation(`/media/${row.id}`) })),
  ].slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Institutional control · live records only"
        title="Operations Overview"
        description="A read-only operational picture assembled from the existing authorised modules. It highlights attention, status and next actions without creating new authority or performing external actions."
      >
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[.12em] text-emerald-800">
          <Radio className="h-3.5 w-3.5" /> Live operational scope
        </div>
      </PageHeading>

      {error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          The operations snapshot could not be completed: {error.message}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileText} label="Meeting records" value={loading ? "—" : meetingRows.length} detail={`${meetingRows.filter(row => row.status === "needs_human_review" || row.status === "blocked").length} need attention`} />
        <MetricCard icon={ListChecks} label="Confirmed action register" value={loading ? "—" : actionRows.length} detail={`${actionRows.filter(row => row.confirmationStatus === "draft").length} still draft`} />
        <MetricCard icon={Landmark} label="Digital Chamber" value={loading ? "—" : chamberRows.length} detail={`${chamberRows.filter(row => row.status === "open" || row.status === "scheduled").length} active/upcoming`} />
        <MetricCard icon={Clock3} label="Content drafts" value={loading ? "—" : contentRows.length} detail={`${contentRows.filter(row => row.status === "revision_requested" || row.status === "withheld_for_governance_review").length} need review`} />
      </section>

      <div className="mt-7 grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-45px_rgba(15,23,42,.45)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Decision support</p>
              <h2 className="mt-1 font-serif text-2xl text-slate-950">What needs attention?</h2>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          {loading ? <div className="p-8 text-sm text-slate-500">Reading operational modules…</div> : !attention.length ? (
            <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-medium text-slate-900">No flagged attention items in the current scope.</p><p className="mt-1 text-sm text-slate-500">This is a read-only scan of live records available to your account.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attention.map(item => (
                <button key={item.key} onClick={item.action} className="flex w-full items-start gap-4 px-6 py-5 text-left transition hover:bg-slate-50">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{item.type}</span><span className="mt-1 block font-medium text-slate-900">{item.title}</span><span className="mt-1 block text-sm leading-5 text-slate-500">{item.reason}</span></span>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,.9)]">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">Operational guardrail</p>
          <h2 className="mt-2 font-serif text-2xl">Human authority remains final.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">This overview reads existing authorised module data. It does not approve records, assign actions, publish content, contact people, or change institutional ownership.</p>
          <div className="mt-6 space-y-3 text-sm">
            <Guardrail text="Test records are excluded from the live overview." />
            <Guardrail text="Existing module authorization boundaries are reused." />
            <Guardrail text="No external communication is performed." />
            <Guardrail text="Attention items remain explainable and reviewable." />
          </div>
        </section>
      </div>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Next actions</p><h2 className="mt-1 font-serif text-2xl text-slate-950">Go to the work, not another dashboard.</h2></div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">The overview is intentionally lightweight. Detailed decisions remain inside the existing controlled modules.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionLink label="Meeting queue" onClick={() => setLocation("/queue")} />
          <ActionLink label="Action register" onClick={() => setLocation("/actions")} />
          <ActionLink label="Digital Chamber" onClick={() => setLocation("/chamber")} />
          <ActionLink label="Media command" onClick={() => setLocation("/media")} />
        </div>
      </section>

      <p className="mt-5 text-xs leading-5 text-slate-400">Generated from live, authorization-scoped module queries. This page is an operational read model; it is not an approval or execution surface.</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: string | number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,.45)]"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-4 w-4" /></span><span className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">{label}</span></div><p className="mt-4 font-serif text-3xl text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Guardrail({ text }: { text: string }) { return <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span className="text-slate-300">{text}</span></div>; }
function ActionLink({ label, onClick }: { label: string; onClick: () => void }) { return <button onClick={onClick} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"><span>{label}</span><ArrowRight className="h-4 w-4 text-slate-400" /></button>; }
