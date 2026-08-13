import { LockKeyhole } from "lucide-react";

export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
          <LockKeyhole className="h-3.5 w-3.5" /> {eyebrow}
        </div>
        <h1 className="font-serif text-3xl tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 items-center gap-3">{children}</div> : null}
    </header>
  );
}
