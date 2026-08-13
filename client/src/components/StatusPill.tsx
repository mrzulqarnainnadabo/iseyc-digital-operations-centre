import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  pending_consolidation: "Pending consolidation",
  processing: "Processing draft",
  draft_ready: "Draft ready",
  under_review: "Under review",
  approved: "Approved",
  needs_human_review: "Needs human review",
  blocked: "Blocked",
  draft: "Draft action",
  confirmed: "Confirmed action",
};

const tones: Record<string, string> = {
  pending_consolidation: "border-amber-200 bg-amber-50 text-amber-800",
  processing: "border-sky-200 bg-sky-50 text-sky-800",
  draft_ready: "border-violet-200 bg-violet-50 text-violet-800",
  under_review: "border-indigo-200 bg-indigo-50 text-indigo-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  needs_human_review: "border-rose-200 bg-rose-50 text-rose-800",
  blocked: "border-slate-300 bg-slate-100 text-slate-700",
  draft: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide", tones[status] || "border-slate-200 bg-slate-50 text-slate-600")}>
      {labels[status] || status.replaceAll("_", " ")}
    </span>
  );
}
