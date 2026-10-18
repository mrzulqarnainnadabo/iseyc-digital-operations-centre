import { PageHeading } from "@/components/PageHeading";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ClipboardList, ShieldCheck, UserRound } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function Day1Packet() {
  const params = useParams<{ seatKey: string }>();
  const [, setLocation] = useLocation();
  const seatKey = params.seatKey || "";

  const packet = trpc.institutional.day1Packet.useQuery(
    { seatKey },
    { enabled: seatKey.length >= 2 },
  );

  const data = packet.data;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        eyebrow="Appointment Day-1 packet"
        title={data?.seat.title || "Seat packet"}
        description="What a new appointee inherits: seat, open queues, programmes, and SOPs. AI does not transfer authority."
      >
        <Button variant="outline" onClick={() => setLocation("/command-centre")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Structure
        </Button>
      </PageHeading>

      {packet.isLoading ? (
        <p className="text-sm text-slate-500">Loading packet…</p>
      ) : !data ? (
        <p className="text-sm text-slate-500">Seat not found or tables not migrated.</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-40px_rgba(15,23,42,.35)]">
            <div className="flex flex-wrap items-start gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-950 text-emerald-300">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-2xl text-slate-950">{data.seat.title}</h2>
                  <StatusPill status={data.seat.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{data.seat.description}</p>
                {data.department ? (
                  <p className="mt-2 text-xs font-bold uppercase tracking-[.12em] text-emerald-700">
                    Department · {data.department.name}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-slate-500">
                  {data.activeHolder
                    ? `Current holder: ${data.activeHolder.userName || "Officer"} (since ${new Date(data.activeHolder.appointedAt).toLocaleDateString()})`
                    : "Currently vacant — ready for human appointment."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
            <div className="flex items-center gap-2 text-emerald-900">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-[.14em]">Inheritance rule</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-950">{data.inheritanceNote}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-slate-600" />
              <h3 className="font-serif text-lg text-slate-900">Day-1 SOPs</h3>
            </div>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              {data.sops.map((sop, i) => (
                <li key={i}>{sop}</li>
              ))}
            </ol>
          </section>

          {data.programmes.length ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-serif text-lg text-slate-900">Linked programmes</h3>
              <ul className="mt-3 space-y-2">
                {data.programmes.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-800">{p.name}</span>
                    <StatusPill status={p.status} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.openAiDeskRuns.length ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-serif text-lg text-slate-900">Open AI desk runs (require human)</h3>
              <ul className="mt-3 space-y-3">
                {data.openAiDeskRuns.map(r => (
                  <li key={r.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{r.promptRole}</span>
                      <StatusPill status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{r.inputSummary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.civicNote ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{data.civicNote}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
