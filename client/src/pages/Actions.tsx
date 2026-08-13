import { PageHeading } from "@/components/PageHeading";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ListChecks } from "lucide-react";

export default function Actions() {
  const { user } = useAuth();
  const actions = trpc.meeting.actions.useQuery();
  const utils = trpc.useUtils();
  const confirm = trpc.meeting.confirmAction.useMutation({ onSuccess: () => utils.meeting.actions.invalidate() });
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Approved records only" title="Action register" description="Actions stay read-only after record approval. An administrator must explicitly confirm each individual action before it is considered an operational action item." />
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-45px_rgba(15,23,42,.45)]"><div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ListChecks className="h-4 w-4" /></span><div><h2 className="font-serif text-xl text-slate-900">Confirmed meeting records</h2><p className="text-xs text-slate-500">No automated assignment or closure is permitted.</p></div></div>{actions.isLoading ? <div className="p-10 text-sm text-slate-500">Loading action register…</div> : !actions.data?.length ? <div className="p-12 text-center text-sm text-slate-500">No action items are available from approved live records.</div> : <div className="divide-y divide-slate-100">{actions.data.map(action => <div key={action.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1.5fr)_200px_130px_180px]"><div><p className="font-medium text-slate-900">{action.actionDescription}</p><p className="mt-1 text-xs text-slate-500">{action.meetingTitle} · Evidence: {action.evidenceLocation || "Not recorded"}</p>{action.dependency ? <p className="mt-2 text-xs text-amber-800">Dependency: {action.dependency}</p> : null}</div><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Owner</p><p className="mt-1 text-sm text-slate-700">{action.accountableOwner}</p></div><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Due</p><p className="mt-1 text-sm text-slate-700">{action.dueDate || "Not recorded"}</p></div><div className="flex items-center justify-between gap-3"><StatusPill status={action.confirmationStatus} />{user?.role === "admin" && action.confirmationStatus === "draft" ? <Button size="sm" variant="outline" disabled={confirm.isPending} onClick={() => confirm.mutate({ actionId: action.id })}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Confirm</Button> : null}</div></div>)}</div>}</section>
  </div>;
}
