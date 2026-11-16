import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, HeartPulse, Laptop, Landmark } from "lucide-react";
import { useLocation } from "wouter";

const departments = [
  { name: "Education & Capacity Building", description: "Education, learning, skills and institutional capacity.", icon: BookOpen },
  { name: "Health & Well-being", description: "Health awareness, well-being and community health priorities.", icon: HeartPulse },
  { name: "Software & Technology", description: "Digital systems, responsible technology and technical capability.", icon: Laptop },
  { name: "Civic Department", description: "Civic participation, public accountability and community priorities.", icon: Landmark },
];

const workspaces = [
  { name: "Meetings & decisions", description: "Review meeting records and decision workflows.", path: "/queue" },
  { name: "Action register", description: "Track actions and their recorded status.", path: "/actions" },
  { name: "Digital Chamber", description: "Access authorised institutional chamber records.", path: "/chamber" },
  { name: "Media & Content Command", description: "Prepare and review institutional communication drafts.", path: "/media" },
];

export default function Overview() {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Institutional overview"
        title="ISEYC Digital Operations Centre"
        description="The internal operating environment for ISEYC's departments, authorised workspaces and institutional records."
      />
      <section aria-labelledby="departments-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-emerald-700">Institution first</p>
            <h2 id="departments-heading" className="mt-1 font-serif text-2xl text-slate-950">Departments</h2>
          </div>
          <span className="text-xs text-slate-500">Four official departments</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {departments.map(department => {
            const Icon = department.icon;
            return (
              <article key={department.name} className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-semibold leading-6 text-slate-950">{department.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-5 text-slate-600">{department.description}</p>
                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Department workspace structure · operational records not connected here</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="mt-9" aria-labelledby="workspaces-heading">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-emerald-700">Authorised operations</p>
          <h2 id="workspaces-heading" className="mt-1 font-serif text-2xl text-slate-950">Institutional workspaces</h2>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {workspaces.map(item => (
            <button key={item.path} onClick={() => setLocation(item.path)} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-900">{item.name}</span>
                <span className="mt-1 block text-sm text-slate-500">{item.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-emerald-700" />
            </button>
          ))}
        </div>
      </section>
      <p className="mt-7 max-w-3xl text-xs leading-5 text-slate-500">This overview does not imply that a department has approved programmes, assigned officers, or verified activity. Only records available through authorised operational workflows should be treated as institutional evidence.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setLocation("/command-brief")}>Presidential Command Brief</Button>
        <Button variant="outline" onClick={() => setLocation("/development")}>My development profile</Button>
      </div>
    </div>
  );
}
