import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RequesterProvider, useRequester } from "./contexts/RequesterContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import NavBar from "./components/NavBar";
import RequesterSelectionPage from "./pages/RequesterSelectionPage";
import CreateTicketPage from "./pages/CreateTicketPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import PlaceholderPage from "./pages/PlaceholderPage";

function roleHome(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") {
  if (role === "IT_STAFF") return "/staff/tickets";
  if (role === "ADMINISTRATOR") return "/admin/users";
  return "/select-requester";
}

function AuthLoading() {
  return <main className="min-h-screen grid place-items-center text-sm" style={{ color: "#4A6355" }}>Checking your session…</main>;
}

function RequireAppAccess({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  if (status === "loading") return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  if (status === "loading") return <AuthLoading />;
  if (user) return <Navigate to={user.mustChangePassword ? "/change-password" : roleHome(user.role)} replace />;
  return <>{children}</>;
}

function ChangePasswordOnly() {
  const { status, user } = useAuth();
  if (status === "loading") return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to={roleHome(user.role)} replace />;
  return <ChangePasswordPage />;
}

// ─── Guard: redirect to /select-requester if no requester selected (FR-14) ───

function GuardedRoute({ children }: { children: React.ReactNode }) {
  const { requester } = useRequester();
  if (!requester) return <Navigate to="/select-requester" replace />;
  return <>{children}</>;
}

// ─── App shell layout ─────────────────────────────────────────────────────────

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F7F6" }}>
      <NavBar />
      <main className="flex-1">
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/my-tickets" replace />} />

          {/* Requester selection — no guard needed */}
          <Route path="/select-requester" element={<RequesterSelectionPage />} />

          {/* Guarded routes */}
          <Route path="/my-tickets" element={
            <GuardedRoute>
              <MyTicketsPage />
            </GuardedRoute>
          } />
          <Route path="/create-ticket" element={
            <GuardedRoute>
              <CreateTicketPage />
            </GuardedRoute>
          } />
          <Route path="/tickets/:ticketNumber" element={
            <GuardedRoute>
              <TicketDetailPage />
            </GuardedRoute>
          } />

          <Route path="/staff/tickets" element={<PlaceholderPage title="IT Staff Queue" />} />
          <Route path="/admin/users" element={<PlaceholderPage title="User Management" />} />
        </Routes>
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RequesterProvider>
          <Routes>
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/change-password" element={<ChangePasswordOnly />} />
            <Route path="*" element={<RequireAppAccess><AppShell /></RequireAppAccess>} />
          </Routes>
        </RequesterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
