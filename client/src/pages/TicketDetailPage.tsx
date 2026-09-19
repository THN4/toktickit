import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchTicketDetail,
  uploadAttachment,
  deleteAttachment,
  createPublicComment,
  fetchPublicComments,
  getAttachmentDownloadUrl,
  recordRequesterResolution,
  type TicketDetail,
  type Attachment,
  type TicketComment,
} from "../services/api";

type LoadState = "loading" | "success" | "error";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function TicketDetailPage() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Upload State
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Soft-Remove Modal State
  const [removingAttachment, setRemovingAttachment] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [resolutionConfirmationOpen, setResolutionConfirmationOpen] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [isRecordingResolution, setIsRecordingResolution] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!ticketNumber) return;
    setLoadState("loading");
    setErrorMessage("");

    try {
      const [data, publicComments] = await Promise.all([
        fetchTicketDetail(ticketNumber),
        fetchPublicComments(ticketNumber),
      ]);
      setTicket(data);
      setComments(publicComments);
      setLoadState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load ticket.";
      setErrorMessage(msg);
      setLoadState("error");
    }
  }, [ticketNumber]);

  async function handlePostComment() {
    if (!ticketNumber || !comment.trim()) {
      setCommentError("A public comment cannot be empty.");
      return;
    }
    setIsPostingComment(true);
    setCommentError("");
    try {
      const created = await createPublicComment(ticketNumber, comment);
      setComments((current) => [...current, created]);
      setComment("");
    } catch (err: unknown) {
      setCommentError(err instanceof Error ? err.message : "Unable to post comment.");
    } finally {
      setIsPostingComment(false);
    }
  }

  async function handleRecordResolution() {
    if (!ticketNumber || !ticket) return;
    setIsRecordingResolution(true);
    setResolutionError("");
    try {
      const updated = await recordRequesterResolution(ticketNumber);
      setTicket({ ...ticket, requesterResolvedAt: updated.requesterResolvedAt });
      setResolutionConfirmationOpen(false);
    } catch (err: unknown) {
      setResolutionError(err instanceof Error ? err.message : "Unable to record the resolution indication.");
    } finally {
      setIsRecordingResolution(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Format file size
  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Active attachments count
  const activeAttachments = ticket?.attachments.filter((a) => !a.removedAt) || [];
  const isAtLimit = activeAttachments.length >= 5;

  // Handle file select & validation
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file || !ticketNumber) return;

    // Check type (UI-03, AC-07)
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError("Unsupported file type. Only JPG, PNG, WEBP, and PDF files are allowed.");
      e.target.value = "";
      return;
    }

    // Check size (UI-02, AC-06)
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File size exceeds 5 MB limit.");
      e.target.value = "";
      return;
    }

    // Check limit
    if (isAtLimit) {
      setUploadError("Maximum limit of 5 active attachments reached.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      await uploadAttachment(ticketNumber, file);
      e.target.value = "";
      await loadDetail(); // Refresh list
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload file.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  }

  // Handle Soft-Removal confirmation
  async function handleConfirmRemoval() {
    if (!removingAttachment) return;
    if (!removalReason.trim()) {
      setRemovalError("Reason for removal is required.");
      return;
    }

    setIsRemoving(true);
    setRemovalError("");

    try {
      await deleteAttachment(removingAttachment.id, removalReason.trim());
      setRemovingAttachment(null);
      setRemovalReason("");
      await loadDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove attachment.";
      setRemovalError(msg);
    } finally {
      setIsRemoving(false);
    }
  }

  // Status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case "NEW":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#EAF6EF] text-[#065F46] border border-[#D1E0D8]">NEW</span>;
      case "OPEN":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">OPEN</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">IN PROGRESS</span>;
      case "RESOLVED":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700 border border-green-200">RESOLVED</span>;
      case "CLOSED":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">CLOSED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-700">{status}</span>;
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Back button */}
      <Link
        to="/my-tickets"
        className="inline-flex items-center text-sm font-semibold text-[#006B3C] hover:text-[#0B7A46] mb-6 transition-colors"
      >
        ← Back to My Tickets
      </Link>

      {/* Loading state */}
      {loadState === "loading" && (
        <div className="bg-white rounded-xl border border-[#D1E0D8] p-12 text-center shadow-sm">
          <div className="inline-block animate-spin text-3xl mb-3">⏳</div>
          <p className="text-sm font-medium text-[#4A6355]">Loading ticket details…</p>
        </div>
      )}

      {/* Error state */}
      {loadState === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700 shadow-sm">
          <p className="font-semibold mb-2">{errorMessage}</p>
          <button
            onClick={loadDetail}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Ticket Details View */}
      {loadState === "success" && ticket && (
        <div className="space-y-6">
          {/* Header Card (UI-11, AC-16: Read-only metadata) */}
          <div className="bg-white rounded-xl border border-[#D1E0D8] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#4A6355] uppercase tracking-wider">Ticket Number</span>
                <h1 className="text-2xl font-mono font-bold text-[#006B3C]">{ticket.ticketNumber}</h1>
              </div>
              <div className="self-start sm:self-auto">
                {getStatusBadge(ticket.currentStatus)}
              </div>
            </div>

            {/* Read-only metadata grid (#F0F4F1 background per UI spec) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#F0F4F1] p-4 rounded-lg text-xs border border-[#D1E0D8]">
              <div>
                <span className="block text-[#4A6355] font-semibold">Requester</span>
                <span className="text-[#1A2E22] font-medium">{ticket.requester?.name || "-"}</span>
              </div>
              <div>
                <span className="block text-[#4A6355] font-semibold">IT Owner</span>
                <span className="text-[#1A2E22] font-medium">{ticket.ticketOwner?.name || "Unassigned"}</span>
              </div>
              <div>
                <span className="block text-[#4A6355] font-semibold">Category</span>
                <span className="text-[#1A2E22] font-medium">{ticket.category?.name || "-"}</span>
              </div>
              <div>
                <span className="block text-[#4A6355] font-semibold">Related System</span>
                <span className="text-[#1A2E22] font-medium">{ticket.relatedSystem?.name || "-"}</span>
              </div>
              <div>
                <span className="block text-[#4A6355] font-semibold">Requested Priority</span>
                <span className="text-[#1A2E22] font-medium">{ticket.requestedPriority}</span>
              </div>
              <div>
                <span className="block text-[#4A6355] font-semibold">IT Priority</span>
                <span className="text-[#1A2E22] font-medium">{ticket.itPriority}</span>
              </div>
              <div>
                <span className="block text-[#4A6355] font-semibold">Created Date</span>
                <span className="text-[#1A2E22] font-medium">{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[#4A6355] font-semibold">Last Updated</span>
                <span className="text-[#1A2E22] font-medium">{new Date(ticket.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Requester resolution is an indication only; it never changes formal status. */}
          <div className={`rounded-xl border p-4 ${ticket.requesterResolvedAt ? "border-[#A6D8B4] bg-[#ECFDF3]" : "border-[#D1E0D8] bg-white"}`}>
            {ticket.requesterResolvedAt ? (
              <p className="text-sm font-medium text-[#166534]">✓ You reported that the problem appears resolved on {new Date(ticket.requesterResolvedAt).toLocaleString()}. The formal ticket status remains {ticket.currentStatus.replaceAll("_", " ")}.</p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#294536]">If the issue appears fixed, let IT Staff know. This does not resolve or close the ticket.</p>
                <button type="button" onClick={() => { setResolutionError(""); setResolutionConfirmationOpen(true); }} className="rounded-lg border border-[#006B3C] px-3 py-2 text-sm font-semibold text-[#006B3C] hover:bg-[#EAF6EF]">Problem appears resolved</button>
              </div>
            )}
          </div>

          {/* Ticket Content Card */}
          <div className="bg-white rounded-xl border border-[#D1E0D8] p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-[#4A6355] uppercase tracking-wider mb-1">Summary</h2>
              <p className="text-lg font-bold text-[#1A2E22]">{ticket.summary}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#4A6355] uppercase tracking-wider mb-1">Description</h2>
              <div className="text-sm text-[#1A2E22] whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100 leading-relaxed">
                {ticket.description}
              </div>
            </div>
          </div>

          {/* ─── Public Comments ──────────────────────────────────────────── */}
          <section className="bg-white rounded-xl border border-[#D1E0D8] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1A2E22]">Public Comments</h2>
            <p className="mt-1 text-xs text-[#4A6355]">Visible to you, IT Staff, and Administrators.</p>
            <textarea
              aria-label="Public comment"
              value={comment}
              onChange={(event) => { setComment(event.target.value); if (commentError) setCommentError(""); }}
              maxLength={2000}
              rows={4}
              placeholder="Add a message for IT Staff…"
              className="mt-4 w-full rounded-lg border border-[#D1E0D8] p-3 text-sm text-[#1A2E22] focus:outline-none focus:ring-2 focus:ring-[#006B3C]"
            />
            <div className="mt-1 flex items-start justify-between gap-3 text-xs text-[#4A6355]">
              <span>{commentError && <strong className="text-red-600">{commentError}</strong>}</span>
              <span>{comment.length}/2000</span>
            </div>
            <button type="button" onClick={() => void handlePostComment()} disabled={isPostingComment || !comment.trim()} className="mt-3 rounded-lg bg-[#006B3C] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isPostingComment ? "Posting…" : "Post comment"}
            </button>
            <div className="mt-5 space-y-3">
              {comments.length === 0 ? <p className="rounded-lg bg-[#F0F4F1] p-3 text-sm text-[#4A6355]">No public comments yet.</p> : comments.map((entry) => (
                <article key={entry.id} className="rounded-lg border border-[#D1E0D8] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-semibold text-[#1A2E22]">{entry.author.name} · {entry.author.role.replace("_", " ")}</span><time className="text-[#4A6355]">{new Date(entry.createdAt).toLocaleString()}</time></div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#294536]">{entry.content}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ─── Attachment Section ─────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#D1E0D8] p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1A2E22]">
                  Attachments ({activeAttachments.length}/5)
                </h3>
                <p className="text-xs text-[#4A6355]">
                  Allowed formats: JPG, PNG, WEBP, PDF (Max 5 MB per file, max 5 active attachments)
                </p>
              </div>

              {/* Add Attachment Button / Input (UI-13, BR-18: Disabled at limit) */}
              <div className="relative">
                <label
                  htmlFor="attachment-input"
                  className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isAtLimit || isUploading
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#006B3C] hover:bg-[#0B7A46] text-white cursor-pointer shadow-sm"
                  }`}
                  title={isAtLimit ? "Maximum limit of 5 active attachments reached" : "Upload an attachment"}
                >
                  {isUploading ? "Uploading…" : "+ Add Attachment"}
                </label>
                <input
                  id="attachment-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  disabled={isAtLimit || isUploading}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Error Message for Upload (UI-02, UI-03) */}
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
                ⚠️ {uploadError}
              </div>
            )}

            {/* Attachment List */}
            {ticket.attachments.length === 0 ? (
              <div className="text-center py-8 text-[#4A6355] text-sm">
                No attachments uploaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {ticket.attachments.map((a) => {
                  const isRemoved = Boolean(a.removedAt);

                  return (
                    <div
                      key={a.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isRemoved
                          ? "bg-gray-50 border-gray-200 opacity-80"
                          : "bg-white border-[#D1E0D8] shadow-sm hover:border-[#006B3C]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-2xl">{a.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm truncate ${isRemoved ? "line-through text-gray-500" : "text-[#1A2E22]"}`}>
                                {a.originalFilename}
                              </span>
                              {isRemoved && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                                  Removed
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#4A6355]">
                              {formatBytes(a.sizeBytes)} • Uploaded {new Date(a.createdAt).toLocaleDateString()} by {a.uploader?.name || "Requester"}
                            </p>
                          </div>
                        </div>

                        {/* Actions: Download and Remove (UI-12, BR-20: Download absent for removed files) */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {!isRemoved ? (
                            <>
                              <a
                                href={getAttachmentDownloadUrl(a.id)}
                                download
                                className="px-3 py-1.5 border border-[#D1E0D8] hover:bg-[#EAF6EF] text-[#006B3C] font-semibold text-xs rounded-lg transition-colors"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => {
                                  setRemovingAttachment(a);
                                  setRemovalReason("");
                                  setRemovalError("");
                                }}
                                className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Download Unavailable</span>
                          )}
                        </div>
                      </div>

                      {/* Removed metadata: Reason and timestamp (AC-20) */}
                      {isRemoved && (
                        <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-600 bg-white/60 p-2.5 rounded-lg">
                          <span className="font-semibold text-red-700">Reason for removal: </span>
                          <span>{a.removalReason || "No reason provided."}</span>
                          <span className="block text-gray-400 mt-1">
                            Removed on {new Date(a.removedAt!).toLocaleString()} by {a.removedBy?.name || "Requester"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {resolutionConfirmationOpen && ticket && (
        <div role="dialog" aria-modal="true" aria-labelledby="resolution-confirmation-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="resolution-confirmation-title" className="text-lg font-bold text-[#1A2E22]">Confirm resolution indication</h2>
            <p className="mt-2 text-sm text-[#4A6355]">Record that {ticket.ticketNumber} appears resolved? This will notify IT Staff but will not change the formal status or close the ticket.</p>
            {resolutionError && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{resolutionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={isRecordingResolution} onClick={() => setResolutionConfirmationOpen(false)} className="rounded-lg border border-[#D1E0D8] px-3 py-2 text-sm font-semibold">Cancel</button>
              <button type="button" disabled={isRecordingResolution} onClick={() => void handleRecordResolution()} className="rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isRecordingResolution ? "Saving…" : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Soft-Removal Modal (FR-09, BR-19, BR-21) ────────────────────────── */}
      {removingAttachment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#1A2E22]">Remove Attachment</h3>
            <p className="text-xs text-[#4A6355]">
              Are you sure you want to remove{" "}
              <strong className="text-[#1A2E22]">{removingAttachment.originalFilename}</strong>?
              This action will soft-delete the file and disable future downloads.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#1A2E22] mb-1">
                Reason for removal <span className="text-red-600">*</span>
              </label>
              <textarea
                value={removalReason}
                onChange={(e) => {
                  setRemovalReason(e.target.value);
                  if (removalError) setRemovalError("");
                }}
                maxLength={500}
                placeholder="e.g. Uploaded confidential document by mistake..."
                rows={3}
                className="w-full border border-[#D1E0D8] rounded-lg p-2.5 text-xs text-[#1A2E22] focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{removalError && <strong className="text-red-600">{removalError}</strong>}</span>
                <span>{removalReason.length}/500</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemovingAttachment(null)}
                disabled={isRemoving}
                className="px-4 py-2 border border-[#D1E0D8] text-[#1A2E22] hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoval}
                disabled={isRemoving || !removalReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRemoving ? "Removing…" : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

