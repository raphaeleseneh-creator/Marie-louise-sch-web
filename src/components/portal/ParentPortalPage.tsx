import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, CreditCard, Eye, EyeOff, FileText, Home, LogOut, Printer, ShieldCheck } from "lucide-react";
import { GoogleSignIn } from "../ui/GoogleSignIn";
import { SchoolLogo } from "../ui/SchoolLogo";
import { schoolConfig } from "../../data/school";
import { checkSchoolService, PortalUnavailable } from "../ui/PortalAvailability";
import { AcademicTermFilter, matchesAcademicTerm } from "../ui/AcademicTerms";

type User = { id: number; full_name: string; role: string; parent_id: number | null; registration_pending?: number | boolean };
type Row = Record<string, string | number | null>;
type Student = Row & { id: number; first_name: string; last_name: string; student_code: string; class_name: string | null };
type Dashboard = { student: Student; attendance: { total_days: number; days_present: number; days_absent: number; other_days: number }; fees: { total_due: number | string; total_paid: number | string }; announcements: Row[] };
type Resource<T> = { data: T | null; error: string };
type Records = { id: string; dashboard: Resource<Dashboard>; results: Resource<Row[]>; attendance: Resource<Row[]>; fees: Resource<Row[]>; payments: Resource<Row[]> };
type View = "overview" | "reports" | "fees" | "notices" | "security";
type PrintDocument = { kind: "report"; student: Student; results: Row[]; attendance: Row[] } | { kind: "receipt"; student: Student; receipt: Row; invoice: string };
const navigation = [
  { id: "overview", label: "Overview", icon: Home }, { id: "reports", label: "Reports & attendance", icon: FileText },
  { id: "fees", label: "Fees & receipts", icon: CreditCard }, { id: "notices", label: "Notices", icon: Bell },
  { id: "security", label: "Change password", icon: ShieldCheck },
] as const;
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#581C87] px-5 text-sm font-bold text-white transition hover:bg-[#29166F] disabled:cursor-wait disabled:opacity-50";
const inputClass = "mt-2 h-12 w-full rounded-lg border border-[#DCD5E1] bg-white px-4 text-sm outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15";
const nameOf = (student: Student) => `${student.first_name} ${student.last_name}`;
const money = (value: Row[string]) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(value ?? 0));
const date = (value: Row[string]) => {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const message = (error: unknown) => error instanceof Error ? error.message : "Unable to reach the school. Please try again.";
class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error || (response.status === 401 ? "Your session has ended. Please sign in again." : "Unable to load school records. Please try again."), response.status);
  if (body === null && response.status !== 204) throw new Error("The school returned an unreadable response. Please try again.");
  return body as T;
}
function parentUser(user: User) {
  if (!user || user.role !== "parent" || (!user.parent_id && !user.registration_pending)) throw new ApiError("This account has no parent portal access. Please contact the school office.", 403);
  return user;
}
function resource<T>(response: PromiseSettledResult<T>, list = false): Resource<T> {
  if (response.status === "rejected") return { data: null, error: message(response.reason) };
  if (list && !Array.isArray(response.value)) return { data: null, error: "The school returned an unreadable records list." };
  return { data: response.value, error: "" };
}

export const ParentPortalPage: React.FC<{ onBackToSchool: () => void }> = ({ onBackToSchool }) => {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [sessionCheck, setSessionCheck] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [children, setChildren] = useState<Student[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenError, setChildrenError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [records, setRecords] = useState<Records | null>(null);
  const [resultTerm, setResultTerm] = useState("");
  const [reload, setReload] = useState(0);
  const [recordReload, setRecordReload] = useState(0);
  const [passwordError, setPasswordError] = useState("");
  const [printDocument, setPrintDocument] = useState<PrintDocument | null>(null);
  const submitting = useRef(false);

  function clearSession() {
    setUser(null); setChildren([]); setStudentId(""); setRecords(null); setPrintDocument(null); setPasswordError(""); setView("overview");
  }
  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setServiceUnavailable(false);
    checkSchoolService(controller.signal).then(() => api<{ user: User }>("/api/auth/me", { signal: controller.signal }))
      .then(({ user: account }) => { if (!controller.signal.aborted) setUser(parentUser(account)); })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (!(reason instanceof ApiError)) setServiceUnavailable(true);
        else if (reason.status >= 500) setServiceUnavailable(true);
        else if (reason.status !== 401) setError(message(reason));
      })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [sessionCheck]);

  useEffect(() => {
    if (!user || user.registration_pending) return;
    const controller = new AbortController();
    setChildrenLoading(true); setChildrenError(""); setChildren([]); setStudentId(""); setRecords(null); setPrintDocument(null);
    api<Student[]>(`/api/parents/${encodeURIComponent(String(user.parent_id))}/children`, { signal: controller.signal })
      .then((rows) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(rows)) throw new Error("The school returned an unreadable children list.");
        setChildren(rows); setStudentId(rows.length ? String(rows[0].id) : "");
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401) { clearSession(); setError(message(reason)); }
        else setChildrenError(message(reason));
      })
      .finally(() => { if (!controller.signal.aborted) setChildrenLoading(false); });
    return () => controller.abort();
  }, [user, reload]);

  useEffect(() => {
    if (!user || user.registration_pending || !studentId) return;
    const controller = new AbortController();
    setRecords(null); setPrintDocument(null);
    const base = `/api/students/${encodeURIComponent(studentId)}`;
    void (async () => {
      const responses = await Promise.allSettled([
        api<Dashboard>(`${base}/dashboard`, { signal: controller.signal }),
        api<Row[]>(`${base}/results`, { signal: controller.signal }),
        api<Row[]>(`${base}/attendance`, { signal: controller.signal }),
        api<Row[]>(`${base}/fees`, { signal: controller.signal }),
        api<Row[]>(`/api/payments?student_id=${encodeURIComponent(studentId)}`, { signal: controller.signal }),
      ] as const);
      if (controller.signal.aborted) return;
      const expired = responses.find((result) => result.status === "rejected" && result.reason instanceof ApiError && result.reason.status === 401);
      if (expired?.status === "rejected") { clearSession(); setError(message(expired.reason)); return; }
      setRecords({ id: studentId, dashboard: resource(responses[0]), results: resource(responses[1], true), attendance: resource(responses[2], true), fees: resource(responses[3], true), payments: resource(responses[4], true) });
    })();
    return () => controller.abort();
  }, [user, studentId, recordReload]);

  useEffect(() => { if (printDocument) window.print(); }, [printDocument]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    submitting.current = true; setBusy(true); setError(""); setLoginNotice("");
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: String(values.get("email") || "").trim(), password: values.get("password") }) });
      const session = await api<{ user: User }>("/api/auth/me");
      setUser(parentUser(session.user)); form.reset();
    } catch (reason) {
      if (reason instanceof TypeError || (reason instanceof ApiError && reason.status >= 500)) setServiceUnavailable(true);
      else setError(message(reason));
    }
    finally { submitting.current = false; setBusy(false); }
  };
  const signOut = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(""); clearSession();
    try { await api("/api/auth/logout", { method: "POST", body: "{}" }); }
    catch (reason) { setError(`Sign out could not be confirmed. ${message(reason)}`); }
    finally { submitting.current = false; setBusy(false); }
  };
  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get("new_password") !== values.get("confirm_password")) {
      setPasswordError("Your new passwords do not match."); return;
    }
    submitting.current = true; setBusy(true); setPasswordError("");
    try {
      await api("/api/auth/password", { method: "POST", body: JSON.stringify({ current_password: values.get("current_password"), new_password: values.get("new_password") }) });
      form.reset(); clearSession(); setLoginNotice("Password changed. Please sign in again with your new password.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) { clearSession(); setError(message(reason)); }
      else setPasswordError(message(reason));
    } finally { submitting.current = false; setBusy(false); }
  };

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#F4F1F7] text-[#29166F]"><p role="status">Checking your session…</p></main>;
  if (user?.registration_pending) return <main className="flex min-h-screen items-center justify-center bg-[#F4F1F7] p-6"><section className="w-full max-w-lg rounded-xl bg-white p-8 text-[#29166F]"><ShieldCheck size={40} /><h1 className="mt-5 text-2xl font-extrabold">Waiting for school approval</h1><p className="mt-4 leading-7">Welcome, {user.full_name}. Your account has been created. The school must verify your guardian record and child links before any pupil information is available.</p><p className="mt-4 text-sm leading-6">Please contact the school office to confirm your details. Each child must be linked by the school. After approval, sign in again.</p><a className="mt-4 inline-block font-bold underline" href={`mailto:${schoolConfig.email}?subject=Parent%20account%20approval`}>Contact the school office</a><div className="mt-6 flex flex-wrap gap-3"><button className={buttonClass} onClick={() => window.location.reload()}>Check approval status</button><button className={buttonClass} onClick={() => void signOut()} disabled={busy}>Sign out</button></div>{error ? <p role="alert" className="mt-4 text-red-700">{error}</p> : null}</section></main>;
  if (!user) return (
    <main className="min-h-[100dvh] bg-white text-[#27232D] lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#29166F] p-12 lg:flex">
        <img src="/images/school/outdoor-learning-circle.jpg" alt="Marie Louise School pupils learning outdoors" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-[#29166F]/85" />
        <div className="relative"><SchoolLogo variant="dark" onClick={onBackToSchool} /></div>
        <div className="relative max-w-lg pb-12"><p className="mb-5 text-xs font-bold uppercase tracking-widest text-[#E9DB3D]">Parent partnership</p><h1 className="text-5xl font-extrabold leading-tight text-white">Every milestone, closer to home.</h1><p className="mt-6 leading-7 text-white/80">Follow your child&apos;s learning, attendance, school notices and fee records from one private space.</p></div>
      </section>
      <section className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-12">
        <div className="lg:hidden"><SchoolLogo onClick={onBackToSchool} /></div><button onClick={onBackToSchool} className="mt-6 inline-flex items-center gap-2 self-start text-sm font-bold text-[#581C87]"><ArrowLeft size={16} />School website</button>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <ShieldCheck className="mb-5 text-[#581C87]" size={40} /><p className="text-xs font-extrabold uppercase tracking-widest text-[#581C87]">Parent portal</p><h2 className="mt-2 text-4xl font-extrabold text-[#29166F]">Welcome back.</h2><p className="mt-3 text-sm leading-6 text-[#625B69]">The school office sets up your first login and gives you your sign-in details. <a className="font-bold text-[#581C87] underline" href={`mailto:${schoolConfig.email}?subject=Parent%20portal%20account%20help`}>Email the school for account or password help</a>.</p>
          {serviceUnavailable ? <PortalUnavailable retry={() => setSessionCheck(value => value + 1)} /> : null}
          <form onSubmit={signIn} className="mt-8 space-y-5" aria-busy={busy} hidden={serviceUnavailable}>
            <label className="block text-sm font-bold">Email address<input name="email" type="email" autoComplete="username" required disabled={busy} className={inputClass} placeholder="parent@email.com" /></label>
            <div><label htmlFor="portal-password" className="text-sm font-bold">Password</label><div className="relative"><input id="portal-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={busy} className={`${inputClass} pr-12`} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute bottom-0 right-1 flex h-12 w-11 items-center justify-center text-[#625B69]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            {loginNotice ? <p role="status" className="text-sm text-emerald-700">{loginNotice}</p> : null}
            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<button disabled={busy} className={`${buttonClass} w-full`}>{busy ? "Please wait…" : "Sign in securely"}</button>
          </form>
          {!serviceUnavailable ? <GoogleSignIn portal="parent" /> : null}
        </div><p className="border-t border-[#E8E2ED] pt-5 text-center text-xs text-[#625B69]">Private access for Marie Louise School families</p>
      </section>
    </main>
  );

  const selected = children.find((child) => String(child.id) === studentId);
  const current = records?.id === studentId ? records : null;
  const filteredResults = current?.results.data?.filter(row => matchesAcademicTerm(row.term_id, resultTerm));
  const dashboard = current?.dashboard.data;
  const retry = () => { setRecords(null); setPrintDocument(null); setRecordReload((value) => value + 1); };
  const invoiceNumber = (receipt: Row) => String(receipt.invoice_number ?? current?.fees.data?.find((invoice) => Number(invoice.id) === Number(receipt.invoice_id))?.invoice_number ?? "—");
  return (
    <main id="parent-portal-root" className="min-h-[100dvh] bg-[#F5F3F7] text-[#27232D]">
      <style>{`@media print { body * { visibility: hidden !important; } #parent-portal-root > header, #parent-portal-root > div { display: none !important; } #parent-portal-print, #parent-portal-print * { visibility: visible !important; } #parent-portal-print { display: block !important; position: absolute; inset: 0; padding: 20px; background: white; color: black; } #parent-portal-print table { font-size: 10px; } #parent-portal-print .overflow-x-auto { overflow: visible; } #parent-portal-print th, #parent-portal-print td { white-space: normal; } #parent-portal-print tr { break-inside: avoid; } }`}</style>
      <header className="border-b border-[#E5DFE9] bg-white px-4 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><SchoolLogo onClick={onBackToSchool} /><div className="flex items-center gap-4"><span className="text-sm font-bold text-[#29166F]">{user.full_name}</span><button onClick={signOut} disabled={busy} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#581C87]"><LogOut size={17} />Sign out</button></div></div></header>
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Parent portal" className="border-b border-[#E5DFE9] bg-white p-4 lg:min-h-[calc(100vh-90px)] lg:border-r"><div className="flex flex-wrap gap-2 lg:flex-col">{navigation.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition ${view === id ? "bg-[#581C87] text-white" : "text-[#625B69] hover:bg-[#F1ECF6]"}`}><Icon size={17} />{label}</button>)}<button onClick={onBackToSchool} className="mt-3 flex min-h-11 items-center gap-3 px-3 text-left text-sm font-bold text-[#625B69]"><ArrowLeft size={17} />School website</button></div></nav>
        <section className="min-w-0 p-4 sm:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#581C87]">Parent portal</p><h1 className="mt-2 text-3xl font-extrabold text-[#29166F]">{navigation.find((item) => item.id === view)?.label}</h1></div>{children.length ? <label className="text-xs font-bold text-[#625B69]">Child<select value={studentId} onChange={(event) => { setStudentId(event.target.value); setPrintDocument(null); }} className={`${inputClass} min-w-48`}>{children.map((child) => <option key={child.id} value={String(child.id)}>{nameOf(child)}{child.class_name ? ` · ${child.class_name}` : ""}</option>)}</select></label> : null}</div>
          {view === "security" ? <form onSubmit={changePassword} className="max-w-md space-y-5" aria-busy={busy}>
            <p className="text-sm leading-6 text-[#625B69]">Choose a password of at least 12 characters. You will need to sign in again after saving.</p>
            <label className="block text-sm font-bold">Current password<input name="current_password" type="password" autoComplete="current-password" required disabled={busy} className={inputClass} /></label>
            <label className="block text-sm font-bold">New password<input name="new_password" type="password" autoComplete="new-password" minLength={12} required disabled={busy} className={inputClass} /></label>
            <label className="block text-sm font-bold">Confirm new password<input name="confirm_password" type="password" autoComplete="new-password" minLength={12} required disabled={busy} className={inputClass} /></label>
            {passwordError ? <p role="alert" className="text-sm text-red-700">{passwordError}</p> : null}
            <button disabled={busy} className={buttonClass}>{busy ? "Saving password…" : "Change password"}</button>
          </form> : childrenLoading ? <p role="status">Loading your children…</p> : childrenError ? <Failure message={childrenError} retry={() => setReload((value) => value + 1)} /> : !children.length ? <Empty message="No children are linked to your account. Please contact the school office." /> : <>
            {selected ? <div className="mb-6 border-l-4 border-[#E9DB3D] pl-4"><h2 className="text-lg font-extrabold text-[#29166F]">{nameOf(selected)}</h2><p className="mt-1 text-sm text-[#625B69]">{selected.class_name || "Class not assigned"} · {selected.student_code}</p></div> : null}
            {!current ? <p role="status" className="py-8">Loading school records…</p> : <>
              <div className="mb-5 flex justify-end"><button onClick={retry} className="text-sm font-bold text-[#581C87]">Refresh records</button></div>
              {view === "overview" || view === "notices" ? current.dashboard.error ? <Failure message={current.dashboard.error} retry={retry} /> : dashboard ? <>
                {view === "overview" ? <><div className="grid gap-5 border-y border-[#E5DFE9] py-6 sm:grid-cols-2"><Summary label="Days present" value={String(dashboard.attendance.days_present ?? 0)} note={`${dashboard.attendance.total_days ?? 0} recorded days`} /><Summary label="Attendance" value={Number(dashboard.attendance.total_days) > 0 ? `${Math.round(Number(dashboard.attendance.days_present ?? 0) / Number(dashboard.attendance.total_days) * 1000) / 10}%` : "No records"} note={`${dashboard.attendance.days_absent ?? 0} absent · ${dashboard.attendance.other_days ?? 0} late or excused`} /><Summary label="Total fees" value={money(dashboard.fees.total_due)} note={`${money(dashboard.fees.total_paid)} paid`} /><Summary label="Outstanding balance" value={money(Math.max(0, Number(dashboard.fees.total_due) - Number(dashboard.fees.total_paid)))} note="Based on saved invoices and payments" /></div><h3 className="mb-4 mt-8 text-lg font-extrabold text-[#29166F]">Latest notices</h3></> : null}
                <Notices notices={dashboard.announcements} />
              </> : null : null}
              {view === "reports" ? <>
                <div className="mb-5 max-w-sm"><AcademicTermFilter value={resultTerm} onChange={setResultTerm} className={inputClass} /></div>
                {current.results.error ? <Failure message={`Results: ${current.results.error}`} retry={retry} /> : null}{current.attendance.error ? <Failure message={`Attendance: ${current.attendance.error}`} retry={retry} /> : null}
                {selected && filteredResults && current.attendance.data && (filteredResults.length > 0 || current.attendance.data.length > 0) ? <button className={buttonClass} onClick={() => setPrintDocument({ kind: "report", student: selected, results: filteredResults, attendance: current.attendance.data! })}><Printer size={16} />Print report</button> : null}
                {filteredResults ? <Results rows={filteredResults} /> : null}{current.attendance.data ? <Attendance rows={current.attendance.data} /> : null}
              </> : null}
              {view === "fees" ? <>
                <h3 className="mb-4 text-lg font-extrabold text-[#29166F]">Invoices</h3>
                {current.fees.error ? <Failure message={current.fees.error} retry={retry} /> : current.fees.data ? <RecordTable headers={["Invoice", "Description", "Due date", "Amount due", "Paid", "Balance", "Status"]} rows={current.fees.data.map((row) => [row.invoice_number, row.description, date(row.due_date), money(row.amount_due), money(row.amount_paid), money(Math.max(0, Number(row.amount_due) - Number(row.amount_paid))), row.status])} empty="No invoices have been issued yet." /> : null}
                <h3 className="mb-4 mt-8 text-lg font-extrabold text-[#29166F]">Payment receipts</h3>
                {current.payments.error ? <Failure message={current.payments.error} retry={retry} /> : current.payments.data ? <RecordTable headers={["Receipt", "Invoice", "Date", "Amount paid", "Method", "Reference", "Print"]} rows={current.payments.data.map((row) => [row.receipt_number, invoiceNumber(row), date(row.payment_date), money(row.amount_paid), row.payment_method, row.reference, <button key={row.id} disabled={!selected} className="inline-flex min-h-11 items-center gap-2 font-bold text-[#581C87]" onClick={() => selected && setPrintDocument({ kind: "receipt", student: selected, receipt: row, invoice: invoiceNumber(row) })}><Printer size={16} />Print<span className="sr-only"> receipt {row.receipt_number}</span></button>])} empty="No payment receipts are available yet." /> : null}
              </> : null}
            </>}
          </>}
        </section>
      </div>
      <section id="parent-portal-print" className="hidden" aria-hidden="true">
        {printDocument ? <><SchoolLogo /><h1 className="mt-6 text-2xl font-extrabold">{printDocument.kind === "report" ? "Student report & attendance" : "Payment receipt"}</h1><p className="mt-3 font-bold">{nameOf(printDocument.student)}</p><p>{printDocument.student.class_name} · {printDocument.student.student_code}</p>{printDocument.kind === "report" ? <><Results rows={printDocument.results} /><Attendance rows={printDocument.attendance} /></> : <dl className="mt-6 space-y-3">{[["Receipt number", printDocument.receipt.receipt_number], ["Invoice", printDocument.invoice], ["Payment date", date(printDocument.receipt.payment_date)], ["Amount paid", money(printDocument.receipt.amount_paid)], ["Payment method", printDocument.receipt.payment_method], ["Reference", printDocument.receipt.reference || "—"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl>}</> : null}
      </section>
    </main>
  );
};

function Empty({ message }: { message: string }) { return <p className="rounded-lg bg-white p-6 text-sm leading-6 text-[#625B69]">{message}</p>; }
function Failure({ message, retry }: { message: string; retry: () => void }) { return <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{message}</p><button onClick={retry} className="mt-3 min-h-10 font-bold underline">Try again</button></div>; }
function Summary({ label, value, note }: { label: string; value: string; note: string }) { return <div><p className="text-sm text-[#625B69]">{label}</p><p className="mt-2 text-3xl font-extrabold text-[#29166F]">{value}</p><p className="mt-2 text-xs text-[#625B69]">{note}</p></div>; }
function Notices({ notices }: { notices: Row[] }) { return notices.length ? <div className="divide-y divide-[#E5DFE9]">{notices.map((notice) => <article key={notice.id} className="py-5 first:pt-0"><p className="text-xs text-[#625B69]">{date(notice.published_at)}</p><h3 className="mt-2 font-extrabold text-[#29166F]">{notice.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#625B69]">{notice.message}</p></article>)}</div> : <Empty message="There are no school notices to show." />; }
function Results({ rows }: { rows: Row[] }) { return <><h3 className="mb-4 mt-6 text-lg font-extrabold text-[#29166F]">Published results</h3><RecordTable headers={["Term", "Subject", "CA 1", "CA 2", "Exam", "Total", "Grade", "Teacher remarks"]} rows={rows.map((row) => [row.term_name, row.subject, row.ca1_score, row.ca2_score, row.exam_score, row.total_score, row.grade, row.teacher_remarks])} empty="No published results are available yet." /></>; }
function Attendance({ rows }: { rows: Row[] }) { return <><h3 className="mb-4 mt-8 text-lg font-extrabold text-[#29166F]">Attendance records</h3><RecordTable headers={["Date", "Status", "Reason"]} rows={rows.map((row) => [date(row.attendance_date), row.status, row.reason])} empty="No attendance records are available yet." /></>; }
function RecordTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <Empty message={empty} />;
  return <div className="overflow-x-auto rounded-lg border border-[#E5DFE9] bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#F1ECF6] text-[#29166F]"><tr>{headers.map((header) => <th key={header} scope="col" className="whitespace-nowrap px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-[#E5DFE9]">{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} className="px-4 py-3 align-top">{cell ?? "—"}</td>)}</tr>)}</tbody></table></div>;
}
