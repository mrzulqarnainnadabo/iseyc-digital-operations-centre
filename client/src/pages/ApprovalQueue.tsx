import { PageHeading } from "@/components/PageHeading";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Inbox, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

const MODULE_LABEL: Record<string, string> = {
  ai_desk: "AI desk",
  publication: "Publication",
  resolution: "Resolution",
  meeting: "Meeting record",
  content: "Media content",
};

export default function ApprovalQueue() {
  const [, setLocation] = useLocation();
  const queue = trpc.institutional.approvalQueue.useQuery({ isTestMode: false });
  const items = queue.data?.items || [];
  const counts = queue.data?.counts || { total: 0 };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Command Centre"
        title="Global approval queue"
        description="Human accepts, edits, or returns. AI output and drafts never publish without this gate. Live items only."
      >
        <Button variant="outline" onClick={() => queue.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeading>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Total" value={counts.total ?? 0} />
        <Metric label="AI desk" value={(counts as any).ai_desk ?? 0} />
        <Metric label="Meetings" value={(counts as any).meeting ?? 0} />
        <Metric label="Content" value={(counts as any).content ?? 0} />
        <Metric label="Publications" value={(counts as any).publication ?? 0} />
        <Metric label="Resolutions" value={(counts as any).resolution ?? 0} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-45px_rgba(15,23,42,.4)]">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700">
            <Inbox className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-serif text-xl text-slate-900">Items awaiting human review</h2>
            <p className="text-xs text-slate-500">Cross-module. Existing module review screens remain authoritative for approve/return.</p>
          </div>
        </div>

        {queue.isLoading ? (
          <div className="p-10 text-sm text-slate-500">Loading approval queue…</div>
        ) : !items.length ? (
          <div className="p-12 text-center">
            <p className="font-medium text-slate-700">No items currently awaiting review.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              When AI desk runs, meeting drafts, or content drafts need human decision, they appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(item => (
              <button
                key={`${item.module}-${item.id}`}
                onClick={() => setLocation(item.reviewPath)}
                className="group flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.1em] text-slate-600">
                      {MODULE_LABEL[item.module] || item.module}
                    </span>
                    <span className="font-medium text-slate-900">{item.title}</span>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">{item.detail || "No detail"}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-emerald-700" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</p>
      <p className="mt-1 font-serif text-2xl text-slate-900">{value}</p>
    </div>
  );
}
