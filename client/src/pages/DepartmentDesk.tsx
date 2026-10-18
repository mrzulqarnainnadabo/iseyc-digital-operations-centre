import { PageHeading } from "@/components/PageHeading";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ExternalLink, FileText, ListChecks, Sparkles } from "lucide-react";
import { useLocation, useParams } from "wouter";

const DEPT_KEYS = [
  "education_capacity_building",
  "health_wellbeing",
  "digital_systems_technology",
  "civic_affairs",
] as const;

type DeptKey = (typeof DEPT_KEYS)[number];

export default function DepartmentDesk() {
  const params = useParams<{ key: string }>();
  const [, setLocation] = useLocation();
  const key = (params.key || "") as DeptKey;
  const valid = DEPT_KEYS.includes(key);

  const desk = trpc.institutional.departmentDesk.useQuery(
    { departmentKey: key },
    { enabled: valid },
  );

  if (!valid) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeading eyebrow="Department desk" title="Unknown department" description="Use Organisation structure to open a valid desk." />
        <Button variant="outline" onClick={() => setLocation("/command-centre")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to structure
        </Button>
      </div>
    );
  }

  const data = desk.data;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Department desk"
        title={data?.department.name || "Department"}
        description={data?.department.description || "Open tasks, drafts awaiting review, and linked programmes."}
      >
        <Button variant="outline" onClick={() => setLocation("/command-centre")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Structure
        </Button>
      </PageHeading>

      {desk.isLoading ? (
        <p className="text-sm text-slate-500">Loading desk…</p>
      ) : !data ? (
        <p className="text-sm text-slate-500">Desk unavailable. Confirm migration 0002 is applied.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.civicLinks ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-800">Civic Affairs · published-only tools</p>
              <p className="mt-2 text-sm leading-6 text-emerald-950">{data.civicLinks.note}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={data.civicLinks.mandate.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                >
                  {data.civicLinks.mandate.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={data.civicLinks.brain.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                >
                  {data.civicLinks.brain.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </section>
          ) : null}

          <Panel
            icon={<ListChecks className="h-4 w-4" />}
            title="Programmes"
            empty="No active programmes."
            items={data.programmes.map(p => ({
              id: p.id,
              label: p.name,
              meta: p.isBusinessInvestmentRelated ? "Business & Investment related" : p.status,
              status: p.status,
            }))}
          />

          <Panel
            icon={<Sparkles className="h-4 w-4" />}
            title="AI desk runs awaiting human"
            empty="No open AI desk runs."
            items={data.openAiDeskRuns.map(r => ({
              id: r.id,
              label: r.promptRole,
              meta: r.inputSummary?.slice(0, 120) || "—",
              status: r.status,
            }))}
          />

          <Panel
            icon={<FileText className="h-4 w-4" />}
            title="Publications in progress"
            empty="No open publications."
            items={data.openPublications.map(p => ({
              id: p.id,
              label: p.title,
              meta: p.summary?.slice(0, 120) || p.visibility,
              status: p.status,
            }))}
          />

          <Panel
            icon={<FileText className="h-4 w-4" />}
            title="Seats in this department"
            empty="No seats linked."
            items={data.seats.map(s => ({
              id: s.id,
              label: s.title,
              meta: s.status,
              status: s.status,
              onClick: () => setLocation(`/command-centre/day1/${s.seatKey}`),
            }))}
          />
        </div>
      )}
    </div>
  );
}

function Panel({
  icon,
  title,
  empty,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  items: { id: number; label: string; meta: string; status: string; onClick?: () => void }[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_-40px_rgba(15,23,42,.35)]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700">{icon}</span>
        <h2 className="font-serif text-lg text-slate-900">{title}</h2>
      </div>
      {!items.length ? (
        <p className="px-5 py-8 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`flex w-full items-start gap-3 px-5 py-3.5 text-left ${item.onClick ? "hover:bg-slate-50" : "cursor-default"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{item.label}</span>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.meta}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
