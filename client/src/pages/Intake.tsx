import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const materialOptions = ["agenda", "minutes", "notes", "transcript", "decision_log", "action_list", "other"] as const;

function asBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function Intake() {
  const [, setLocation] = useLocation();
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [conveningBody, setConveningBody] = useState("");
  const [sensitivity, setSensitivity] = useState<"public" | "internal" | "confidential" | "restricted" | "not_recorded">("internal");
  const [sourceGroupKey, setSourceGroupKey] = useState("");
  const [documentType, setDocumentType] = useState<(typeof materialOptions)[number]>("minutes");
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const submit = trpc.meeting.submit.useMutation({
    onSuccess: () => setLocation("/queue"),
  });

  const fileSummary = useMemo(() => files.map(file => `${file.name} · ${(file.size / 1024).toFixed(0)} KB`).join("; "), [files]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!files.length) return;
    const encoded = await Promise.all(files.map(async file => ({
      originalName: file.name,
      documentType,
      mimeType: file.type || "application/octet-stream",
      base64: await asBase64(file),
      sourceText: file.type.startsWith("text/") ? await file.text() : notes || undefined,
    })));
    submit.mutate({
      meetingTitle,
      meetingDate: meetingDate || undefined,
      conveningBody: conveningBody || undefined,
      sensitivity,
      sourceGroupKey: sourceGroupKey || `manual-${Date.now()}`,
      isTestMode: false,
      files: encoded,
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading eyebrow="Controlled intake" title="Create a meeting submission" description="Upload source materials and record the minimum metadata needed for controlled processing. Every intake begins as a non-authoritative draft." />
      <form onSubmit={handleSubmit} className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,.45)]">
          <div className="mb-6 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FileText className="h-4 w-4" /></span><div><h2 className="font-serif text-xl text-slate-900">Meeting control details</h2><p className="text-sm text-slate-500">These fields remain traceable in the review record.</p></div></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label htmlFor="title">Official meeting title</Label><Input id="title" value={meetingTitle} onChange={event => setMeetingTitle(event.target.value)} placeholder="e.g. National Programmes Committee" required className="mt-2" /></div>
            <div><Label htmlFor="date">Meeting date</Label><Input id="date" type="date" value={meetingDate} onChange={event => setMeetingDate(event.target.value)} className="mt-2" /></div>
            <div><Label htmlFor="body">Convening body</Label><Input id="body" value={conveningBody} onChange={event => setConveningBody(event.target.value)} placeholder="e.g. National Secretariat" className="mt-2" /></div>
            <div><Label htmlFor="sensitivity">Sensitivity</Label><select id="sensitivity" value={sensitivity} onChange={event => setSensitivity(event.target.value as typeof sensitivity)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option><option value="not_recorded">Not recorded</option></select></div>
            <div><Label htmlFor="group">Submission group key</Label><Input id="group" value={sourceGroupKey} onChange={event => setSourceGroupKey(event.target.value)} placeholder="Same key groups related files" className="mt-2" /></div>
          </div>
        </section>
        <aside className="rounded-2xl border border-emerald-100 bg-[linear-gradient(145deg,#f0fdf4,#f8fafc)] p-6 shadow-[0_20px_60px_-45px_rgba(16,185,129,.6)]">
          <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-700" /><h2 className="font-serif text-xl text-slate-900">Control standard</h2></div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Files enter a 12-minute consolidation window. The system may produce a draft record only. No decision, record, or action becomes authoritative without explicit human approval.</p>
          <div className="mt-5 border-t border-emerald-100 pt-5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">ISEYC · Empowering Youths, Shaping Communities.</div>
        </aside>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
            <div><Label htmlFor="files">Meeting materials</Label><label htmlFor="files" className="mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"><Upload className="mb-3 h-5 w-5 text-emerald-700" /><span className="text-sm font-medium text-slate-800">Choose one or more source files</span><span className="mt-1 text-xs text-slate-500">Agendas, minutes, notes, transcripts, decision logs, or action lists</span><input id="files" className="sr-only" type="file" multiple onChange={event => setFiles(Array.from(event.target.files || []))} /></label>{files.length ? <p className="mt-3 text-xs text-slate-600">{fileSummary}</p> : null}</div>
            <div><Label htmlFor="type">Material type</Label><select id="type" value={documentType} onChange={event => setDocumentType(event.target.value as typeof documentType)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{materialOptions.map(option => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select><p className="mt-3 text-xs leading-5 text-slate-500">For non-text files, paste an authorised transcript below before processing.</p></div>
          </div>
          <div className="mt-5"><Label htmlFor="notes">Authorised transcript or intake note (optional)</Label><Textarea id="notes" value={notes} onChange={event => setNotes(event.target.value)} className="mt-2 min-h-28" placeholder="Paste authorised text for a scanned or non-text source. The original file remains stored as submitted." /></div>
          {submit.error ? <p className="mt-4 text-sm text-rose-700">{submit.error.message}</p> : null}
          <div className="mt-6 flex justify-end"><Button type="submit" disabled={submit.isPending || !files.length} className="bg-slate-950 text-white hover:bg-slate-800">{submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Submit for controlled processing</Button></div>
        </section>
      </form>
    </div>
  );
}
