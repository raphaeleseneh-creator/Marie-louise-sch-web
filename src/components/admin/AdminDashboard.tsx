import {createWorkspaceCache} from "../../lib/workspace-cache";
import {FamilyAccessCodes} from "./FamilyAccessCodes";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpenCheck, CalendarDays, ChevronRight, CircleDollarSign, ClipboardCheck, ClipboardList, Eye, GraduationCap, KeyRound, LayoutDashboard, LogOut, Megaphone, Menu, Receipt, RefreshCw, School, Settings, ShieldCheck, UserCog, Users, X } from "lucide-react";
import { LoadingBlock, SkipLink } from "../ui/StatusBadge";
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
type Group = "Records" | "Teaching" | "Finance" | "Front office" | "Administration";
type Navigation = { id: View; label: string; icon: React.ElementType; roles: Role[]; group?: Group };
const staff: Role[] = ["developer", "admin", "teacher", "bursar"];
const teaching: Role[] = ["developer", "admin", "teacher"];
const finance: Role[] = ["developer", "admin", "bursar"];
const management: Role[] = ["developer", "admin"];
// Grouped by task so each role sees a short, predictable menu with one distinct icon per item.
const navigation: Navigation[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, roles: staff },
  { id: "students", label: "Students", icon: GraduationCap, roles: staff, group: "Records" },
  { id: "classes", label: "Classes", icon: School, roles: staff, group: "Records" },
  { id: "parents", label: "Parents & guardians", icon: Users, roles: management, group: "Records" },
  { id: "link-codes", label: "Family access codes", icon: KeyRound, roles: management, group: "Records" },
  { id: "results", label: "Results", icon: BookOpenCheck, roles: teaching, group: "Teaching" },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, roles: teaching, group: "Teaching" },
  { id: "announcements", label: "Announcements", icon: Megaphone, roles: teaching, group: "Teaching" },
  { id: "fees", label: "Fee invoices", icon: CircleDollarSign, roles: finance, group: "Finance" },
  { id: "payments", label: "Payments", icon: Receipt, roles: finance, group: "Finance" },
  { id: "admissions", label: "Admissions", icon: ClipboardList, roles: management, group: "Front office" },
  { id: "tours", label: "School tours", icon: CalendarDays, roles: management, group: "Front office" },
  { id: "accounts", label: "Accounts & access", icon: UserCog, roles: management, group: "Administration" },
  { id: "sync", label: "Airtable sync", icon: RefreshCw, roles: management, group: "Administration" },
  { id: "settings", label: "Account settings", icon: Settings, roles: staff, group: "Administration" },
];
const groups: Group[] = ["Records", "Teaching", "Finance", "Front office", "Administration"];
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

  // Mobile menu: Escape closes it, and the page behind does not scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("keydown", close); document.body.style.overflow = overflow; };
  }, [menuOpen]);

  const currentLabel = allowed.find(item => item.id === view)?.label || "Workspace";
  useEffect(() => { if (user) document.title = `${currentLabel} · Staff workspace · Marie Louise School`; }, [user, currentLabel]);

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

  const noticeElement = notice ? <div role={notice.error ? "alert" : "status"} className={`mb-6 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${notice.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}><p className="break-words whitespace-pre-wrap">{notice.text}</p><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-current"><X size={18} /></button></div> : null;

  if (checking) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F3F8] p-6 text-[#29166F]"><RefreshCw aria-hidden="true" size={28} className="animate-spin text-[#581C87] motion-reduce:animate-none" /><p role="status" className="text-sm font-bold">Checking your staff session…</p></main>;
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

  const navButton = (item: Navigation) => { const Icon = item.icon; const active = view === item.id; return <button key={item.id} type="button" aria-current={active ? "page" : undefined} onClick={() => { navigate(item.id); }} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9DB3D] ${active ? "bg-[#E9DB3D] text-[#29166F]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}><Icon aria-hidden="true" size={18} className="shrink-0" />{item.label}</button>; };
  const footerLink = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#E9DB3D]";
  return <main className="min-h-[100dvh] bg-[#F6F3F8] text-[#27232D]">
    <SkipLink target="workspace-content" />
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col bg-[#29166F] p-5 text-white shadow-xl transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Staff navigation">
      <div className="flex items-center justify-between border-b border-white/15 pb-5"><SchoolLogo variant="dark" onClick={onBackToSchool} /><button type="button" aria-label="Close navigation" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
      <nav className="-mx-1 mt-5 flex-1 overflow-y-auto px-1">
        {allowed.filter(item => !item.group).map(navButton)}
        {groups.map(group => { const items = allowed.filter(item => item.group === group); return items.length ? <div key={group} className="mt-5"><p className="mb-1.5 px-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#E9DB3D]/90">{group}</p><div className="space-y-0.5">{items.map(navButton)}</div></div> : null; })}
      </nav>
      <div className="mt-4 border-t border-white/15 pt-4"><div className="flex items-center gap-3 px-3"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E9DB3D] text-sm font-extrabold text-[#29166F]">{user.full_name.trim().charAt(0).toUpperCase() || "?"}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{user.full_name}</p><p className="text-xs capitalize text-white/70">{user.role}</p></div></div>{user.role === "developer" ? <a href="/parent-portal" className={`${footerLink} mt-3 text-[#E9DB3D]`}><Eye aria-hidden="true" size={16} />Parent portal preview</a> : null}<button type="button" className={`${footerLink} mt-1 text-white/85 disabled:opacity-50`} onClick={() => void logout()} disabled={loggingOut}><LogOut aria-hidden="true" size={16} />{loggingOut ? "Signing out…" : "Sign out"}</button><button type="button" onClick={onBackToSchool} className={`${footerLink} text-white/85`}><ArrowLeft aria-hidden="true" size={16} />School website</button></div>
    </aside>
    {menuOpen ? <button type="button" tabIndex={-1} className="fixed inset-0 z-30 bg-[#160B35]/50 lg:hidden" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} /> : null}
    <div className="lg:pl-[270px]"><header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-4 border-b border-[#E5DFE9] bg-white/95 px-4 py-3 backdrop-blur sm:px-8"><div className="flex min-w-0 items-center gap-3"><button type="button" className={`${secondaryClass} w-11 px-0 lg:hidden`} aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="min-w-0"><p className="hidden text-xs font-bold text-[#625B69] sm:block">Staff workspace</p><h1 className="truncate text-xl font-extrabold text-[#29166F]">{currentLabel}</h1></div></div><button type="button" className={secondaryClass} disabled={loading} onClick={() => void refresh(true)} aria-label="Refresh records"><RefreshCw aria-hidden="true" size={16} className={loading ? "animate-spin motion-reduce:animate-none" : ""} /><span className="hidden sm:inline">Refresh</span></button></header>
    <section id="workspace-content" tabIndex={-1} className="mx-auto max-w-[1700px] px-4 py-7 outline-none sm:px-8"><p className="mb-6 max-w-3xl text-sm leading-6 text-[#625B69]">{descriptions[view]}</p>{noticeElement}
      {!authorized ? <p role="alert" className="rounded-xl border border-[#E5DFE9] bg-white p-6 text-sm">This section is not available to your role.</p> : loading ? <LoadingBlock rows={view === "overview" ? 3 : 6} /> : loadError ? <div role="alert" className="rounded-xl border border-red-200 bg-white p-6"><p className="font-bold text-red-800">We couldn&apos;t load these records.</p><p className="mb-4 mt-1 text-sm text-red-800">{loadError}</p><button type="button" className={buttonClass} onClick={() => void refresh()}>Try again</button></div> : <>
      {view === "overview" ? <div><div className="mb-8 grid gap-4 sm:grid-cols-3">{[{ label: "Students in your scope", value: data.students.length, icon: GraduationCap }, { label: "Available classes", value: data.classes.length, icon: School }, { label: "Signed in as", value: user.role, icon: ShieldCheck }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-[#E5DFE9] bg-white p-5 shadow-[0_1px_2px_rgba(41,22,111,0.04)]"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-[#625B69]">{label}</p><span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1ECF6] text-[#581C87]"><Icon size={18} /></span></div><p className={`mt-3 font-extrabold capitalize tabular-nums text-[#29166F] ${typeof value === "number" ? "text-3xl" : "text-xl"}`}>{value}</p></div>)}</div><h2 className="mb-4 text-lg font-extrabold text-[#29166F]">Your workspace</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{allowed.filter(item => item.id !== "overview").map(item => { const Icon = item.icon; return <button key={item.id} type="button" className="group flex min-h-20 items-start gap-4 rounded-xl border border-[#E5DFE9] bg-white p-4 text-left transition hover:border-[#581C87]/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#581C87] motion-reduce:transition-none" onClick={() => { navigate(item.id); }}><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1ECF6] text-[#581C87]"><Icon size={20} /></span><span className="min-w-0 flex-1"><span className="block font-bold text-[#29166F]">{item.label}</span><span className="mt-1 block text-xs leading-5 text-[#625B69]">{descriptions[item.id]}</span></span><ChevronRight aria-hidden="true" size={18} className="mt-1 shrink-0 text-[#581C87] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" /></button>; })}</div></div> : null}
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
