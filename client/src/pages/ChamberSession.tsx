import { PageHeading } from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileClock, Landmark, LockKeyhole, Upload, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type SessionRole = "presenter" | "participant" | "observer";

export default function ChamberSession() {
  const [, params] = useRoute("/chamber/:id");
  const [, setLocation] = useLocation();
  const sessionId = Number(params?.id);
  const utils = trpc.useUtils();
  const sessionQuery = trpc.chamber.session.useQuery({ sessionId }, { enabled: Number.isFinite(sessionId) });
  const directory = trpc.chamber.directory.useQuery();

  const [addMode, setAddMode] = useState<"internal" | "authorised_visitor">("internal");
  const [officerId, setOfficerId] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [sessionRole, setSessionRole] = useState<SessionRole>("participant");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState("");

  const refresh = () => {
    utils.chamber.session.invalidate({ sessionId });
    utils.chamber.sessions.invalidate();
  };

  const addParticipant = trpc.chamber.addParticipant.useMutation({
    onSuccess: () => { refresh(); setOfficerId(""); setVisitorName(""); setVisitorEmail(""); toast.success("Participant added to the controlled Chamber roster."); },
    onError: error => toast.error(error.message),
  });
  const admit = trpc.chamber.setAdmission.useMutation({ onSuccess: () => { refresh(); toast.success("Participant admission updated."); }, onError: error => toast.error(error.message) });
  const transition = trpc.chamber.transitionSession.useMutation({ onSuccess: () => { refresh(); toast.success("Session state updated under Chair control."); }, onError: error => toast.error(error.message) });
  const tracker = trpc.chamber.requestTrackerDraft.useMutation({ onSuccess: () => { refresh(); toast.success("Draft Meeting & Decision submission created. No record, decision, or action has been approved."); }, onError: error => toast.error(error.message) });
  const uploadDocument = trpc.chamber.uploadDocument.useMutation({
    onSuccess: () => { refresh(); setSourceFile(null); setSourceText(""); toast.success("Source document added to the protected Chair document desk."); },
    onError: error => toast.error(error.message),
  });

  if (sessionQuery.isLoading) return <div className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading controlled Chamber session…</div>;
  if (sessionQuery.error || !sessionQuery.data) return <UnavailableSession onReturn={() => setLocation("/chamber")} />;

  const { session, participants, audit, documents, canManage, documentDesk } = sessionQuery.data;
  const agenda = Array.isArray(session.agendaJson) ? session.agendaJson as string[] : [];
  const nextStatus = session.status === "draft" ? "scheduled" : session.status === "scheduled" ? "open" : session.status === "open" ? "closed" : session.status === "closed" || session.status === "cancelled" ? "archived" : undefined;

  const addToRoster = () => {
    if (addMode === "internal") addParticipant.mutate({ sessionId, participantType: "internal", sessionRole, targetUserId: Number(officerId) });
    else addParticipant.mutate({ sessionId, participantType: "authorised_visitor", sessionRole, visitorName, visitorEmail });
  };

  const uploadSource = async () => {
    if (!sourceFile) return;
    try {
      const base64 = await fileToBase64(sourceFile);
      uploadDocument.mutate({ sessionId, originalName: sourceFile.name, mimeType: sourceFile.type || "application/octet-stream", base64, sourceText: sourceText || undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to prepare the selected document.");
    }
  };

  return <div className="mx-auto max-w-6xl space-y-7">
    <PageHeading eyebrow={session.isTestMode ? "Isolated test Chamber" : "Digital Chamber session"} title={session.title} description={session.description || "A governed ISEYC assembly session."}>
      <Button variant="outline" onClick={() => setLocation("/chamber")}><ArrowLeft className="mr-2 h-4 w-4" />Session register</Button>
      {canManage && nextStatus ? <Button onClick={() => transition.mutate({ sessionId, nextStatus })} className="bg-emerald-600 text-white hover:bg-emerald-700">Mark {nextStatus}</Button> : null}
    </PageHeading>

    {session.isTestMode ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This Chamber session is isolated test material. Its roster, documents, audit history, and tracker handoff remain outside live session and records queries.</div> : null}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="space-y-6">
        <Card className="border-slate-900 bg-slate-950 text-white"><CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">Session control</p><h2 className="mt-2 font-serif text-3xl">{session.sessionType.replaceAll("_", " ")}</h2></div><Badge className="bg-emerald-300 text-slate-950 hover:bg-emerald-300">{session.status}</Badge></div>
          <dl className="mt-6 grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-2">
            <DataPair label="Convening body" value={session.conveningBody || "Not recorded"} light />
            <DataPair label="Sensitivity" value={session.sensitivity} light />
            <DataPair label="Tracker continuity" value={session.trackerLinkStatus.replaceAll("_", " ")} light />
            <DataPair label="Chair-controlled entry" value="Roster and role verification required" light />
          </dl>
        </CardContent></Card>

        <Card><CardContent className="p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">Agenda</p><h2 className="mt-2 font-serif text-2xl text-slate-950">Structured session purpose</h2><ol className="mt-5 space-y-3">{agenda.length ? agenda.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{index + 1}</span>{item}</li>) : <p className="text-sm text-slate-500">No agenda items have been recorded.</p>}</ol></CardContent></Card>

        <Card><CardContent className="p-6">
          <div className="flex items-center gap-3"><FileClock className="h-5 w-5 text-emerald-700" /><div><p className="font-medium text-slate-900">Chair document desk</p><p className="text-sm text-slate-500">Store approved source material here. The later text and audio explanation layer remains human-reviewed and is not activated by document upload.</p></div></div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{documentDesk.message}</div>
          {canManage ? <div className="mt-5 grid gap-3"><Input type="file" onChange={event => setSourceFile(event.target.files?.[0] || null)} /><Textarea value={sourceText} onChange={event => setSourceText(event.target.value)} placeholder="Optional extracted or Chair-supplied source text for the future reviewed intelligence workflow." /><Button variant="outline" disabled={!sourceFile || uploadDocument.isPending} onClick={uploadSource}><Upload className="mr-2 h-4 w-4" />Add protected source document</Button></div> : null}
          <div className="mt-5 space-y-2">{documents.length ? documents.map(document => <a key={document.id} href={document.storageUrl} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-200 p-3 text-sm text-slate-700 transition hover:border-emerald-300"><span className="font-medium">{document.originalName}</span><span className="mt-1 block text-xs text-slate-500">{document.intelligenceStatus.replaceAll("_", " ")}</span></a>) : <p className="text-sm text-slate-500">No source documents have been added.</p>}</div>
        </CardContent></Card>

        <Card><CardContent className="p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-slate-900">Meeting & Decision continuity</p><p className="mt-1 text-sm text-slate-500">A Chair can create a real draft submission from the stored sources. The existing review and action-confirmation rules remain the sole path to institutional authority.</p></div>{canManage && session.trackerLinkStatus === "not_linked" ? <Button onClick={() => tracker.mutate({ sessionId })} disabled={tracker.isPending || !documents.length}><Landmark className="mr-2 h-4 w-4" />Create draft handoff</Button> : <Badge variant="secondary">{session.trackerLinkStatus.replaceAll("_", " ")}</Badge>}</div></CardContent></Card>
      </main>

      <aside className="space-y-6">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-emerald-700" /><div><p className="font-medium text-slate-900">Session participants</p><p className="text-sm text-slate-500">Official position display is role-sourced, never AI-inferred.</p></div></div><div className="mt-5 space-y-3">{participants.map(participant => <div key={participant.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium text-slate-900">{participant.displayName}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[.1em] text-emerald-700">{participant.officialPosition}</p></div><Badge variant="secondary">{participant.admissionStatus}</Badge></div><p className="mt-2 text-xs text-slate-500">{participant.participantType === "authorised_visitor" ? "Authorised Visitor" : participant.sessionRole}</p>{canManage && participant.admissionStatus === "invited" ? <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => admit.mutate({ sessionId, participantId: participant.id, admissionStatus: "admitted" })}>Admit</Button><Button size="sm" variant="outline" onClick={() => admit.mutate({ sessionId, participantId: participant.id, admissionStatus: "declined" })}>Decline</Button></div> : null}</div>)}</div></CardContent></Card>
        {canManage ? <Card><CardContent className="p-5"><div className="flex items-center gap-3"><UserPlus className="h-5 w-5 text-emerald-700" /><p className="font-medium text-slate-900">Add controlled participant</p></div><div className="mt-4 space-y-3"><Select value={addMode} onValueChange={value => setAddMode(value as "internal" | "authorised_visitor")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal">Authorised ISEYC participant</SelectItem><SelectItem value="authorised_visitor">Authorised visitor</SelectItem></SelectContent></Select><Select value={sessionRole} onValueChange={value => setSessionRole(value as SessionRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="presenter">Presenter</SelectItem><SelectItem value="participant">Participant</SelectItem><SelectItem value="observer">Observer</SelectItem></SelectContent></Select>{addMode === "internal" ? <Select value={officerId} onValueChange={setOfficerId}><SelectTrigger><SelectValue placeholder="Select approved officer" /></SelectTrigger><SelectContent>{directory.data?.map(person => <SelectItem key={person.id} value={String(person.id)}>{person.name || person.email || `Officer #${person.id}`} — {person.officialPosition}</SelectItem>)}</SelectContent></Select> : <><Input value={visitorName} onChange={event => setVisitorName(event.target.value)} placeholder="Authorised visitor name" /><Input value={visitorEmail} onChange={event => setVisitorEmail(event.target.value)} placeholder="Authorised visitor email" /></>}<Button className="w-full" disabled={addParticipant.isPending || (addMode === "internal" ? !officerId : visitorName.trim().length < 2 || !visitorEmail.includes("@"))} onClick={addToRoster}>Add to roster</Button></div><p className="mt-3 text-xs leading-5 text-slate-500">Visitor roles never provide internal records, directory, or Presidential Command access.</p></CardContent></Card> : null}
        <Card className="border-slate-200"><CardContent className="p-5"><LockKeyhole className="h-5 w-5 text-emerald-700" /><p className="mt-3 font-medium text-slate-900">Audit and authority</p><div className="mt-3 space-y-3">{audit.slice(0, 6).map(entry => <div key={entry.id} className="border-l-2 border-slate-200 pl-3"><p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{entry.eventType.replaceAll("_", " ")}</p><p className="mt-1 text-xs leading-5 text-slate-600">{entry.detail}</p></div>)}</div></CardContent></Card>
      </aside>
    </div>
  </div>;
}

function DataPair({ label, value, light = false }: { label: string; value: string; light?: boolean }) { return <div><dt className={`text-xs uppercase tracking-[.12em] ${light ? "text-slate-400" : "text-slate-500"}`}>{label}</dt><dd className={`mt-1 text-sm capitalize ${light ? "text-white" : "text-slate-900"}`}>{value}</dd></div>; }

function UnavailableSession({ onReturn }: { onReturn: () => void }) { return <div className="mx-auto max-w-4xl p-8"><Card><CardContent className="p-8 text-center"><LockKeyhole className="mx-auto h-6 w-6 text-slate-400" /><h1 className="mt-4 font-serif text-2xl text-slate-950">Chamber session unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-600">This session does not exist, is outside the selected test boundary, or you have not been admitted to its controlled roster.</p><Button className="mt-5" variant="outline" onClick={onReturn}><ArrowLeft className="mr-2 h-4 w-4" />Return to session register</Button></CardContent></Card></div>; }

function fileToBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Unable to read the selected document.")); reader.onload = () => { const value = String(reader.result || ""); resolve(value.includes(",") ? value.split(",")[1] || "" : value); }; reader.readAsDataURL(file); }); }
