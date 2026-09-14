import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

function homeForRole(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") {
  if (role === "IT_STAFF") return "/staff/tickets";
  if (role === "ADMINISTRATOR") return "/admin/users";
  // Requester identity is moved from the Lab 2 selector to the session in Issue 3.
  return "/select-requester";
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.mustChangePassword ? "/change-password" : homeForRole(user.role), { replace: true });
    } catch (cause) {
      // The API deliberately uses the same message for invalid and inactive
      // accounts, so the UI does not disclose account state either.
      const message = cause instanceof ApiError && cause.status === 400
        ? cause.message
        : "Unable to sign in with those credentials. Please try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F5F7F6" }}>
      <section className="bg-white w-full max-w-md rounded-xl shadow-md p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2" aria-hidden="true">🎫</div>
          <h1 className="text-2xl font-bold" style={{ color: "#1A2E22" }}>TokTickIT</h1>
          <p className="text-sm mt-1" style={{ color: "#4A6355" }}>Sign in to your account</p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg px-4 py-3 mb-4 text-sm" style={{ backgroundColor: "#FEF2F2", color: "#B91C1C" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "#1A2E22" }}>
            Email <span className="text-red-600">*</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={busy}
              required
              className="border rounded-md px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-[#006B3C] disabled:bg-gray-100"
              style={{ borderColor: "#D1E0D8" }}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "#1A2E22" }}>
            Password <span className="text-red-600">*</span>
            <span className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={busy}
                required
                className="min-w-0 flex-1 border rounded-md px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-[#006B3C] disabled:bg-gray-100"
                style={{ borderColor: "#D1E0D8" }}
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={busy} className="text-sm underline cursor-pointer disabled:cursor-not-allowed" style={{ color: "#006B3C" }}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          <button type="submit" disabled={busy} className="w-full py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: "#006B3C" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
