import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

function homeForRole(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") {
  if (role === "IT_STAFF") return "/staff/tickets";
  if (role === "ADMINISTRATOR") return "/admin/users";
  return "/select-requester";
}

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Your new password must be 12–128 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation must match.");
      return;
    }

    setBusy(true);
    try {
      const updatedUser = await changePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigate(homeForRole(updatedUser.role), { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to change your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F5F7F6" }}>
      <section className="bg-white w-full max-w-md rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1A2E22" }}>Change your password</h1>
        <p className="text-sm mt-2 mb-5" style={{ color: "#4A6355" }}>
          {user?.name}, you must choose a new password before accessing the application.
        </p>

        {error && <div role="alert" className="rounded-lg px-4 py-3 mb-4 text-sm" style={{ backgroundColor: "#FEF2F2", color: "#B91C1C" }}>{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            ["Current password", currentPassword, setCurrentPassword, "current-password"],
            ["New password", newPassword, setNewPassword, "new-password"],
            ["Confirm new password", confirmPassword, setConfirmPassword, "new-password"],
          ].map(([label, value, setValue, autoComplete]) => (
            <label key={label as string} className="flex flex-col gap-1 text-sm font-medium" style={{ color: "#1A2E22" }}>
              {label as string} <span className="text-red-600">*</span>
              <input
                type={showPasswords ? "text" : "password"}
                value={value as string}
                onChange={(event) => (setValue as (next: string) => void)(event.target.value)}
                autoComplete={autoComplete as string}
                disabled={busy}
                required
                className="border rounded-md px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-[#006B3C] disabled:bg-gray-100"
                style={{ borderColor: "#D1E0D8" }}
              />
            </label>
          ))}
          <button type="button" onClick={() => setShowPasswords((visible) => !visible)} disabled={busy} className="self-start text-sm underline cursor-pointer disabled:cursor-not-allowed" style={{ color: "#006B3C" }}>
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>
          <button type="submit" disabled={busy} className="w-full py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: "#006B3C" }}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>

        <button type="button" onClick={() => void handleLogout()} disabled={busy} className="w-full mt-3 text-sm underline cursor-pointer disabled:cursor-not-allowed" style={{ color: "#4A6355" }}>
          Log out
        </button>
      </section>
    </main>
  );
}
