import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, CircleHelp, FileSearch, Users } from "lucide-react";
import { useLocation, useParams } from "wouter";

const departments = {
  "education-capacity-building": {
    name: "Education & Capacity Building",
    summary: "A departmental workspace for education, learning, skills development and institutional capacity-building work.",
    boundary: "This description identifies the department's broad area of work. It is not a ratified departmental mandate or an approved programme plan.",
  },
  "health-well-being": {
    name: "Health & Well-being",
    summary: "A departmental workspace for health awareness, well-being and community health-related work.",
    boundary: "This description identifies the department's broad area of work. It is not a ratified departmental mandate or an approved programme plan.",
  },
  "software-technology": {
    name: "Software & Technology",
    summary: "A departmental workspace for software, digital systems and responsible technology work.",
    boundary: "This description identifies the department's broad area of work. It is not a ratified departmental mandate or an approved programme plan.",
  },
  "civic-department": {
    name: "Civic Department",
    summary: "A departmental workspace for civic participation, public accountability and community priorities.",
    boundary: "This description identifies the department's broad area of work. It is not a ratified departmental mandate or an approved programme plan.",
  },
} as const;

type DepartmentSlug = keyof typeof departments;

const sections = [
  { title: "Mandate & leadership", description: "Approved mandate, accountable leadership and delegated responsibilities.", icon: Users, state: "No ratified mandate or assigned departmental leadership record is connected to this workspace." },
  { title: "Programmes & workplans", description: "Approved programmes, delivery plans, milestones and responsible officers.", icon: BookOpen, state: "No approved programme or workplan records are connected to this workspace." },
  { title: "Evidence & outcomes", description: "Baseline evidence, delivery updates, verification and reported outcomes.", icon: FileSearch, state: "No verified department-specific evidence or outcome records are connected to this workspace." },
  { title: "Questions & decisions", description: "Open issues, decisions required and matters awaiting authorised review.", icon: CircleHelp, state: "No department-specific decision queue is connected to this workspace." },
];

export default function DepartmentWorkspace() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const department = departments[slug as DepartmentSlug];

  if (!department) {
    return <div className="mx-auto max-w-4xl"><PageHeading eyebrow="Department workspace" title="Department not found" description="The requested department does not match one of ISEYC's four official departments." /><Button variant="outline" onClick={() => setLocation("/")}><ArrowLeft className="mr-2 h-4 w-4" />Return to overview</Button></div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <button onClick={() => setLocation("/")} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-800 hover:text-emerald-950"><ArrowLeft className="h-4 w-4" />Institutional overview</button>
      <PageHeading eyebrow="Department workspace · structural view" title={department.name} description={department.summary} />
      <div className="mb-7 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-semibold text-amber-950">Structure established · operational records not connected</p>
        <p className="mt-1 text-sm leading-6 text-amber-900">{department.boundary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-950">{section.title}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{section.description}</p>
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-sm leading-6 text-slate-500">{section.state}</p>
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-7 max-w-3xl text-xs leading-5 text-slate-500">This workspace is a structural interface only. It does not create programme authority, appoint staff, verify activity or publish institutional claims. Records must be connected through approved workflows with accountable human review.</p>
    </div>
  );
}
