import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import NavBar from "./components/NavBar";
import CreateTicketPage from "./pages/CreateTicketPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import PlaceholderPage from "./pages/PlaceholderPage";

function roleHome(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") {
  if (role === "IT_STAFF") return "/staff/tickets";
  if (role === "ADMINISTRATOR") return "/admin/users";
  return "/my-tickets";
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

function RequesterRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "REQUESTER") return <Navigate to={user ? roleHome(user.role) : "/login"} replace />;
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

          <Route path="/my-tickets" element={
            <RequesterRoute>
              <MyTicketsPage />
            </RequesterRoute>
          } />
          <Route path="/create-ticket" element={
            <RequesterRoute>
              <CreateTicketPage />
            </RequesterRoute>
          } />
          <Route path="/tickets/:ticketNumber" element={
            <RequesterRoute>
              <TicketDetailPage />
            </RequesterRoute>
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
        <Routes>
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/change-password" element={<ChangePasswordOnly />} />
            <Route path="*" element={<RequireAppAccess><AppShell /></RequireAppAccess>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
