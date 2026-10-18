import { PageHeading } from "@/components/PageHeading";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Building2, ChevronRight, Network, RefreshCw, UserRound } from "lucide-react";
import { useLocation } from "wouter";

export default function OrgStructure() {
  const [, setLocation] = useLocation();
  const org = trpc.institutional.orgStructure.useQuery();
  const data = org.data;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Institutional Command Centre"
        title="Organisation structure"
        description="Seats are human roles. AI is staff to the seat — never the seat-holder. A new appointee inherits the seat, open queues, and published archive."
      >
        <Button variant="outline" onClick={() => org.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeading>

      {org.isLoading ? (
        <p className="text-sm text-slate-500">Loading institutional structure…</p>
      ) : !data ? (
        <p className="text-sm text-slate-500">Structure unavailable. Apply migration 0002 if tables are missing.</p>
      ) : (
        <div className="space-y-8">
          {data.layers.map(layer => {
            const layerSeats = data.seats.filter(s => s.layer === layer.key);
            if (!layerSeats.length && layer.key !== "department") return null;

            return (
              <section
                key={layer.key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-45px_rgba(15,23,42,.4)]"
              >
                <div className="border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700">
                      <Network className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-serif text-xl text-slate-900">{layer.label}</h2>
                      <p className="text-xs text-slate-500">{layer.description}</p>
                    </div>
                  </div>
                </div>

                {layer.key === "department" ? (
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    {data.departments.map(dept => (
                      <button
                        key={dept.id}
                        onClick={() => setLocation(`/command-centre/desk/${dept.departmentKey}`)}
                        className="flex items-start gap-3 rounded-xl border border-slate-100 p-4 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{dept.name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">{dept.description}</p>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-700">
                            Open desk
                          </p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 text-slate-300" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {layerSeats.map(seat => {
                      const holder = data.holders.find(h => h.seatId === seat.id);
                      return (
                        <button
                          key={seat.id}
                          onClick={() => setLocation(`/command-centre/day1/${seat.seatKey}`)}
                          className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-900">{seat.title}</span>
                              <StatusPill status={seat.status} />
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {holder
                                ? `Held by ${holder.userName || "Officer"} · appointed ${new Date(holder.appointedAt).toLocaleDateString()}`
                                : "Vacant — Day-1 packet ready for appointment"}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </button>
                      );
                    })}
                    {!layerSeats.length ? (
                      <p className="px-6 py-6 text-sm text-slate-500">No seats defined in this layer yet.</p>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}

          <p className="text-center text-xs leading-5 text-slate-400">
            Human authority remains final. AI desk output enters the approval queue and never publishes or acts as a seat-holder.
          </p>
        </div>
      )}
    </div>
  );
}
