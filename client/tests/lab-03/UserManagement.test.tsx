import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "../../src/pages/AdminUsersPage";
import * as api from "../../src/services/api";

vi.mock("../../src/services/api", async () => ({
  ...(await vi.importActual<typeof api>("../../src/services/api")),
  fetchAdminUsers: vi.fn(),
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  resetAdminUserPassword: vi.fn(),
}));

const admin = { id: 1, name: "Admin User", email: "admin@example.test", role: "ADMINISTRATOR" as const, isActive: true, mustChangePassword: false };
const requester = { id: 2, name: "Requester User", email: "requester@example.test", role: "REQUESTER" as const, isActive: true, mustChangePassword: true };
const inactive = { id: 3, name: "Inactive User", email: "inactive@example.test", role: "IT_STAFF" as const, isActive: false, mustChangePassword: false };

function renderPage() { return render(<MemoryRouter><AdminUsersPage /></MemoryRouter>); }

describe("Lab 3 Administrator User Management UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({ users: [admin, requester, inactive] });
    vi.mocked(api.createAdminUser).mockResolvedValue({ user: requester });
    vi.mocked(api.updateAdminUser).mockResolvedValue({ user: requester });
    vi.mocked(api.resetAdminUserPassword).mockResolvedValue({ user: requester });
  });

  it("renders the documented list, filters, roles, and activation badges", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText("Admin User").length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: "+ Create User" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search users")).toBeInTheDocument();
    expect(screen.getByLabelText("Role filter")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBe(4);
    expect(screen.getAllByText("Inactive").length).toBe(2);
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "inactive" } });
    await waitFor(() => expect(api.fetchAdminUsers).toHaveBeenLastCalledWith({ search: "inactive", role: "" }));
  });

  it("validates and submits the create-user dialog with an initial password", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText("Admin User").length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
    expect(screen.getByRole("dialog", { name: "Create User" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("User name")).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(screen.getByLabelText("User name"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("User email"), { target: { value: "new@example.test" } });
    fireEvent.change(screen.getByLabelText("Initial password"), { target: { value: "initial-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
    await waitFor(() => expect(api.createAdminUser).toHaveBeenCalledWith({ name: "New User", email: "new@example.test", role: "REQUESTER", initialPassword: "initial-password" }));
  });

  it("edits a user and requires confirmation before deactivation", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText("Requester User").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    expect(screen.getByRole("dialog", { name: "Edit User" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateAdminUser).toHaveBeenCalledWith(2, expect.objectContaining({ isActive: true })));
    fireEvent.click(screen.getAllByRole("button", { name: "Deactivate" })[1]);
    expect(screen.getByRole("dialog", { name: "Confirm deactivation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.updateAdminUser).toHaveBeenLastCalledWith(2, expect.objectContaining({ isActive: false })));
  });

  it("shows a safe load error and retry action", async () => {
    vi.mocked(api.fetchAdminUsers).mockRejectedValueOnce(new Error("Service unavailable")).mockResolvedValueOnce({ users: [] });
    renderPage();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable"));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("No users are available.")).toBeInTheDocument());
  });

  it("renders the mobile card layout without the desktop table", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("user-card-list")).toBeInTheDocument());
    expect(screen.getByTestId("user-card-list")).toHaveClass("md:hidden");
    expect(screen.getByTestId("user-table")).toHaveClass("md:block");
  });
});
