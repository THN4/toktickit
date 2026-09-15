import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  uploadAttachment,
  type Category,
  type RelatedSystem,
  type Ticket,
} from "../services/api";

interface SelectedAttachment {
  id: string;
  file: File;
  error?: string;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function CreateTicketPage() {
  const { user } = useAuth();

  // Reference Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefData, setLoadingRefData] = useState(true);

  // Form State
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");

  // Attachments State
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [attachmentLimitError, setAttachmentLimitError] = useState("");

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setAttachmentLimitError("");
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newItems: SelectedAttachment[] = [];
    const currentCount = attachments.length;

    for (let i = 0; i < fileList.length; i++) {
      if (currentCount + newItems.length >= 5) {
        setAttachmentLimitError("Maximum limit of 5 attachments reached.");
        break;
      }
      const file = fileList[i];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      let error: string | undefined;

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        error = "Unsupported file type (only JPG, PNG, WEBP, PDF allowed).";
      } else if (file.size > MAX_FILE_SIZE) {
        error = "File size exceeds 5 MB limit.";
      }

      newItems.push({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        error,
      });
    }

    setAttachments((prev) => [...prev, ...newItems].slice(0, 5));
    e.target.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
    setAttachmentLimitError("");
  }

  // UI / Submission State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // โหลด Categories และ Related Systems ตอนเปิดหน้า
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingRefData(true);
        const [catData, sysData] = await Promise.all([
          fetchCategories(),
          fetchRelatedSystems(),
        ]);
        setCategories(catData);
        setRelatedSystems(sysData);
      } catch {
        setServerError("Unable to load form options. Please refresh.");
      } finally {
        setLoadingRefData(false);
      }
    }
    loadData();
  }, []);

  // ฟังก์ชันตรวจสอบข้อมูลหน้าเว็บ (Frontend Validation)
  function validate(): boolean {
    const newErrors: { [key: string]: string } = {};

    if (!categoryId) newErrors.categoryId = "Category is required.";
    if (!relatedSystemId) newErrors.relatedSystemId = "Related System is required.";

    const trimmedSummary = summary.trim();
    if (trimmedSummary.length < 5 || trimmedSummary.length > 200) {
      newErrors.summary = "Summary must be between 5 and 200 characters.";
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10 || trimmedDescription.length > 3000) {
      newErrors.description = "Description must be between 10 and 3000 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ฟังก์ชันส่งฟอร์ม
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;
    try {
      setSubmitting(true);
      const ticket = await createTicket({
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requestedPriority,
        summary: summary.trim(),
        description: description.trim(),
      });

      // Upload valid attachments if any
      const validFiles = attachments.filter((a) => !a.error);
      for (const item of validFiles) {
        try {
          await uploadAttachment(ticket.ticketNumber, item.file);
        } catch {
          // preserve ticket even if upload fails
        }
      }

      // สำเร็จ: เก็บ Ticket ที่ได้ไว้แสดงผลใน Success State
      setCreatedTicket(ticket);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create ticket.";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 1. Success State Screen ──────────────────────────────────────────────
  if (createdTicket) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-8 bg-white rounded-xl shadow-sm border border-[#D1E0D8]">
        <div className="text-center py-6">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#1A2E22] mb-2">Ticket Created Successfully!</h2>
          <p className="text-sm text-[#4A6355] mb-6">
            Your ticket has been logged and assigned the following official Ticket Number:
          </p>

          <div className="inline-block bg-[#EAF6EF] border border-[#0B7A46] text-[#006B3C] text-2xl font-mono font-bold px-6 py-3 rounded-lg mb-8">
            {createdTicket.ticketNumber}
          </div>

          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                setCreatedTicket(null);
                setSummary("");
                setDescription("");
                setCategoryId("");
                setRelatedSystemId("");
                setRequestedPriority("MEDIUM");
                setErrors({});
                setAttachments([]);
                setAttachmentLimitError("");
              }}
              className="px-5 py-2.5 bg-white border border-[#D1E0D8] text-[#1A2E22] font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer"
            >
              Create Another Ticket
            </button>
            <Link
              to="/my-tickets"
              className="px-5 py-2.5 bg-[#006B3C] text-white font-medium rounded-lg hover:bg-[#0B7A46] transition-colors text-sm"
            >
              View My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── 2. Create Ticket Form ────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-6 my-8">
      <div className="bg-white rounded-xl shadow-sm border border-[#D1E0D8] p-8">
        <h1 className="text-2xl font-bold text-[#1A2E22] mb-1">Create Support Ticket</h1>
        <p className="text-sm text-[#4A6355] mb-6">
          Fill out the form below to submit a new IT support request.
        </p>

        {serverError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Read-only System Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F0F4F1] rounded-lg border border-[#D1E0D8] text-sm">
            <div>
              <span className="block text-xs font-semibold text-[#4A6355] uppercase tracking-wider">Requester</span>
              <span className="font-medium text-[#1A2E22]">{user?.name || "Unknown"}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[#4A6355] uppercase tracking-wider">Initial Status</span>
              <span className="inline-block px-2.5 py-0.5 mt-0.5 bg-[#EAF6EF] text-[#065F46] border border-[#D1E0D8] rounded-md font-semibold text-xs">NEW</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[#4A6355] uppercase tracking-wider">Ticket Number</span>
              <span className="text-[#4A6355] italic text-xs">(Auto-generated)</span>
            </div>
          </div>

          {/* Classification: Category & Related System */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A2E22] mb-1">
                Category <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value) || "")}
                disabled={loadingRefData}
                className="w-full border border-[#D1E0D8] rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3C] bg-white text-[#1A2E22]"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-[#B91C1C] text-xs mt-1">{errors.categoryId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A2E22] mb-1">
                Related System <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={relatedSystemId}
                onChange={(e) => setRelatedSystemId(Number(e.target.value) || "")}
                disabled={loadingRefData}
                className="w-full border border-[#D1E0D8] rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3C] bg-white text-[#1A2E22]"
              >
                <option value="">-- Select Related System --</option>
                {relatedSystems.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.relatedSystemId && <p className="text-[#B91C1C] text-xs mt-1">{errors.relatedSystemId}</p>}
            </div>
          </div>

          {/* Requested Priority */}
          <div>
            <label className="block text-sm font-medium text-[#1A2E22] mb-1">
              Requested Priority <span className="text-[#DC2626]">*</span>
            </label>
            <div className="flex gap-4">
              {(["LOW", "MEDIUM", "HIGH"] as const).map((priority) => (
                <label key={priority} className="flex items-center gap-2 text-sm text-[#1A2E22] cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={priority}
                    checked={requestedPriority === priority}
                    onChange={() => setRequestedPriority(priority)}
                    className="accent-[#006B3C]"
                  />
                  {priority}
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-[#1A2E22]">
                Summary <span className="text-[#DC2626]">*</span>
              </label>
              <span className="text-xs text-[#4A6355]">{summary.length}/200</span>
            </div>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of the issue (min 5 chars)"
              maxLength={200}
              className="w-full border border-[#D1E0D8] rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3C] text-[#1A2E22]"
            />
            {errors.summary && <p className="text-[#B91C1C] text-xs mt-1">{errors.summary}</p>}
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-[#1A2E22]">
                Description <span className="text-[#DC2626]">*</span>
              </label>
              <span className="text-xs text-[#4A6355]">{description.length}/3000</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what happened, steps to reproduce, etc. (min 10 chars)"
              rows={5}
              maxLength={3000}
              className="w-full border border-[#D1E0D8] rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3C] resize-y text-[#1A2E22]"
            />
            {errors.description && <p className="text-[#B91C1C] text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Attachments Section (optional - per ui-spec 4.2 & 4.4) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-sm font-medium text-[#1A2E22]">
                  Attachments <span className="text-xs text-[#4A6355] font-normal">(optional)</span>
                </label>
                <p className="text-xs text-[#4A6355]">
                  Allowed formats: JPG, PNG, WEBP, PDF (Max 5 MB per file, up to 5 files)
                </p>
              </div>

              <div>
                <label
                  htmlFor="create-attachment-input"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    attachments.length >= 5 || submitting
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-[#EAF6EF] text-[#006B3C] border-[#0B7A46] hover:bg-[#d6eedf] cursor-pointer shadow-sm"
                  }`}
                  title={attachments.length >= 5 ? "Maximum limit of 5 attachments reached" : "Add files to attach"}
                >
                  <span>📎</span> + Add Files
                </label>
                <input
                  id="create-attachment-input"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  disabled={attachments.length >= 5 || submitting}
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </div>
            </div>

            {/* Error when exceeding limit */}
            {attachmentLimitError && (
              <p className="text-[#B91C1C] text-xs font-medium">{attachmentLimitError}</p>
            )}

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="border border-[#D1E0D8] rounded-lg p-3 bg-[#F9FAF9] space-y-2">
                {attachments.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-md text-xs border ${
                      item.error
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-white border-[#D1E0D8] text-[#1A2E22]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{item.error ? "⚠️" : item.file.type.includes("pdf") ? "📄" : "🖼️"}</span>
                      <span className="font-medium truncate max-w-xs">{item.file.name}</span>
                      <span className="text-[#4A6355] shrink-0">
                        ({(item.file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                      {item.error && (
                        <span className="text-[#DC2626] font-semibold text-xs ml-2">
                          — {item.error}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(item.id)}
                      className="text-gray-400 hover:text-red-600 p-1 text-sm font-bold cursor-pointer transition-colors"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              to="/my-tickets"
              className="px-5 py-2.5 border border-[#D1E0D8] text-[#1A2E22] rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || loadingRefData}
              className="px-6 py-2.5 bg-[#006B3C] hover:bg-[#0B7A46] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

