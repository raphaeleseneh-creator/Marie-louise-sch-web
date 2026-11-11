import {createWorkspaceCache} from "../../lib/workspace-cache";
import {FamilyAccessCodes} from "./FamilyAccessCodes";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, BookOpenCheck, CalendarDays, CircleDollarSign, ClipboardCheck, GraduationCap, LayoutDashboard, LogOut, Menu, RefreshCw, ShieldCheck, Users, X } from "lucide-react";
import { GoogleSignIn } from "../ui/GoogleSignIn";
import { SchoolLogo } from "../ui/SchoolLogo";
import { checkSchoolService, PortalUnavailable } from "../ui/PortalAvailability";
import { ApiError, Role, Row, StaffUser, api, errorMessage, studentName } from "./api";
import { DataTable, EntryForm, Field, Status, buttonClass, secondaryClass } from "./WorkspaceUI";
import { AnnouncementsSection, AttendanceSection, ResultsSection } from "./TeachingSections";
import { AccountsSection, FeesSection, PaymentsSection, RequestsSection } from "./OperationsSections";
import { AccountSettings } from "./AccountSettings";
import { SyncSection } from "./SyncSection";

type View = "overview" | "students" | "classes" | "parents" | "results" | "attendance" | "fees" | "payments" | "announcements" | "admissions" | "tours" | "accounts" | "settings" | "sync" | "link-codes";
type Navigation = { id: View; label: string; icon: React.ElementType; roles: Role[] };
const staff: Role[] = ["developer", "admin", "teacher", "bursar"];
const teaching: Role[] = ["developer", "admin", "teacher"];
const finance: Role[] = ["developer", "admin", "bursar"];
const navigation: Navigation[] = [
  {id:"link-codes",label:"Family access codes",icon:ShieldCheck,roles:["developer","admin"]},
  { id: "overview", label: "Overview", icon: LayoutDashboard, roles: staff },
  { id: "students", label: "Students", icon: GraduationCap, roles: staff },
  { id: "classes", label: "Classes", icon: BookOpenCheck, roles: staff },
  { id: "parents", label: "Parents & guardians", icon: Users, roles: ["developer", "admin"] },
  { id: "results", label: "Results", icon: BookOpenCheck, roles: teaching },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, roles: teaching },
  { id: "fees", label: "Fee invoices", icon: CircleDollarSign, roles: finance },
  { id: "payments", label: "Payments", icon: CircleDollarSign, roles: finance },
  { id: "announcements", label: "Announcements", icon: Bell, roles: teaching },
  { id: "admissions", label: "Admissions", icon: GraduationCap, roles: ["developer", "admin"] },
  { id: "tours", label: "School tours", icon: CalendarDays, roles: ["developer", "admin"] },
  { id: "accounts", label: "Accounts & access", icon: ShieldCheck, roles: ["developer", "admin"] },
  { id: "settings", label: "Account settings", icon: ShieldCheck, roles: staff },
  { id: "sync", label: "Airtable sync", icon: RefreshCw, roles: ["developer", "admin"] },
];
const descriptions: Record<View, string> = {
  "link-codes":"Issue student IDs and private codes for parent self-service linking.",
  overview: "Choose a section to manage school records.", students: "Student records available to your account.", classes: "Classes available to your account.",
  parents: "School parent and guardian directory.", results: "Review scores and publish reports for families.", attendance: "Record daily attendance and review previous entries.",
  fees: "Create invoices and review outstanding balances.", payments: "Record receipts against student invoices.", announcements: "Draft, target and publish school updates.",
  admissions: "Review applications and update admission decisions.", tours: "Review visit requests and confirm arrangements.", accounts: "Create accounts and assign teacher classes or parent access.", settings: "Manage your staff password.", sync: "Import the latest student records from Airtable.",
};
type WorkspaceData = { students: Row[]; classes: Row[]; parents: Row[]; rows: Row[]; invoices: Row[]; airtableConfigured: boolean };
const emptyData: WorkspaceData = { students: [], classes: [], parents: [], rows: [], invoices: [], airtableConfigured: false };

export const AdminDashboard: React.FC<{ onBackToSchool: () => void }> = ({ onBackToSchool }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [sessionCheck, setSessionCheck] = useState(0);
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<WorkspaceData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const requestVersion = useRef(0);
  const catalogCache=useRef(createWorkspaceCache());
  useEffect(()=>{catalogCache.current.clear();},[user?.id]);
  const allowed = navigation.filter(item => user && item.roles.includes(user.role));
  const authorized = allowed.some(item => item.id === view);
  const navigate = (next: View) => {
    if (next !== view) { requestVersion.current += 1; setLoading(true); setView(next); }
    setMenuOpen(false); setNotice(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setServiceUnavailable(false);
    checkSchoolService(controller.signal).then(() => api<{ user: StaffUser }>("/api/auth/me", { signal: controller.signal })).then(result => { setUser(result.user); }).catch(error => {
      if (!controller.signal.aborted && !(error instanceof ApiError && error.status === 401)) setServiceUnavailable(true);
    }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => { controller.abort(); requestVersion.current += 1; };
  }, [sessionCheck]);

  const expireSession = useCallback(() => {
    requestVersion.current += 1;
    setUser(null); setData(emptyData); setView("overview"); setMenuOpen(false);
    setNotice({ error: true, text: "Your session has expired. Sign in again to continue." });
  }, []);

  const refresh = useCallback(async (force=false) => {
    if(force)catalogCache.current.clear();
    if (!user || !navigation.some(item => item.id === view && item.roles.includes(user.role))) return;
    const version = ++requestVersion.current;
    setLoading(true); setLoadError("");
    try {
      const endpoint = view === "announcements" ? "/api/admin/announcements" : `/api/${view}`;
      const [students, classes, parents, rows, invoices, health] = await Promise.all([
        catalogCache.current.read(user.id,"/api/students",()=>api<Row[]>("/api/students")), catalogCache.current.read(user.id,"/api/classes",()=>api<Row[]>("/api/classes")),
        ["developer", "admin"].includes(user.role) && ["parents", "accounts", "link-codes"].includes(view) ? catalogCache.current.read(user.id,"/api/parents",()=>api<Row[]>("/api/parents")) : Promise.resolve([]),
        ["overview", "students", "classes", "parents", "settings", "sync", "link-codes"].includes(view) ? Promise.resolve([]) : api<Row[]>(endpoint),
        view === "payments" ? api<Row[]>("/api/fees") : Promise.resolve([]),
        view === "sync" ? api<{ airtableConfigured: boolean }>("/api/health") : Promise.resolve({ airtableConfigured: false }),
      ]);
      if (version === requestVersion.current) setData({ students, classes, parents, rows, invoices, airtableConfigured: Boolean(health.airtableConfigured) });
    } catch (error) {
      if (version !== requestVersion.current) return;
      if (error instanceof ApiError && error.status === 401) expireSession();
      else setLoadError(errorMessage(error));
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [user, view, expireSession]);

  useEffect(() => { void refresh(); return () => { requestVersion.current += 1; }; }, [refresh]);

  const save = async (path: string, payload: Record<string, unknown>, method: "POST" | "PATCH" = "POST") => {
    const version = requestVersion.current;
    try {
      const result = await api<{ imported?: number; count?: number; synced?: number } | null>(path, { method, body: JSON.stringify(payload) });
      if (path === "/api/auth/password") {
        requestVersion.current += 1; setUser(null); setData(emptyData); setView("overview");
        setNotice({ error: false, text: "Password changed. Sign in again with your new password." }); return true;
      }
      if (version !== requestVersion.current) return true;
      setNotice({ error: false, text: path.startsWith("/api/accounts/") && payload.active === false ? "Access removed. This person has been signed out and cannot sign in." : path.endsWith("/import") ? `CSV import complete${result?.imported != null ? `: ${result.imported} results saved` : ""}.` : path === "/api/sync/students" ? `${result?.synced ?? 0} student records synced from Airtable.` : "Changes saved successfully." });
      await refresh(true);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) expireSession();
      else if (version === requestVersion.current) setNotice({ error: true, text: errorMessage(error) });
      return false;
    }
  };

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await api("/api/auth/logout", { method: "POST" }); requestVersion.current += 1; setUser(null); setData(emptyData); setView("overview"); setNotice(null); setMenuOpen(false); }
    catch (error) { if (error instanceof ApiError && error.status === 401) expireSession(); else setNotice({ error: true, text: errorMessage(error) }); }
    finally { setLoggingOut(false); }
  };

  const noticeElement = notice ? <div role={notice.error ? "alert" : "status"} className={`mb-6 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${notice.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}><p className="break-words whitespace-pre-wrap">{notice.text}</p><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="shrink-0 p-1"><X size={18} /></button></div> : null;

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#F6F3F8] p-6 text-[#29166F]"><p role="status">Checking your staff session…</p></main>;
  if (!user) return <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F6F3F8] px-4 py-10"><div className="w-full max-w-md"><div className="mb-6 rounded-xl border-t-4 border-[#E9DB3D] bg-[#29166F] p-7 text-white"><SchoolLogo variant="dark" onClick={onBackToSchool} /><p className="mt-6 text-xs font-extrabold uppercase tracking-widest text-[#E9DB3D]">Staff workspace</p><h1 className="mt-2 text-2xl font-extrabold">Sign in to school records</h1><p className="mt-3 text-sm text-white/75">For developers, administrators, teachers and bursars.</p></div>{noticeElement}{serviceUnavailable ? <PortalUnavailable retry={() => setSessionCheck(value => value + 1)} /> : null}<EntryForm disabled={serviceUnavailable} title="Staff sign in" submitLabel="Sign in" onSave={async data => {
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: String(data.email).trim(), password: data.password }) });
      const result = await api<{ user: StaffUser }>("/api/auth/me");
      setUser(result.user); setView("overview"); setNotice(null); return true;
    } catch (error) {
      if (error instanceof TypeError || (error instanceof ApiError && error.status >= 500)) setServiceUnavailable(true);
      else setNotice({ error: true, text: errorMessage(error) });
      return false;
    }
  }}><Field label="Email address" name="email" type="email" autoComplete="username" required /><Field label="Password" name="password" type="password" autoComplete="current-password" required /></EntryForm>{!serviceUnavailable ? <GoogleSignIn portal="staff" /> : null}<button className={`${secondaryClass} mt-5 w-full`} onClick={onBackToSchool}><ArrowLeft size={16} />School website</button></div></main>;
  if (!staff.includes(user.role)) return <main className="flex min-h-screen items-center justify-center bg-[#F6F3F8] p-6"><section className="max-w-md rounded-xl bg-white p-8 text-[#29166F]">{noticeElement}<ShieldCheck className="mb-4" /><h1 className="text-2xl font-extrabold">Staff access required</h1><p className="mt-3 text-sm leading-6">This account does not have access to the staff workspace. Use the parent portal on the school website to view family records.</p><div className="mt-6 flex flex-wrap gap-3"><button className={buttonClass} onClick={onBackToSchool}>School website</button><button className={secondaryClass} onClick={() => void logout()} disabled={loggingOut}>{loggingOut ? "Signing out…" : "Sign out"}</button></div></section></main>;

  return <main className="min-h-[100dvh] bg-[#F6F3F8] text-[#27232D]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col bg-[#29166F] p-5 text-white transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Staff navigation">
      <div className="flex items-center justify-between border-b border-white/15 pb-5"><SchoolLogo variant="dark" onClick={onBackToSchool} /><button aria-label="Close navigation" className="p-2 lg:hidden" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
      <p className="mb-3 mt-6 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#E9DB3D]">Staff workspace</p>
      <nav className="flex-1 space-y-1 overflow-y-auto">{allowed.map(item => { const Icon = item.icon; return <button key={item.id} aria-current={view === item.id ? "page" : undefined} onClick={() => { navigate(item.id); }} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#E9DB3D] ${view === item.id ? "bg-[#E9DB3D] text-[#29166F]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon size={18} />{item.label}</button>; })}</nav>
      <div className="mt-4 border-t border-white/15 pt-4"><p className="truncate px-3 text-sm font-bold">{user.full_name}</p><p className="mt-1 px-3 text-xs capitalize text-white/60">{user.role}</p>{user.role === "developer" ? <a href="/parent-portal" className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#E9DB3D] hover:bg-white/10"><ShieldCheck size={16} />Parent portal preview</a> : null}<button className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50" onClick={() => void logout()} disabled={loggingOut}><LogOut size={16} />{loggingOut ? "Signing out…" : "Sign out"}</button><button onClick={onBackToSchool} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10"><ArrowLeft size={16} />School website</button></div>
    </aside>
    {menuOpen ? <button className="fixed inset-0 z-30 bg-[#160B35]/50 lg:hidden" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} /> : null}
    <div className="lg:pl-[270px]"><header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-[#E5DFE9] bg-white px-4 py-4 sm:px-8"><div className="flex items-center gap-3"><button className={secondaryClass} aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} style={{ padding: 10 }}><Menu size={20} className="lg:hidden" /><span className="hidden lg:inline text-xs">Marie Louise School</span></button><h1 className="text-xl font-extrabold text-[#29166F]">{allowed.find(item => item.id === view)?.label || "Workspace"}</h1></div><button className={secondaryClass} disabled={loading} onClick={() => void refresh(true)} aria-label="Refresh records"><RefreshCw size={16} className={loading ? "animate-spin motion-reduce:animate-none" : ""} /><span className="hidden sm:inline">Refresh</span></button></header>
    <section className="mx-auto max-w-[1700px] px-4 py-7 sm:px-8"><p className="mb-6 text-sm text-[#625B69]">{descriptions[view]}</p>{noticeElement}
      {!authorized ? <p role="alert">This section is not available to your role.</p> : loading ? <p role="status" className="rounded-xl border border-[#E5DFE9] bg-white p-8 text-sm text-[#625B69]">Loading records…</p> : loadError ? <div role="alert" className="rounded-xl border border-red-200 bg-white p-6"><p className="mb-4 text-sm text-red-800">{loadError}</p><button className={buttonClass} onClick={() => void refresh()}>Try again</button></div> : <>
      {view === "overview" ? <div><div className="mb-8 flex flex-wrap gap-10 border-y border-[#E5DFE9] py-6"><div><p className="text-sm text-[#625B69]">Students in your scope</p><p className="mt-2 text-3xl font-extrabold text-[#29166F]">{data.students.length}</p></div><div><p className="text-sm text-[#625B69]">Available classes</p><p className="mt-2 text-3xl font-extrabold text-[#29166F]">{data.classes.length}</p></div><div><p className="text-sm text-[#625B69]">Signed in as</p><p className="mt-2 text-lg font-bold capitalize text-[#29166F]">{user.role}</p></div></div><h2 className="mb-4 text-xl font-extrabold text-[#29166F]">Your workspace</h2><div className="grid gap-x-8 sm:grid-cols-2">{allowed.filter(item => item.id !== "overview").map(item => <button key={item.id} className="group flex min-h-20 items-center justify-between gap-4 border-b border-[#E5DFE9] py-4 text-left" onClick={() => { navigate(item.id); }}><span><span className="block font-bold text-[#29166F]">{item.label}</span><span className="mt-1 block text-xs leading-5 text-[#625B69]">{descriptions[item.id]}</span></span><span aria-hidden="true" className="text-xl text-[#581C87] transition-transform group-hover:translate-x-1">→</span></button>)}</div></div> : null}
      {view === "students" ? <DataTable rows={data.students} searchLabel="Search student or class" columns={[{ label: "Student", render: studentName }, { label: "Student code", render: row => row.student_code }, { label: "Record ID", render: row => row.id }, { label: "Class", render: row => row.class_name || "Unassigned" }, { label: "Status", render: row => <Status value={row.enrollment_status || "active"} /> }]} /> : null}
      {view === "classes" ? <DataTable rows={data.classes} columns={[{ label: "Class", render: row => row.name }, { label: "Class ID", render: row => row.id }]} /> : null}
      {view === "parents" && ["developer", "admin"].includes(user.role) ? <DataTable rows={data.parents} columns={[{ label: "Name", render: row => row.full_name }, { label: "Email", render: row => row.email }, { label: "Phone", render: row => row.phone || "—" }, { label: "Status", render: row => <Status value={row.status} /> }]} /> : null}
      {view === "results" && teaching.includes(user.role) ? <ResultsSection rows={data.rows} students={data.students} save={save} canPublish={["developer", "admin"].includes(user.role)} /> : null}
      {view === "attendance" && teaching.includes(user.role) ? <AttendanceSection rows={data.rows} students={data.students} save={save} /> : null}
      {view === "announcements" && teaching.includes(user.role) ? <AnnouncementsSection rows={data.rows} students={data.students} classes={data.classes} save={save} canWriteSchool={["developer", "admin"].includes(user.role)} /> : null}
      {view === "fees" && finance.includes(user.role) ? <FeesSection rows={data.rows} students={data.students} save={save} /> : null}
      {view === "payments" && finance.includes(user.role) ? <PaymentsSection rows={data.rows} invoices={data.invoices} save={save} /> : null}
      {(view === "admissions" || view === "tours") && ["developer", "admin"].includes(user.role) ? <RequestsSection rows={data.rows} kind={view} save={save} /> : null}
      {view === "accounts" && ["developer", "admin"].includes(user.role) ? <AccountsSection rows={data.rows} parents={data.parents} classes={data.classes} save={save} currentUserId={user.id} canManageDevelopers={user.role === "developer"} /> : null}
      {view === "link-codes" && ["developer","admin"].includes(user.role) ? <FamilyAccessCodes parents={data.parents} students={data.students} onRecordsChanged={()=>catalogCache.current.clear()}/> : null}
      {view === "settings" ? <AccountSettings user={user} save={save} /> : null}
      {view === "sync" && ["developer", "admin"].includes(user.role) ? <SyncSection configured={data.airtableConfigured} save={save} /> : null}
      </>}
    </section></div>
  </main>;
};
