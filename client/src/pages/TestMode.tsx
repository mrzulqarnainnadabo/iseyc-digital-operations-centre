import { PageHeading } from "@/components/PageHeading";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Beaker, Loader2, PlayCircle, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

export default function TestMode() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const queue = trpc.meeting.queue.useQuery({ isTestMode: true });
  const loadSample = trpc.meeting.loadSample.useMutation({ onSuccess: () => utils.meeting.queue.invalidate({ isTestMode: true }) });
  const process = trpc.meeting.processSample.useMutation({ onSuccess: () => utils.meeting.queue.invalidate({ isTestMode: true }) });
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Isolated environment" title="Controlled test mode" description="Sample materials use separate storage prefixes, separate queue filters, and cannot process or alter live meeting records."><Button onClick={() => loadSample.mutate()} disabled={loadSample.isPending} className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">{loadSample.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Beaker className="mr-2 h-4 w-4" />}Load sample material</Button></PageHeading>
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />Isolation control</div><p className="mt-2">Records in this environment remain test records. They do not appear in the live queue or live action register, and the sample processing control refuses access to live submissions.</p></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{!queue.data?.length ? <div className="p-12 text-center text-sm text-slate-500">Load the pre-defined sample meeting material to begin a controlled test.</div> : queue.data.map(item => <div key={item.id} className="flex items-center gap-5 px-6 py-5"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-medium text-slate-900">{item.meetingTitle}</p><StatusPill status={item.status} /></div><p className="mt-1 text-xs text-slate-500">{item.statusReason || "Test material is ready for controlled processing."}</p></div>{item.status === "pending_consolidation" ? <Button size="sm" onClick={() => process.mutate({ submissionId: item.id })} disabled={process.isPending}><PlayCircle className="mr-1.5 h-4 w-4" />Process sample</Button> : <Button size="sm" variant="outline" onClick={() => setLocation(`/review/${item.id}`)}>View draft</Button>}</div>)}</div></section>
  </div>;
}
