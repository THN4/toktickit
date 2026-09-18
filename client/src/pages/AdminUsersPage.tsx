import { useCallback, useEffect, useState } from "react";
import {
  createAdminUser,
  fetchAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  type AuthUser,
  type UserRole,
} from "../services/api";

type FormMode = "create" | "edit" | null;
type Draft = { name: string; email: string; role: UserRole; isActive: boolean; initialPassword: string };
const emptyDraft: Draft = { name: "", email: "", role: "REQUESTER", isActive: true, initialPassword: "" };

function roleLabel(role: UserRole) {
  return role === "IT_STAFF" ? "IT Staff" : role === "ADMINISTRATOR" ? "Administrator" : "Requester";
}

function UserBadge({ active }: { active: boolean }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#4B5563]"}`}>{active ? "Active" : "Inactive"}</span>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<FormMode>(null);
  const [selected, setSelected] = useState<AuthUser | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<AuthUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try { setUsers((await fetchAdminUsers({ search, role })).users); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load users."); }
    finally { setLoading(false); }
  }, [search, role]);

  useEffect(() => { const timer = window.setTimeout(() => void loadUsers(), 250); return () => window.clearTimeout(timer); }, [loadUsers]);

  const openCreate = () => { setSelected(null); setDraft({ ...emptyDraft }); setFormError(""); setMode("create"); };
  const openEdit = (user: AuthUser) => { setSelected(user); setDraft({ name: user.name, email: user.email, role: user.role, isActive: user.isActive, initialPassword: "" }); setFormError(""); setMode("edit"); };
  const closeForm = () => { if (!saving && !resetting) setMode(null); };

  const saveUser = async () => {
    setSaving(true); setFormError(""); setSuccess("");
    try {
      if (!draft.name.trim() || !draft.email.trim()) throw new Error("Name and email are required.");
      if (mode === "create") {
        if (draft.initialPassword.length < 12) throw new Error("Initial password must be at least 12 characters.");
        await createAdminUser({ name: draft.name, email: draft.email, role: draft.role, initialPassword: draft.initialPassword });
        setSuccess("User created. The next login requires a password change.");
      } else if (selected) {
        const response = await updateAdminUser(selected.id, { name: draft.name, email: draft.email, role: draft.role, isActive: draft.isActive });
        setUsers((current) => current.map((user) => user.id === selected.id ? response.user : user));
        setSuccess("User updated.");
      }
      setMode(null);
      await loadUsers();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : "Unable to save user."); }
    finally { setSaving(false); }
  };

  const resetPassword = async () => {
    if (!selected || draft.initialPassword.length < 12) { setFormError("Initial password must be at least 12 characters."); return; }
    setResetting(true); setFormError(""); setSuccess("");
    try {
      const response = await resetAdminUserPassword(selected.id, draft.initialPassword);
      setUsers((current) => current.map((user) => user.id === selected.id ? response.user : user));
      setDraft((current) => ({ ...current, initialPassword: "" }));
      setSuccess("Initial password reset. The next login requires a password change.");
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : "Unable to reset initial password."); }
    finally { setResetting(false); }
  };

  const confirmActivationChange = async () => {
    if (!confirmDeactivate) return;
    const user = confirmDeactivate;
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await updateAdminUser(user.id, { name: user.name, email: user.email, role: user.role, isActive: true });
      setUsers((current) => current.map((item) => item.id === user.id ? response.user : item));
      setSuccess("User reactivated.");
      setConfirmDeactivate(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update activation state."); }
    finally { setSaving(false); }
  };

  const toggleActivation = async () => {
    if (!confirmDeactivate) return;
    const user = confirmDeactivate;
    if (!user.isActive) return void confirmActivationChange();
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await updateAdminUser(user.id, { name: user.name, email: user.email, role: user.role, isActive: false });
      setUsers((current) => current.map((item) => item.id === user.id ? response.user : item));
      setSuccess("User deactivated.");
      setConfirmDeactivate(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update activation state."); }
    finally { setSaving(false); }
  };

  const hasFilters = Boolean(search || role);
  return <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-[#1A2E22]">Users</h1><p className="mt-1 text-sm text-[#4A6355]">Manage accounts, roles, activation, and local initial passwords.</p></div><button type="button" onClick={openCreate} className="rounded-lg bg-[#006B3C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00532E]">+ Create User</button></header>
    {error && <div role="alert" className="mt-4 rounded-xl border border-[#F5B8B8] bg-[#FFF1F1] p-4 text-sm text-[#991B1B]">{error}<button type="button" onClick={() => void loadUsers()} className="ml-3 font-semibold underline">Retry</button></div>}
    {success && <div role="status" className="mt-4 rounded-xl border border-[#A6D8B4] bg-[#ECFDF3] p-4 text-sm text-[#166534]">{success}</div>}
    <section aria-label="User filters" className="mt-5 grid gap-3 rounded-xl border border-[#D1E0D8] bg-[#F8FBF8] p-4 md:grid-cols-[1fr_220px_auto] md:items-end"><label className="grid gap-1 text-sm font-medium text-[#294536]">Search name or email<input aria-label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" className="min-h-10 rounded-lg border border-[#B8CEC0] bg-white px-3 text-sm" /></label><label className="grid gap-1 text-sm font-medium text-[#294536]">Role<select aria-label="Role filter" value={role} onChange={(event) => setRole(event.target.value as UserRole | "")} className="min-h-10 rounded-lg border border-[#B8CEC0] bg-white px-3 text-sm"><option value="">All roles</option><option value="REQUESTER">Requester</option><option value="IT_STAFF">IT Staff</option><option value="ADMINISTRATOR">Administrator</option></select></label><button type="button" disabled={!hasFilters} onClick={() => { setSearch(""); setRole(""); }} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#006B3C] disabled:opacity-40">Clear filters</button></section>
    <section className="mt-5" aria-live="polite">{loading ? <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[#E9F0EB]" />)}</div> : users.length === 0 ? <div className="rounded-xl border border-dashed border-[#B8CEC0] bg-white p-8 text-center text-sm text-[#4A6355]">{hasFilters ? "No users match the current search or filter." : "No users are available."}{hasFilters && <button type="button" onClick={() => { setSearch(""); setRole(""); }} className="ml-2 font-semibold text-[#006B3C] underline">Clear filters</button>}</div> : <div className="overflow-x-auto rounded-xl border border-[#D1E0D8] bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#EFF6F0] text-[#294536]"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Edit</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-[#E1EBE4] text-[#294536]"><td className="p-3 font-semibold text-[#1A2E22]">{user.name}</td><td className="p-3">{user.email}</td><td className="p-3">{roleLabel(user.role)}</td><td className="p-3"><UserBadge active={user.isActive} /></td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => openEdit(user)} className="rounded-lg border border-[#8EAD99] px-3 py-1.5 text-xs font-semibold text-[#006B3C]">Edit</button><button type="button" onClick={() => setConfirmDeactivate(user)} className="rounded-lg border border-[#D1E0D8] px-3 py-1.5 text-xs font-semibold text-[#4A6355]">{user.isActive ? "Deactivate" : "Activate"}</button></div></td></tr>)}</tbody></table></div>}</section>

    {mode && <div role="dialog" aria-modal="true" aria-labelledby="user-form-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><h2 id="user-form-title" className="text-lg font-bold text-[#1A2E22]">{mode === "create" ? "Create User" : "Edit User"}</h2><button type="button" onClick={closeForm} disabled={saving || resetting} aria-label="Close user form" className="text-xl text-[#4A6355]">×</button></div><div className="mt-4 grid gap-3"><label className="grid gap-1 text-sm font-medium text-[#294536]">Name<input aria-label="User name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="min-h-10 rounded-lg border border-[#B8CEC0] px-3" /></label><label className="grid gap-1 text-sm font-medium text-[#294536]">Email<input aria-label="User email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="min-h-10 rounded-lg border border-[#B8CEC0] px-3" /></label><label className="grid gap-1 text-sm font-medium text-[#294536]">Role<select aria-label="User role" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })} className="min-h-10 rounded-lg border border-[#B8CEC0] px-3"><option value="REQUESTER">Requester</option><option value="IT_STAFF">IT Staff</option><option value="ADMINISTRATOR">Administrator</option></select></label>{mode === "edit" && <label className="flex items-center gap-2 text-sm font-medium text-[#294536]"><input aria-label="Active" type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />Active</label>}<label className="grid gap-1 text-sm font-medium text-[#294536]">Initial Password{mode === "edit" && <span className="text-xs font-normal text-[#4A6355]">Set only when resetting; next login requires a change.</span>}<input aria-label="Initial password" type="password" minLength={12} value={draft.initialPassword} onChange={(event) => setDraft({ ...draft, initialPassword: event.target.value })} className="min-h-10 rounded-lg border border-[#B8CEC0] px-3" /></label>{formError && <p role="alert" className="text-sm text-[#991B1B]">{formError}</p>}<div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={closeForm} disabled={saving || resetting} className="rounded-lg border border-[#B8CEC0] px-3 py-2 text-sm font-semibold">Cancel</button>{mode === "edit" && <button type="button" onClick={() => void resetPassword()} disabled={saving || resetting} className="rounded-lg border border-[#8EAD99] px-3 py-2 text-sm font-semibold text-[#006B3C]">{resetting ? "Resetting…" : "Reset initial password"}</button>}<button type="button" onClick={() => void saveUser()} disabled={saving || resetting} className="rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white">{saving ? "Saving…" : mode === "create" ? "Create User" : "Save changes"}</button></div></div></div></div>}

    {confirmDeactivate && <div role="dialog" aria-modal="true" aria-labelledby="activation-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 id="activation-title" className="text-lg font-bold text-[#1A2E22]">Confirm {confirmDeactivate.isActive ? "deactivation" : "activation"}</h2><p className="mt-2 text-sm text-[#4A6355]">{confirmDeactivate.isActive ? `Deactivate ${confirmDeactivate.name}? They will not be able to sign in.` : `Reactivate ${confirmDeactivate.name}?`}</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmDeactivate(null)} disabled={saving} className="rounded-lg border border-[#B8CEC0] px-3 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={() => void toggleActivation()} disabled={saving} className="rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white">{saving ? "Saving…" : "Confirm"}</button></div></div></div>}
  </main>;
}
