import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useRequester } from "../contexts/RequesterContext";
import { useAuth } from "../contexts/AuthContext";

function roleLabel(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") {
  if (role === "IT_STAFF") return "IT Staff";
  if (role === "ADMINISTRATOR") return "Administrator";
  return "Requester";
}

export default function NavBar() {
  const { requester, clearRequester } = useRequester();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleChangeRequester() {
    clearRequester();
    setMobileMenuOpen(false);
    navigate("/select-requester");
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearRequester();
      setMobileMenuOpen(false);
      navigate("/login");
    }
  }

  return (
    <nav
      className="shadow-sm relative z-50"
      style={{ backgroundColor: "#006B3C" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 md:h-14 flex items-center justify-between">
        {/* Brand */}
        <span className="text-white font-bold text-base md:text-lg tracking-wide flex items-center gap-1.5">
          <span>🎫</span> TokTickIT
        </span>

        {/* Desktop Nav links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink
            to="/my-tickets"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive
                  ? "text-white underline underline-offset-4 font-semibold"
                  : "text-green-100 hover:text-white"
              }`
            }
          >
            My Tickets
          </NavLink>

          <NavLink
            to="/create-ticket"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive
                  ? "text-white underline underline-offset-4 font-semibold"
                  : "text-green-100 hover:text-white"
              }`
            }
          >
            Create Ticket
          </NavLink>
        </div>

        {/* Desktop Profile / Requester area */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-green-100 text-sm">
                👤 {user.name} · {roleLabel(user.role)}
              </span>
              {user.role === "REQUESTER" && requester && (
                <button
                  onClick={handleChangeRequester}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer"
                >
                  Change Requester
                </button>
              )}
              <button onClick={() => void handleLogout()} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer">
                Log out
              </button>
            </>
          ) : (
            <span className="text-green-200 text-sm italic">No signed-in user</span>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <span className="text-green-100 text-xs font-medium truncate max-w-[120px]">
              👤 {user.name.split(" ")[0]}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="text-white p-1.5 rounded-md hover:bg-white/10 focus:outline-none transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-green-700/50 bg-[#00532e] px-4 pt-3 pb-4 space-y-3 shadow-lg">
          {/* User Info on Mobile */}
          <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
            <div>
              <span className="text-xs text-green-200 block">Signed in as:</span>
              <span className="text-sm font-semibold text-white">
                {user ? `${user.name} · ${roleLabel(user.role)}` : "No signed-in user"}
              </span>
            </div>
            {user?.role === "REQUESTER" && requester && (
              <button
                onClick={handleChangeRequester}
                className="text-xs bg-white text-[#006B3C] font-semibold px-3 py-1.5 rounded shadow-sm hover:bg-green-50 transition-colors cursor-pointer"
              >
                Change Requester
              </button>
            )}
          </div>

          <button onClick={() => void handleLogout()} className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-green-100 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
            Log out
          </button>

          {/* Navigation links on Mobile */}
          <div className="flex flex-col gap-1">
            <NavLink
              to="/my-tickets"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/20 text-white font-semibold"
                    : "text-green-100 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              📋 My Tickets
            </NavLink>

            <NavLink
              to="/create-ticket"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/20 text-white font-semibold"
                    : "text-green-100 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              ➕ Create Ticket
            </NavLink>
          </div>
        </div>
      )}
    </nav>
  );
}
