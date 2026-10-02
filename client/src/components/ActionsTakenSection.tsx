import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  createActionTaken,
  fetchActionAssignees,
  fetchActionsTaken,
  updateActionStatus,
  updateActionTaken,
  type ActionDraftInput,
  type ActionStatus,
  type ActionTaken,
} from "../services/api";

type Draft = {
  actionAt: string;
  description: string;
  result: string;
  assigneeId: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
};
type Editor = { kind: "create"; clientRequestId: string } | { kind: "edit"; actionId: number; expectedVersion: number };
type StatusDialog = { action: ActionTaken; status: "COMPLETED" | "CANCELLED" };

function dateInput(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyDraft(): Draft {
  return { actionAt: dateInput(new Date().toISOString()), description: "", result: "", assigneeId: "", followUpRequired: false, followUpNote: "", attachmentNotes: "" };
}

function draftFrom(action: ActionTaken): Draft {
  return { actionAt: dateInput(action.actionAt), description: action.description, result: action.result ?? "", assigneeId: action.assignee ? String(action.assignee.id) : "", followUpRequired: action.followUpRequired, followUpNote: action.followUpNote ?? "", attachmentNotes: action.attachmentNotes ?? "" };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function actionLabel(status: ActionStatus) { return status.replaceAll("_", " "); }

function validateDraft(draft: Draft, requireResult: boolean) {
  const errors: Record<string, string> = {};
  const date = new Date(draft.actionAt);
  if (!draft.actionAt || Number.isNaN(date.getTime())) errors.actionAt = "Enter a valid action date and time.";
  else if (requireResult && date.getTime() > Date.now() + 5 * 60_000) errors.actionAt = "Completed work cannot be more than five minutes in the future.";
  if (!draft.description.trim() || draft.description.trim().length > 2000) errors.description = "Enter 1–2,000 characters.";
  if ((requireResult && !draft.result.trim()) || draft.result.trim().length > 2000) errors.result = "Enter 1–2,000 characters for the result.";
  if (draft.followUpRequired && !draft.followUpNote.trim()) errors.followUpNote = "A follow-up note is required.";
  if (draft.followUpNote.trim().length > 2000) errors.followUpNote = "Use at most 2,000 characters.";
  if (draft.attachmentNotes.trim().length > 1000) errors.attachmentNotes = "Use at most 1,000 characters.";
  return errors;
}

function toInput(draft: Draft): ActionDraftInput {
  return {
    actionAt: new Date(draft.actionAt).toISOString(),
    description: draft.description.trim(),
    result: draft.result.trim() || null,
    assigneeId: draft.assigneeId ? Number(draft.assigneeId) : null,
    followUpRequired: draft.followUpRequired,
    followUpNote: draft.followUpNote.trim() || null,
    attachmentNotes: draft.attachmentNotes.trim() || null,
  };
}

export default function ActionsTakenSection({ ticketNumber, canManage = false }: { ticketNumber: string; canManage?: boolean }) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [assignees, setAssignees] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [submittedCreate, setSubmittedCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [statusDialog, setStatusDialog] = useState<StatusDialog | null>(null);
  const [completionResult, setCompletionResult] = useState("");
  const [completionAt, setCompletionAt] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const saveLock = useRef(false);
  const statusLock = useRef(false);

  const reload = useCallback(async () => {
    const [items, staff] = await Promise.all([fetchActionsTaken(ticketNumber), canManage ? fetchActionAssignees() : Promise.resolve([])]);
    setActions(items);
    setAssignees(staff);
    return items;
  }, [ticketNumber, canManage]);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    Promise.all([fetchActionsTaken(ticketNumber), canManage ? fetchActionAssignees() : Promise.resolve([])])
      .then(([items, staff]) => { if (active) { setActions(items); setAssignees(staff); } })
      .catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : "Unable to load actions."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticketNumber, canManage]);

  useEffect(() => {
    if (!statusDialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])") ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !statusBusy) { event.preventDefault(); setStatusDialog(null); return; }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [statusDialog, statusBusy]);

  const changeDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setSaveError(""); setConflict(false);
    if (editor?.kind === "create" && submittedCreate) {
      setEditor({ kind: "create", clientRequestId: crypto.randomUUID() });
      setSubmittedCreate(false);
    }
  };

  const startCreate = () => {
    setEditor({ kind: "create", clientRequestId: crypto.randomUUID() });
    setDraft(emptyDraft()); setFieldErrors({}); setSaveError(""); setConflict(false); setSubmittedCreate(false); setMessage("");
  };

  const startEdit = (action: ActionTaken) => {
    setEditor({ kind: "edit", actionId: action.id, expectedVersion: action.version });
    setDraft(draftFrom(action)); setFieldErrors({}); setSaveError(""); setConflict(false); setMessage("");
  };

  const save = async () => {
    if (!editor || saveLock.current) return;
    const current = editor.kind === "edit" ? actions.find((action) => action.id === editor.actionId) : null;
    const errors = validateDraft(draft, current?.status === "COMPLETED");
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    const input = toInput(draft);
    saveLock.current = true;
    setBusy(true); setSaveError(""); setConflict(false); setMessage("");
    if (editor.kind === "create") setSubmittedCreate(true);
    try {
      if (editor.kind === "create") await createActionTaken(ticketNumber, editor.clientRequestId, input);
      else {
        const { assigneeId, ...corrections } = input;
        await updateActionTaken(editor.actionId, editor.expectedVersion, current?.status === "COMPLETED" ? corrections : { ...corrections, assigneeId });
      }
      await reload();
      setEditor(null); setMessage(editor.kind === "create" ? "Action Taken added." : "Action Taken updated.");
    } catch (error) {
      if (error instanceof ApiError && error.field) setFieldErrors((currentErrors) => ({ ...currentErrors, [error.field!]: error.message }));
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      setSaveError(error instanceof Error ? error.message : "Unable to save the action. Your draft is still here.");
    } finally { saveLock.current = false; setBusy(false); }
  };

  const startAction = async (action: ActionTaken) => {
    if (saveLock.current) return;
    saveLock.current = true;
    setBusy(true); setMessage(""); setSaveError("");
    try { await updateActionStatus(action.id, action.version, "IN_PROGRESS"); await reload(); setMessage("Action started."); }
    catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to start the action."); if (error instanceof ApiError && error.status === 409) setConflict(true); }
    finally { saveLock.current = false; setBusy(false); }
  };

  const openStatus = (action: ActionTaken, status: StatusDialog["status"]) => {
    setStatusDialog({ action, status }); setStatusError("");
    setCompletionResult(action.result ?? ""); setCompletionAt(dateInput(new Date().toISOString()));
  };

  const confirmStatus = async () => {
    if (!statusDialog || statusLock.current) return;
    if (statusDialog.status === "COMPLETED") {
      if (!completionResult.trim() || completionResult.trim().length > 2000) { setStatusError("Enter a result of 1–2,000 characters before completing."); return; }
      const time = new Date(completionAt);
      if (!completionAt || Number.isNaN(time.getTime()) || time.getTime() > Date.now() + 5 * 60_000) { setStatusError("Enter a valid work time no more than five minutes in the future."); return; }
    }
    statusLock.current = true; setStatusBusy(true); setStatusError("");
    try {
      await updateActionStatus(statusDialog.action.id, statusDialog.action.version, statusDialog.status,
        statusDialog.status === "COMPLETED" ? { result: completionResult.trim(), actionAt: new Date(completionAt).toISOString() } : {});
      await reload();
      setStatusDialog(null); setMessage(statusDialog.status === "COMPLETED" ? "Action completed." : "Action cancelled.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Unable to change action status.");
    } finally { statusLock.current = false; setStatusBusy(false); }
  };

  const reloadConflict = async () => {
    try {
      const items = await reload();
      if (statusDialog) {
        const latest = items.find((item) => item.id === statusDialog.action.id);
        if (latest) setStatusDialog({ ...statusDialog, action: latest });
        setStatusError("Current action loaded. Review it before confirming again.");
      } else {
        setMessage("Current actions loaded. Your draft is still available.");
      }
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Unable to reload actions."); }
  };

  return <section aria-labelledby="actions-taken-title" className="mt-5 rounded-xl border border-[#D1E0D8] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="actions-taken-title" className="text-lg font-bold text-[#1A2E22]">Actions Taken</h2><p className="mt-1 text-sm text-[#4A6355]">Work recorded for this ticket, separate from comments and internal notes.</p></div>
      {canManage && !editor && <button type="button" onClick={startCreate} className="min-h-11 rounded-lg bg-[#006B3C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00532E]">Add Action Taken</button>}
    </div>
    {message && <p role="status" className="mt-3 rounded-lg bg-[#ECFDF3] p-3 text-sm text-[#166534]">{message}</p>}
    {saveError && <div role="alert" className="mt-3 rounded-lg border border-[#F5B8B8] bg-[#FFF1F1] p-3 text-sm text-[#991B1B]"><p>{saveError}</p>{conflict && <button type="button" onClick={() => void reloadConflict()} className="mt-2 font-semibold underline">Reload current actions</button>}</div>}
    {loading ? <p role="status" className="mt-4 text-sm text-[#4A6355]">Loading actions…</p> : loadError ? <div role="alert" className="mt-4 rounded-lg bg-[#FFF1F1] p-3 text-sm text-[#991B1B]"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); setLoadError(""); void reload().catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load actions.")).finally(() => setLoading(false)); }} className="mt-2 font-semibold underline">Retry</button></div> : actions.length === 0 ? <p className="mt-4 rounded-lg bg-[#F0F4F1] p-4 text-sm text-[#4A6355]">No Actions Taken have been recorded for this ticket yet.</p> : <ol className="mt-4 space-y-4">{actions.map((action) => <li key={action.id} className="rounded-xl border border-[#D1E0D8] bg-[#FAFCFB] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#4A6355]">Action date and time</p><time className="font-medium text-[#1A2E22]" dateTime={action.actionAt}>{formatDate(action.actionAt)}</time></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${action.status === "COMPLETED" ? "bg-[#DCFCE7] text-[#166534]" : action.status === "CANCELLED" ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#FEF3C7] text-[#92400E]"}`}>{actionLabel(action.status)}</span></div>
      <p className="mt-3 whitespace-pre-wrap break-words font-semibold text-[#1A2E22]">{action.description}</p>
      <dl className="mt-3 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-[#4A6355]">Result</dt><dd className="whitespace-pre-wrap break-words">{action.result || "Pending"}</dd></div><div><dt className="font-semibold text-[#4A6355]">Assignee</dt><dd>{action.assignee?.name || "Unassigned"}</dd></div><div><dt className="font-semibold text-[#4A6355]">Created by</dt><dd>{action.createdBy.name}</dd></div><div><dt className="font-semibold text-[#4A6355]">Performed by</dt><dd>{action.performedBy?.name || "Not yet performed"}</dd></div><div><dt className="font-semibold text-[#4A6355]">Follow-up</dt><dd>{action.followUpRequired ? "Required" : "Not required"}{action.followUpNote ? ` — ${action.followUpNote}` : ""}</dd></div><div><dt className="font-semibold text-[#4A6355]">Attachment notes</dt><dd className="whitespace-pre-wrap break-words">{action.attachmentNotes || "None"}</dd></div><div><dt className="font-semibold text-[#4A6355]">Completed</dt><dd>{action.completedAt ? formatDate(action.completedAt) : "Pending"}</dd></div><div><dt className="font-semibold text-[#4A6355]">Last corrected</dt><dd>{formatDate(action.updatedAt)}</dd></div></dl>
      {canManage && <div className="mt-4 flex flex-wrap gap-2">{action.status !== "CANCELLED" && <button type="button" disabled={busy} onClick={() => startEdit(action)} className="min-h-11 rounded-lg border border-[#B8CEC0] px-3 py-2 text-sm font-semibold text-[#006B3C] disabled:opacity-50">Edit</button>}{action.status === "PLANNED" && <button type="button" disabled={busy} onClick={() => void startAction(action)} className="min-h-11 rounded-lg border border-[#B8CEC0] px-3 py-2 text-sm font-semibold text-[#006B3C] disabled:opacity-50">Start</button>}{(action.status === "PLANNED" || action.status === "IN_PROGRESS") && <><button type="button" disabled={busy} onClick={() => openStatus(action, "COMPLETED")} className="min-h-11 rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Complete</button><button type="button" disabled={busy} onClick={() => openStatus(action, "CANCELLED")} className="min-h-11 rounded-lg border border-[#F5B8B8] px-3 py-2 text-sm font-semibold text-[#991B1B] disabled:opacity-50">Cancel action</button></>}</div>}
    </li>)}</ol>}

    {canManage && editor && <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="mt-5 rounded-xl border border-[#A6D8B4] bg-[#F8FCF9] p-4" noValidate>
      <h3 className="text-base font-bold text-[#1A2E22]">{editor.kind === "create" ? "Add Action Taken" : "Edit Action Taken"}</h3>
      <p className="mt-1 text-xs text-[#4A6355]">Creator, performer, status and audit time are recorded by the system.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-[#294536]">Action date and time<input aria-label="Action date and time" aria-invalid={!!fieldErrors.actionAt} aria-describedby={fieldErrors.actionAt ? "action-at-error" : undefined} type="datetime-local" required value={draft.actionAt} onChange={(event) => changeDraft("actionAt", event.target.value)} className="min-h-11 rounded-lg border border-[#B8CEC0] bg-white px-3 py-2" />{fieldErrors.actionAt && <span id="action-at-error" className="text-xs text-[#991B1B]">{fieldErrors.actionAt}</span>}</label>
        <label className="grid gap-1 text-sm font-semibold text-[#294536]">Assignee<select aria-label="Action assignee" value={draft.assigneeId} disabled={editor.kind === "edit" && actions.find((action) => action.id === editor.actionId)?.status === "COMPLETED"} onChange={(event) => changeDraft("assigneeId", event.target.value)} className="min-h-11 rounded-lg border border-[#B8CEC0] bg-white px-3 py-2"><option value="">Unassigned</option>{draft.assigneeId && !assignees.some((user) => String(user.id) === draft.assigneeId) && <option value={draft.assigneeId}>Current assignee (inactive)</option>}{assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>{fieldErrors.assigneeId && <span className="text-xs text-[#991B1B]">{fieldErrors.assigneeId}</span>}</label>
        <label className="grid gap-1 text-sm font-semibold text-[#294536] sm:col-span-2">Description<textarea aria-label="Action description" aria-invalid={!!fieldErrors.description} aria-describedby={fieldErrors.description ? "action-description-error" : undefined} rows={3} maxLength={2000} value={draft.description} onChange={(event) => changeDraft("description", event.target.value)} className="rounded-lg border border-[#B8CEC0] bg-white p-3" />{fieldErrors.description && <span id="action-description-error" className="text-xs text-[#991B1B]">{fieldErrors.description}</span>}</label>
        <label className="grid gap-1 text-sm font-semibold text-[#294536] sm:col-span-2">Result<textarea aria-label="Action result" aria-invalid={!!fieldErrors.result} aria-describedby={fieldErrors.result ? "action-result-error" : undefined} rows={3} maxLength={2000} value={draft.result} onChange={(event) => changeDraft("result", event.target.value)} className="rounded-lg border border-[#B8CEC0] bg-white p-3" />{fieldErrors.result && <span id="action-result-error" className="text-xs text-[#991B1B]">{fieldErrors.result}</span>}</label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[#294536] sm:col-span-2"><input aria-label="Follow-up required" type="checkbox" checked={draft.followUpRequired} onChange={(event) => changeDraft("followUpRequired", event.target.checked)} className="h-5 w-5" />Follow-up required?</label>
        {draft.followUpRequired && <label className="grid gap-1 text-sm font-semibold text-[#294536] sm:col-span-2">Follow-up note<textarea aria-label="Follow-up note" aria-invalid={!!fieldErrors.followUpNote} aria-describedby={fieldErrors.followUpNote ? "follow-up-note-error" : undefined} rows={2} maxLength={2000} value={draft.followUpNote} onChange={(event) => changeDraft("followUpNote", event.target.value)} className="rounded-lg border border-[#B8CEC0] bg-white p-3" />{fieldErrors.followUpNote && <span id="follow-up-note-error" className="text-xs text-[#991B1B]">{fieldErrors.followUpNote}</span>}</label>}
        <label className="grid gap-1 text-sm font-semibold text-[#294536] sm:col-span-2">Attachment notes<textarea aria-label="Attachment notes" rows={2} maxLength={1000} value={draft.attachmentNotes} onChange={(event) => changeDraft("attachmentNotes", event.target.value)} className="rounded-lg border border-[#B8CEC0] bg-white p-3" />{fieldErrors.attachmentNotes && <span className="text-xs text-[#991B1B]">{fieldErrors.attachmentNotes}</span>}</label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-[#006B3C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : editor.kind === "create" ? "Save action" : "Save changes"}</button><button type="button" disabled={busy} onClick={() => { setEditor(null); setSaveError(""); setConflict(false); }} className="min-h-11 rounded-lg border border-[#B8CEC0] px-4 py-2 text-sm font-semibold">Close form</button>{conflict && editor.kind === "edit" && <button type="button" onClick={() => { const latest = actions.find((item) => item.id === editor.actionId); if (latest) startEdit(latest); }} className="min-h-11 rounded-lg border border-[#B8CEC0] px-4 py-2 text-sm font-semibold text-[#006B3C]">Discard draft and edit latest</button>}</div>
    </form>}

    {statusDialog && <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="action-status-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"><h3 id="action-status-title" className="text-lg font-bold text-[#1A2E22]">{statusDialog.status === "COMPLETED" ? "Complete Action Taken" : "Cancel Action Taken"}</h3><p className="mt-2 text-sm text-[#4A6355]">{statusDialog.action.description}</p>{statusDialog.status === "COMPLETED" && <div className="mt-4 grid gap-3"><label className="grid gap-1 text-sm font-semibold">Actual action date and time<input aria-label="Completion action date and time" type="datetime-local" value={completionAt} onChange={(event) => setCompletionAt(event.target.value)} className="min-h-11 rounded-lg border border-[#B8CEC0] px-3" /></label><label className="grid gap-1 text-sm font-semibold">Result<textarea aria-label="Completion result" value={completionResult} maxLength={2000} onChange={(event) => setCompletionResult(event.target.value)} rows={3} className="rounded-lg border border-[#B8CEC0] p-3" /></label></div>}{statusError && <div role="alert" className="mt-3 rounded-lg bg-[#FFF1F1] p-3 text-sm text-[#991B1B]"><p>{statusError}</p>{statusError.toLowerCase().includes("changed") && <button type="button" onClick={() => void reloadConflict()} className="mt-2 font-semibold underline">Reload current action</button>}</div>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={statusBusy} onClick={() => setStatusDialog(null)} className="min-h-11 rounded-lg border border-[#B8CEC0] px-4 py-2 text-sm font-semibold">Back</button><button type="button" disabled={statusBusy} onClick={() => void confirmStatus()} className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${statusDialog.status === "COMPLETED" ? "bg-[#006B3C]" : "bg-[#991B1B]"}`}>{statusBusy ? "Saving…" : statusDialog.status === "COMPLETED" ? "Confirm completion" : "Confirm cancellation"}</button></div></div></div>}
  </section>;
}
