import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActionsTakenSection from "../../src/components/ActionsTakenSection";
import * as api from "../../src/services/api";

vi.mock("../../src/services/api", async () => ({
  ...(await vi.importActual<typeof api>("../../src/services/api")),
  fetchActionsTaken: vi.fn(),
  fetchActionAssignees: vi.fn(),
  createActionTaken: vi.fn(),
  updateActionTaken: vi.fn(),
  updateActionStatus: vi.fn(),
}));

const action: api.ActionTaken = {
  id: 10,
  ticketNumber: "TKT-L4-10",
  actionAt: "2026-10-01T03:00:00.000Z",
  description: "Inspect application logs",
  result: null,
  status: "PLANNED",
  assignee: { id: 3, name: "Nina Patel" },
  createdBy: { id: 3, name: "Nina Patel" },
  performedBy: null,
  completedAt: null,
  followUpRequired: true,
  followUpNote: "Review after restart",
  attachmentNotes: "See service log",
  version: 1,
  createdAt: "2026-10-01T03:01:00.000Z",
  updatedAt: "2026-10-01T03:01:00.000Z",
};

beforeEach(() => {
  vi.mocked(api.fetchActionsTaken).mockReset().mockResolvedValue([action]);
  vi.mocked(api.fetchActionAssignees).mockReset().mockResolvedValue([{ id: 3, name: "Nina Patel" }]);
  vi.mocked(api.createActionTaken).mockReset();
  vi.mocked(api.updateActionTaken).mockReset();
  vi.mocked(api.updateActionStatus).mockReset();
});

describe("Lab 4 Actions Taken UI", () => {
  it("shows all records to a Requester without staff controls or assignee lookup", async () => {
    vi.mocked(api.fetchActionsTaken).mockResolvedValue([action, { ...action, id: 11, status: "CANCELLED", description: "Superseded check" }]);
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" />);
    expect(await screen.findByText("Inspect application logs")).toBeInTheDocument();
    expect(screen.getByText("Superseded check")).toBeInTheDocument();
    expect(screen.getAllByText("Review after restart", { exact: false })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Add Action Taken" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(api.fetchActionAssignees).not.toHaveBeenCalled();
  });

  it("keeps the same retry ID and draft after a recoverable create failure", async () => {
    vi.mocked(api.createActionTaken).mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce(action);
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Inspect application logs");
    fireEvent.click(screen.getByRole("button", { name: "Add Action Taken" }));
    fireEvent.click(screen.getByRole("button", { name: "Save action" }));
    expect(screen.getByText("Enter 1–2,000 characters.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Repair connection" } });
    fireEvent.change(screen.getByLabelText("Action date and time"), { target: { value: "2026-10-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save action" }));
    await screen.findByText("Connection lost");
    expect(screen.getByLabelText("Action description")).toHaveValue("Repair connection");
    fireEvent.click(screen.getByRole("button", { name: "Save action" }));
    await waitFor(() => expect(api.createActionTaken).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.createActionTaken).mock.calls[0]![1]).toBe(vi.mocked(api.createActionTaken).mock.calls[1]![1]);
    expect(vi.mocked(api.createActionTaken).mock.calls[0]![2]).toMatchObject({ description: "Repair connection" });
  });

  it("starts a new retry intent when a failed create draft changes", async () => {
    vi.mocked(api.createActionTaken).mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce(action);
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Inspect application logs");
    fireEvent.click(screen.getByRole("button", { name: "Add Action Taken" }));
    fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Initial work" } });
    fireEvent.click(screen.getByRole("button", { name: "Save action" }));
    await screen.findByText("Connection lost");
    fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Different work" } });
    fireEvent.click(screen.getByRole("button", { name: "Save action" }));
    await waitFor(() => expect(api.createActionTaken).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.createActionTaken).mock.calls[0]![1]).not.toBe(vi.mocked(api.createActionTaken).mock.calls[1]![1]);
  });

  it("requires a follow-up note and does not send invalid form data", async () => {
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Inspect application logs");
    fireEvent.click(screen.getByRole("button", { name: "Add Action Taken" }));
    fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Check backup" } });
    fireEvent.click(screen.getByLabelText("Follow-up required"));
    fireEvent.click(screen.getByRole("button", { name: "Save action" }));
    expect(screen.getByText("A follow-up note is required.")).toBeInTheDocument();
    expect(api.createActionTaken).not.toHaveBeenCalled();
  });

  it("blocks duplicate submits while a create request is pending", async () => {
    let finish!: (value: api.ActionTaken) => void;
    vi.mocked(api.createActionTaken).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Inspect application logs");
    fireEvent.click(screen.getByRole("button", { name: "Add Action Taken" }));
    fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Check backup" } });
    fireEvent.click(screen.getByRole("button", { name: "Save action" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Saving…" }));
    expect(api.createActionTaken).toHaveBeenCalledTimes(1);
    finish(action);
    expect(await screen.findByText("Action Taken added.")).toBeInTheDocument();
  });

  it("shows a server field error when an assignee becomes inactive", async () => {
    vi.mocked(api.createActionTaken).mockRejectedValue(new api.ApiError("assigneeId must reference active IT Staff.", 400, "VALIDATION_ERROR", "assigneeId"));
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Inspect application logs");
    fireEvent.click(screen.getByRole("button", { name: "Add Action Taken" }));
    fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Check backup" } });
    fireEvent.change(screen.getByLabelText("Action assignee"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save action" }));
    await waitFor(() => expect(screen.getAllByText("assigneeId must reference active IT Staff.")).toHaveLength(2));
    expect(screen.getByLabelText("Action description")).toHaveValue("Check backup");
  });

  it("requires a result before completion and sends the versioned status change", async () => {
    vi.mocked(api.updateActionStatus).mockResolvedValue({ ...action, status: "COMPLETED", result: "Restored", version: 2 });
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Inspect application logs");
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm completion" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter a result");
    fireEvent.change(within(dialog).getByLabelText("Completion result"), { target: { value: "Restored" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm completion" }));
    await waitFor(() => expect(api.updateActionStatus).toHaveBeenCalledWith(10, 1, "COMPLETED", expect.objectContaining({ result: "Restored" })));
  });

  it("keeps a stale edit draft until the user explicitly starts from the latest action", async () => {
    vi.mocked(api.updateActionTaken).mockRejectedValue(new api.ApiError("Action changed; reload before saving.", 409, "STALE_VERSION"));
    vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([action]).mockResolvedValueOnce([{ ...action, version: 2, description: "Another staff update" }]);
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Inspect application logs");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "My correction" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Action changed; reload before saving.")).toBeInTheDocument();
    expect(screen.getByLabelText("Action description")).toHaveValue("My correction");
    fireEvent.click(screen.getByRole("button", { name: "Reload current actions" }));
    await screen.findByText("Another staff update");
    expect(screen.getByLabelText("Action description")).toHaveValue("My correction");
    fireEvent.click(screen.getByRole("button", { name: "Discard draft and edit latest" }));
    expect(screen.getByLabelText("Action description")).toHaveValue("Another staff update");
  });

  it("locks completed assignee changes and keeps cancelled actions read-only", async () => {
    const completed = { ...action, status: "COMPLETED" as const, result: "Logs collected", performedBy: { id: 4, name: "Owen Garcia" }, completedAt: action.updatedAt };
    vi.mocked(api.fetchActionsTaken).mockResolvedValue([completed, { ...action, id: 11, status: "CANCELLED" as const, description: "Cancelled step" }]);
    vi.mocked(api.updateActionTaken).mockResolvedValue({ ...completed, description: "Corrected description" });
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Logs collected");
    const cancelledRow = screen.getByText("Cancelled step").closest("li")!;
    expect(within(cancelledRow).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Action assignee")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Action description"), { target: { value: "Corrected description" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateActionTaken).toHaveBeenCalled());
    expect(vi.mocked(api.updateActionTaken).mock.calls[0]![2]).not.toHaveProperty("assigneeId");
  });

  it("starts work and confirms cancellation without deleting the record", async () => {
    vi.mocked(api.updateActionStatus).mockResolvedValueOnce({ ...action, status: "IN_PROGRESS", version: 2 }).mockResolvedValueOnce({ ...action, status: "CANCELLED", version: 3 });
    vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([action]).mockResolvedValueOnce([{ ...action, status: "IN_PROGRESS", version: 2 }]).mockResolvedValueOnce([{ ...action, status: "CANCELLED", version: 3 }]);
    render(<ActionsTakenSection ticketNumber="TKT-L4-10" canManage />);
    await screen.findByText("Inspect application logs");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(api.updateActionStatus).toHaveBeenCalledWith(10, 1, "IN_PROGRESS"));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel action" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Cancel Action Taken");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm cancellation" }));
    await waitFor(() => expect(api.updateActionStatus).toHaveBeenCalledWith(10, 2, "CANCELLED", {}));
    expect(await screen.findByText("Action cancelled.")).toBeInTheDocument();
    expect(screen.getByText("Inspect application logs")).toBeInTheDocument();
  });
});
