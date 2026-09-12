import { PageHeading } from "@/components/PageHeading";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowRight, CheckCircle2, FilePlus2, ShieldCheck, TimerReset } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queue = trpc.meeting.queue.useQuery({ isTestMode: false });
  const settings = trpc.meeting.settings.useQuery();
  const fallback = trpc.meeting.fallbackMetadata.useQuery(undefined, { enabled: user?.role === "admin" });
  const configureFallback = trpc.meeting.configureFallback.useMutation({ onSuccess: () => fallback.refetch() });
  const attentionQuery = trpc.operations.attention.useQuery({ includeTestMode: false });

  const items = queue.data || [];
  const awaitingReview = items.filter(item => ["draft_ready", "under_review", "needs_human_review"].includes(item.status));
  const attentionItems = attentionQuery.data?.items || [];
  const summary = attentionQuery.data?.summary;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Authorised officer workspace"
        title="Meeting & Decision Tracker"
        description="A controlled institutional workflow for transforming meeting materials into traceable draft records under explicit human oversight."
      >
        <Button onClick={() => setLocation("/intake")} className="bg-emerald-950 text-white hover:bg-emerald-900">
          <FilePlus2 className="mr-2 h-4 w-4" />New intake
        </Button>
      </PageHeading>

      {/* Hero Banner */}
      <section className="overflow-hidden rounded-3xl bg-emerald-950 px-7 py-8 text-slate-50 shadow-[0_30px_80px_-45px_rgba(2,44,34,.9)] sm:px-9">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-300">Institutional record control</p>
            <h2 className="mt-4 max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">Every record begins as evidence-linked draft work.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-100/80">The authoritative ISEYC Meeting & Decision Tracker prompt is used for drafting. It does not approve records, assign people, confirm actions, or close commitments.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setLocation("/queue")} className="bg-amber-500 font-semibold text-emerald-950 hover:bg-amber-400">
                Review live queue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setLocation("/test-mode")} className="border-emerald-700 bg-transparent text-emerald-100 hover:bg-emerald-900 hover:text-white">
                Run isolated test
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Live submissions" value={items.length} />
            <Stat label="Review required" value={awaitingReview.length} />
            <div className="col-span-2 rounded-2xl border border-emerald-800/60 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-emerald-300/80">Consolidation window</p>
              <p className="mt-2 text-lg font-medium">{settings.data?.consolidationMinutes || 12} minutes</p>
              <p className="mt-1 text-xs leading-5 text-emerald-200/60">Related materials are grouped before drafting begins.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Attention Section */}
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-800">Operational Attention</p>
            <h2 className="mt-1 font-serif text-2xl text-slate-950">Needs Attention</h2>
          </div>
          {summary ? (
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{summary.attentionCount} Total</span>
              {summary.highCount > 0 ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">{summary.highCount} High Priority</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          {attentionQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">Scanning operational attention items...</p>
          ) : attentionItems.length === 0 ? (
            <div className="flex items-center gap-3 py-6 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>All operational records are currently clear and up to date. No immediate attention required.</span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {attentionItems.slice(0, 6).map(item => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-emerald-300 hover:bg-white"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          item.severity === "critical"
                            ? "bg-rose-100 text-rose-800"
                            : item.severity === "high"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 capitalize">{item.recordKind.replaceAll("_", " ")}</span>
                    </div>
                    <h3 className="mt-2.5 font-semibold text-slate-900 text-sm line-clamp-1">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">{item.reason}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-medium text-slate-500 capitalize">Rec: {item.recommendedAction.replaceAll("_", " ")}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLocation(item.destination)}
                      className="h-8 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950"
                    >
                      Review <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Queue & Automation Grid */}
      <div className="mt-7 grid gap-7 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Attention queue</p>
              <h2 className="mt-1 font-serif text-2xl text-slate-950">Items requiring review</h2>
            </div>
            <Button variant="ghost" onClick={() => setLocation("/queue")}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="mt-5 divide-y divide-slate-100">
            {awaitingReview.length ? (
              awaitingReview.slice(0, 4).map(item => (
                <button
                  key={item.id}
                  onClick={() => setLocation(`/review/${item.id}`)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{item.meetingTitle}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.statusReason || "Draft requires human review."}</p>
                  </div>
                  <StatusPill status={item.status} />
                </button>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">No live record currently requires review.</p>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-serif text-2xl text-slate-950">Automation control</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">The scheduled fallback checks only live submissions that are eligible for processing.</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <TimerReset className="h-4 w-4 text-emerald-700" />Fallback status
            </div>
            <p className="mt-2 text-sm text-slate-600">{fallback.data?.enabled ? "Configured for a 15-minute control scan." : "Prepared but not configured."}</p>
            {user?.role === "admin" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => configureFallback.mutate()}
                disabled={configureFallback.isPending || fallback.data?.enabled}
                className="mt-4"
              >
                {configureFallback.isPending ? "Configuring…" : fallback.data?.enabled ? "Fallback configured" : "Configure after deployment"}
              </Button>
            ) : null}
            {configureFallback.error ? <p className="mt-3 text-xs text-rose-700">{configureFallback.error.message}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-emerald-800/60 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[.12em] text-emerald-300/80">{label}</p>
      <p className="mt-2 font-serif text-4xl">{value}</p>
    </div>
  );
}
