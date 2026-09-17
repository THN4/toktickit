import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  claimStaffTicket,
  createInternalNote,
  createPublicComment,
  fetchStaffOwners,
  fetchStaffTicketDetail,
  updateFormalStatus,
  updateItPriority,
  updateTicketOwner,
  type FormalStatus,
  type StaffOwner,
  type StaffTicketDetail,
  type TicketComment,
  type TicketPriority,
} from "../services/api";

const transitions: Record<FormalStatus, FormalStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  CANCELLED: ["REOPENED"],
};

const terminalStatuses = new Set<FormalStatus>(["RESOLVED", "CLOSED", "CANCELLED"]);
const priorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH"];

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "blue" | "neutral" }) {
  const tones = { green: "bg-[#DCFCE7] text-[#166534]", amber: "bg-[#FEF3C7] text-[#92400E]", red: "bg-[#FEE2E2] text-[#991B1B]", blue: "bg-[#DBEAFE] text-[#1D4ED8]", neutral: "bg-[#E9F0EB] text-[#355443]" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function statusTone(status: string): "green" | "amber" | "red" | "blue" | "neutral" {
  if (status === "RESOLVED" || status === "CLOSED") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "NEW" || status === "REOPENED") return "blue";
  if (status === "IN_PROGRESS" || status === "WAITING_FOR_REQUESTER") return "amber";
  return "neutral";
}

function priorityTone(priority: string): "green" | "amber" | "red" {
  return priority === "HIGH" ? "red" : priority === "MEDIUM" ? "amber" : "green";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Timeline({ entries, emptyText }: { entries: TicketComment[]; emptyText: string }) {
  if (entries.length === 0) return <p className="rounded-lg bg-[#F0F4F1] p-3 text-sm text-[#4A6355]">{emptyText}</p>;
  return <ol className="space-y-3">{entries.map((entry) => (
    <li key={entry.id} className="rounded-lg border border-[#D1E0D8] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-semibold text-[#1A2E22]">{entry.author.name} <Badge>{entry.author.role.replace("_", " ")}</Badge></span><time className="text-[#4A6355]">{formatDate(entry.createdAt)}</time></div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#294536]">{entry.content}</p>
    </li>
  ))}</ol>;
}

export default function StaffTicketDetailPage() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [ticket, setTicket] = useState<StaffTicketDetail | null>(null);
  const [owners, setOwners] = useState<StaffOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [busy, setBusy] = useState<"claim" | "owner" | "priority" | "status" | "comment" | "note" | "" >("");
  const [ownerId, setOwnerId] = useState("");
  const [itPriority, setItPriority] = useState<TicketPriority>("MEDIUM");
  const [status, setStatus] = useState<FormalStatus>("NEW");
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [confirmation, setConfirmation] = useState<"owner" | "status" | null>(null);

  const syncTicket = (updated: StaffTicketDetail) => {
    setTicket(updated);
    setOwnerId(updated.ticketOwner ? String(updated.ticketOwner.id) : "");
    setItPriority(updated.itPriority as TicketPriority);
    setStatus(updated.currentStatus as FormalStatus);
  };

  const load = useCallback(async () => {
    if (!ticketNumber) return;
    setLoading(true);
    setError("");
    try {
      const [detail, activeOwners] = await Promise.all([fetchStaffTicketDetail(ticketNumber), fetchStaffOwners()]);
      syncTicket(detail);
      setOwners(activeOwners);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load the IT Staff ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketNumber]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (kind: Exclude<typeof busy, "">, operation: () => Promise<StaffTicketDetail>, success: string) => {
    setBusy(kind); setActionError(""); setActionSuccess("");
    try { syncTicket(await operation()); setActionSuccess(success); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to save this change."); }
    finally { setBusy(""); }
  };

  const submitComment = async () => {
    if (!ticketNumber || !comment.trim()) { setActionError("A public comment cannot be empty."); return; }
    setBusy("comment"); setActionError(""); setActionSuccess("");
    try {
      const created = await createPublicComment(ticketNumber, comment);
      setTicket((current) => current ? { ...current, publicComments: [...current.publicComments, created] } : current);
      setComment(""); setActionSuccess("Public comment added.");
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to add public comment."); }
    finally { setBusy(""); }
  };

  const submitNote = async () => {
    if (!ticketNumber || !note.trim()) { setActionError("An internal note cannot be empty."); return; }
    setBusy("note"); setActionError(""); setActionSuccess("");
    try {
      const created = await createInternalNote(ticketNumber, note);
      setTicket((current) => current ? { ...current, internalNotes: [...current.internalNotes, created] } : current);
      setNote(""); setActionSuccess("Internal note added.");
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to add internal note."); }
    finally { setBusy(""); }
  };

  const requestOwnerChange = (nextOwnerId: string) => {
    if (nextOwnerId === ownerId) return;
    setOwnerId(nextOwnerId);
    setConfirmation("owner");
  };

  const cancelConfirmation = () => {
    setOwnerId(ticket?.ticketOwner ? String(ticket.ticketOwner.id) : "");
    setStatus(ticket?.currentStatus as FormalStatus ?? "NEW");
    setConfirmation(null);
  };

  if (loading) return <main className="mx-auto max-w-6xl p-4 md:p-8"><div className="grid gap-3"><p className="sr-only">Loading ticket details…</p>{[1, 2, 3].map((value) => <div key={value} className="h-28 animate-pulse rounded-xl bg-[#E9F0EB]" />)}</div></main>;
  if (error || !ticket) return <main className="mx-auto max-w-2xl p-4 md:p-8"><div role="alert" className="rounded-xl border border-[#F5B8B8] bg-[#FFF1F1] p-5 text-[#991B1B]"><p>{error || "Ticket not found."}</p><button type="button" onClick={() => void load()} className="mt-3 font-semibold underline">Retry</button></div></main>;

  const permittedStatuses = transitions[ticket.currentStatus as FormalStatus] ?? [];
  const chosenOwner = owners.find((owner) => String(owner.id) === ownerId)?.name ?? "Unassigned";

  return <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
    <Link to="/staff/tickets" className="inline-flex text-sm font-semibold text-[#006B3C] hover:underline">← Back to My Queue</Link>
    <header className="mt-5 rounded-xl border border-[#D1E0D8] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-sm text-[#4A6355]">{ticket.ticketNumber}</p><h1 className="text-2xl font-bold text-[#1A2E22]">{ticket.summary}</h1></div><Badge tone={statusTone(ticket.currentStatus)}>{statusLabel(ticket.currentStatus)}</Badge></div>
      <dl className="mt-5 grid gap-3 rounded-lg border border-[#D1E0D8] bg-[#F0F4F1] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="font-semibold text-[#4A6355]">Requester</dt><dd className="text-[#1A2E22]">{ticket.requester.name}<span className="block text-xs">{ticket.requester.email}</span></dd></div>
        <div><dt className="font-semibold text-[#4A6355]">Category</dt><dd>{ticket.category?.name ?? "—"}</dd></div>
        <div><dt className="font-semibold text-[#4A6355]">Related System</dt><dd>{ticket.relatedSystem?.name ?? "—"}</dd></div>
        <div><dt className="font-semibold text-[#4A6355]">Created</dt><dd>{formatDate(ticket.createdAt)}</dd></div>
        <div><dt className="font-semibold text-[#4A6355]">Requested Priority</dt><dd className="mt-1"><Badge tone={priorityTone(ticket.requestedPriority)}>{ticket.requestedPriority}</Badge></dd></div>
        <div><dt className="font-semibold text-[#4A6355]">Last Updated</dt><dd>{formatDate(ticket.updatedAt)}</dd></div>
        <div className="sm:col-span-2"><dt className="font-semibold text-[#4A6355]">Requester resolution</dt><dd>{ticket.requesterResolvedAt ? `Reported resolved on ${formatDate(ticket.requesterResolvedAt)}` : "Not reported"}</dd></div>
      </dl>
    </header>

    {actionError && <div role="alert" className="mt-4 rounded-xl border border-[#F5B8B8] bg-[#FFF1F1] p-4 text-sm text-[#991B1B]">{actionError}</div>}
    {actionSuccess && <div role="status" className="mt-4 rounded-xl border border-[#A6D8B4] bg-[#ECFDF3] p-4 text-sm text-[#166534]">{actionSuccess}</div>}

    <section className="mt-5 grid gap-4 lg:grid-cols-3" aria-label="Ticket workflow controls">
      <div className="rounded-xl border border-[#D1E0D8] bg-white p-4"><h2 className="font-bold text-[#1A2E22]">Ticket Owner</h2><label className="mt-3 grid gap-1 text-sm font-medium text-[#294536]">Owner<select aria-label="Ticket owner" value={ownerId} disabled={busy === "claim" || busy === "owner"} onChange={(event) => requestOwnerChange(event.target.value)} className="min-h-10 rounded-lg border border-[#B8CEC0] bg-white px-3"><option value="">Unassigned</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} — {owner.email}</option>)}</select></label>{!ticket.ticketOwner && <button type="button" disabled={busy !== ""} onClick={() => void runAction("claim", () => claimStaffTicket(ticket.ticketNumber), "Ticket claimed.")} className="mt-3 rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "claim" ? "Claiming…" : "Claim"}</button>}</div>
      <div className="rounded-xl border border-[#D1E0D8] bg-white p-4"><h2 className="font-bold text-[#1A2E22]">IT Priority</h2><label className="mt-3 grid gap-1 text-sm font-medium text-[#294536]">IT Priority<select aria-label="IT Priority" value={itPriority} onChange={(event) => setItPriority(event.target.value as TicketPriority)} disabled={busy === "priority"} className="min-h-10 rounded-lg border border-[#B8CEC0] bg-white px-3">{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label><button type="button" disabled={busy !== "" || itPriority === ticket.itPriority} onClick={() => void runAction("priority", () => updateItPriority(ticket.ticketNumber, itPriority), "IT Priority updated.")} className="mt-3 rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "priority" ? "Saving…" : "Save priority"}</button></div>
      <div className="rounded-xl border border-[#D1E0D8] bg-white p-4"><h2 className="font-bold text-[#1A2E22]">Formal Status</h2><label className="mt-3 grid gap-1 text-sm font-medium text-[#294536]">Next permitted status<select aria-label="Formal status" value={status} onChange={(event) => setStatus(event.target.value as FormalStatus)} disabled={busy === "status" || permittedStatuses.length === 0} className="min-h-10 rounded-lg border border-[#B8CEC0] bg-white px-3"><option value={ticket.currentStatus}>{statusLabel(ticket.currentStatus)} (current)</option>{permittedStatuses.map((next) => <option key={next} value={next}>{statusLabel(next)}</option>)}</select></label><button type="button" disabled={busy !== "" || status === ticket.currentStatus} onClick={() => terminalStatuses.has(status) ? setConfirmation("status") : void runAction("status", () => updateFormalStatus(ticket.ticketNumber, status), "Formal status updated.")} className="mt-3 rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "status" ? "Updating…" : "Update status"}</button></div>
    </section>

    <section className="mt-5 rounded-xl border border-[#D1E0D8] bg-white p-5"><h2 className="font-bold text-[#1A2E22]">Description</h2><p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#F0F4F1] p-4 text-sm text-[#294536]">{ticket.description}</p><h3 className="mt-5 font-bold text-[#1A2E22]">Attachments</h3>{ticket.attachments.length === 0 ? <p className="mt-2 text-sm text-[#4A6355]">No attachments.</p> : <ul className="mt-2 space-y-2">{ticket.attachments.map((attachment) => <li key={attachment.id} className="rounded-lg border border-[#D1E0D8] p-3 text-sm"><span className={attachment.removedAt ? "line-through text-[#4A6355]" : "font-medium text-[#1A2E22]"}>{attachment.originalFilename}</span>{attachment.removedAt && <Badge tone="red">Removed</Badge>}<span className="ml-2 text-xs text-[#4A6355]">Uploaded by {attachment.uploader?.name ?? "Requester"}</span></li>)}</ul>}</section>

    <section className="mt-5 grid gap-5 lg:grid-cols-2"><div className="rounded-xl border border-[#D1E0D8] bg-white p-5"><h2 className="font-bold text-[#1A2E22]">Public Comments</h2><p className="mt-1 text-sm text-[#4A6355]">Visible to the Requester, IT Staff, and Administrator.</p><textarea aria-label="Public comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} placeholder="Add a public update…" className="mt-4 w-full rounded-lg border border-[#B8CEC0] p-3 text-sm" /><div className="mt-1 flex justify-between text-xs text-[#4A6355]"><span>{comment.length}/2000</span><button type="button" disabled={busy !== "" || !comment.trim()} onClick={() => void submitComment()} className="rounded-lg bg-[#006B3C] px-3 py-2 font-semibold text-white disabled:opacity-50">{busy === "comment" ? "Posting…" : "Post comment"}</button></div><div className="mt-5"><Timeline entries={ticket.publicComments} emptyText="No public comments yet." /></div></div>
      <div className="rounded-xl border border-[#D1E0D8] bg-white p-5"><h2 className="font-bold text-[#1A2E22]">Internal Notes</h2><p className="mt-1 text-sm font-semibold text-[#7C4A03]">Internal — visible to IT Staff and Administrators only</p><textarea aria-label="Internal note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={4} placeholder="Add an internal diagnostic note…" className="mt-4 w-full rounded-lg border border-[#B8CEC0] p-3 text-sm" /><div className="mt-1 flex justify-between text-xs text-[#4A6355]"><span>{note.length}/2000</span><button type="button" disabled={busy !== "" || !note.trim()} onClick={() => void submitNote()} className="rounded-lg bg-[#6B4F00] px-3 py-2 font-semibold text-white disabled:opacity-50">{busy === "note" ? "Posting…" : "Post internal note"}</button></div><div className="mt-5"><Timeline entries={ticket.internalNotes} emptyText="No internal notes yet." /></div></div></section>

    {confirmation && <div role="dialog" aria-modal="true" aria-labelledby="confirmation-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 id="confirmation-title" className="text-lg font-bold text-[#1A2E22]">Confirm {confirmation === "owner" ? "owner change" : "status change"}</h2><p className="mt-2 text-sm text-[#4A6355]">{confirmation === "owner" ? `Set ${ticket.ticketNumber} owner to ${chosenOwner}?` : `Change ${ticket.ticketNumber} to ${statusLabel(status)}?`}</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={cancelConfirmation} disabled={busy !== ""} className="rounded-lg border border-[#B8CEC0] px-3 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={() => { setConfirmation(null); if (confirmation === "owner") void runAction("owner", () => updateTicketOwner(ticket.ticketNumber, ownerId ? Number(ownerId) : null), "Ticket owner updated."); else void runAction("status", () => updateFormalStatus(ticket.ticketNumber, status, true), "Formal status updated."); }} disabled={busy !== ""} className="rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white">Confirm</button></div></div></div>}
  </main>;
}
