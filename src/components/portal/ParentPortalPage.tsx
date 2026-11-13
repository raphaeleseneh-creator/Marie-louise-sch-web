import {fetchSignInRead} from "../../lib/sign-in-service";
import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Bell, CalendarCheck, CreditCard, FileText, Home, LogOut, Mail, Printer, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { LoadingBlock, SkipLink, StatusBadge, humanize } from "../ui/StatusBadge";
import { SchoolLogo } from "../ui/SchoolLogo";
import { schoolConfig } from "../../data/school";
import { checkSchoolService, PortalUnavailable, type SchoolHealth } from "../ui/PortalAvailability";
import { AcademicTermFilter, matchesAcademicTerm } from "../ui/AcademicTerms";

type User = { id: number; full_name: string; role: string; parent_id: number | null; registration_pending?: number | boolean };
type Row = Record<string, string | number | null>;
type Student = Row & { id: number; first_name: string; last_name: string; student_code: string; class_name: string | null };
type Dashboard = { student: Student; attendance: { total_days: number; days_present: number; days_absent: number; other_days: number }; fees: { total_due: number | string; total_paid: number | string }; announcements: Row[] };
type Resource<T> = { data: T | null; error: string };
type Records = { id: string; dashboard: Resource<Dashboard>; results: Resource<Row[]>; attendance: Resource<Row[]>; fees: Resource<Row[]>; payments: Resource<Row[]> };
type View = "overview" | "reports" | "fees" | "notices";
type SignInDetails = { email: string; unique_id: string };
type DemoExample = SignInDetails & { label: string; expect: string };
// Demo mode (npm run demo): the code is shown on screen; null means no email would have been sent.
type DemoOutcome = { code: string | null; email: string };
type PrintDocument = { kind: "report"; student: Student; results: Row[]; attendance: Row[] } | { kind: "receipt"; student: Student; receipt: Row; invoice: string };
const navigation = [
  { id: "overview", label: "Overview", icon: Home }, { id: "reports", label: "Reports & attendance", icon: FileText },
  { id: "fees", label: "Fees & receipts", icon: CreditCard }, { id: "notices", label: "Notices", icon: Bell },
] as const;
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#581C87]";
const buttonClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#581C87] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#29166F] disabled:cursor-wait disabled:opacity-50 ${focusRing}`;
const linkButtonClass = `inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-[#581C87] underline-offset-4 transition hover:bg-[#F1ECF6] hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const inputClass = "mt-2 h-12 w-full rounded-lg border border-[#DCD5E1] bg-white px-4 text-base outline-none transition placeholder:text-[#9A92A3] focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 disabled:bg-[#F8F6FA] sm:text-sm";
const viewIntro: Record<View, string> = {
  overview: "Attendance, fees and the latest notices at a glance.",
  reports: "Published results by term, and every attendance record.",
  fees: "Invoices, balances and printable payment receipts.",
  notices: "Messages from the school, your child's class and teachers.",
};
const nameOf = (student: Student) => `${student.first_name} ${student.last_name}`;
const money = (value: Row[string]) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(value ?? 0));
const date = (value: Row[string]) => {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const message = (error: unknown) => error instanceof Error ? error.message : "Unable to reach the school. Please try again.";
class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
// Portal demo at /parent-portal?demo (or every page in a `npm run build:demo` build): requests are
// answered in the browser with fictional families (browserDemo.ts), never by the school API, so the
// demo cannot reach real records. Its code is downloaded only when the demo is opened.
const DEMO_PATH = "/parent-portal?demo";
const browserDemo = () => import.meta.env.MODE === "demo" || new URLSearchParams(window.location.search).has("demo");
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let status: number, body: { error?: string } | null;
  if (browserDemo()) {
    const { demoRequest } = await import("./browserDemo");
    ({ status, body } = await demoRequest(path, options) as { status: number; body: { error?: string } | null });
  } else {
    const send = path === "/api/auth/me" ? fetchSignInRead : fetch;
    const response = await send(path, { ...options, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json", ...options.headers } });
    status = response.status;
    body = await response.json().catch(() => null);
  }
  if (status < 200 || status >= 300) throw new ApiError(body?.error || (status === 401 ? "Your session has ended. Please sign in again." : "Unable to load school records. Please try again."), status);
  if (body === null && status !== 204) throw new Error("The school returned an unreadable response. Please try again.");
  return body as T;
}
function parentUser(user: User) {
  if (user?.role === "developer" && !user.registration_pending) return user;
  // Parents get access through Email + Unique ID. Accounts never linked by the school (pending) have none.
  if (!user || user.role !== "parent" || !user.parent_id || user.registration_pending) throw new ApiError("This account has no parent portal access. Please contact the school office.", 403);
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
  const [challenge, setChallenge] = useState("");
  const [details, setDetails] = useState<SignInDetails | null>(null);
  const [view, setView] = useState<View>("overview");
  const [children, setChildren] = useState<Student[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenError, setChildrenError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [records, setRecords] = useState<Records | null>(null);
  const [resultTerm, setResultTerm] = useState("");
  const [reload, setReload] = useState(0);
  const [recordReload, setRecordReload] = useState(0);
  const [printDocument, setPrintDocument] = useState<PrintDocument | null>(null);
  const [demoExamples, setDemoExamples] = useState<DemoExample[] | null>(null);
  const [demoOutcome, setDemoOutcome] = useState<DemoOutcome | null>(null);
  const [formKey, setFormKey] = useState(0);
  const submitting = useRef(false);

  function clearSession() {
    setUser(null); setChildren([]); setStudentId(""); setRecords(null); setPrintDocument(null); setView("overview");
  }
  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setServiceUnavailable(false);
    (browserDemo() ? api<SchoolHealth>("/api/health", { signal: controller.signal }) : checkSchoolService(controller.signal)).then((health) => {
      if (health.portalDemo) api<DemoExample[]>("/api/demo/sign-in-examples", { signal: controller.signal }).then((rows) => { if (!controller.signal.aborted && Array.isArray(rows)) setDemoExamples(rows); }).catch(() => undefined);
      else setDemoExamples(null);
      return api<{ user: User }>("/api/auth/me", { signal: controller.signal });
    })
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
    const developer = user.role === "developer";
    const endpoint = developer ? "/api/developer/parent-portal/students" : `/api/parents/${encodeURIComponent(String(user.parent_id))}/children`;
    api<Student[]>(endpoint, { signal: controller.signal })
      .then((rows) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(rows)) throw new Error("The school returned an unreadable children list.");
        setChildren(rows); setStudentId(!developer && rows.length ? String(rows[0].id) : "");
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
      try {
        const data=await api<Omit<Records,"id">>(`${base}/portal-records`,{signal:controller.signal});
        if(controller.signal.aborted)return;
        if(!data||!(["dashboard","results","attendance","fees","payments"] as const).every(key=>data[key]&&typeof data[key].error==="string"))throw new Error("The school returned an unreadable response. Please refresh.");
        setRecords({id:studentId,...data});
      }catch(reason){
        if(controller.signal.aborted)return;
        if(reason instanceof ApiError&&reason.status===401){clearSession();setError(message(reason));return;}
        const failed={data:null,error:message(reason)};setRecords({id:studentId,dashboard:failed,results:failed,attendance:failed,fees:failed,payments:failed});
      }
    })();
    return () => controller.abort();
  }, [user, studentId, recordReload]);

  useEffect(() => { if (printDocument) window.print(); }, [printDocument]);
  useEffect(() => {
    const page = user ? navigation.find((item) => item.id === view)?.label : challenge ? "Enter your code" : "Sign in";
    document.title = `${page} · Parent portal · Marie Louise School`;
  }, [user, view, challenge]);

  const failSignIn = (reason: unknown) => {
    // 503 here means email sign-in is not configured yet; show the server's explanation.
    if (reason instanceof ApiError && reason.status === 503) setError(message(reason));
    else if (reason instanceof TypeError || (reason instanceof ApiError && reason.status >= 500)) setServiceUnavailable(true);
    else setError(message(reason));
  };
  const requestCode = async (next: SignInDetails) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(""); setLoginNotice("");
    try {
      const started = await api<{ challenge: string; expires_in_minutes: number; demo?: { code: string | null } }>("/api/auth/parent/start", { method: "POST", body: JSON.stringify(next) });
      setDetails(next); setChallenge(started.challenge);
      setDemoOutcome(started.demo ? { code: started.demo.code, email: next.email } : null);
      setLoginNotice(`If these details match the school's records, a 6-digit code has been sent to ${next.email}. It expires in ${started.expires_in_minutes} minutes.`);
    } catch (reason) { failSignIn(reason); }
    finally { submitting.current = false; setBusy(false); }
  };
  const startSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void requestCode({ email: String(values.get("email") || "").trim(), unique_id: String(values.get("unique_id") || "").trim() });
  };
  const verifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const code = String(new FormData(form).get("code") || "").replace(/\s+/g, "");
    submitting.current = true; setBusy(true); setError("");
    try {
      await api("/api/auth/parent/verify", { method: "POST", body: JSON.stringify({ challenge, code }) });
      const session = await api<{ user: User }>("/api/auth/me");
      setUser(parentUser(session.user)); setView("overview"); form.reset(); setChallenge(""); setDetails(null); setLoginNotice(""); setDemoOutcome(null);
    } catch (reason) { failSignIn(reason); }
    finally { submitting.current = false; setBusy(false); }
  };
  const changeDetails = () => { setChallenge(""); setError(""); setLoginNotice(""); setDemoOutcome(null); };
  const pickExample = (example: DemoExample) => { changeDetails(); setDetails({ email: example.email, unique_id: example.unique_id }); setFormKey((value) => value + 1); };
  const signOut = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(""); clearSession();
    try { await api("/api/auth/logout", { method: "POST", body: "{}" }); }
    catch (reason) { setError(`Sign out could not be confirmed. ${message(reason)}`); }
    finally { submitting.current = false; setBusy(false); }
  };

  if (checking) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F1F7] p-6 text-[#29166F]"><RefreshCw aria-hidden="true" size={28} className="animate-spin text-[#581C87] motion-reduce:animate-none" /><p role="status" className="text-sm font-bold">Checking your session…</p></main>;
  const errorBox = error ? <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-6 text-red-800"><AlertCircle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />{error}</p> : null;
  if (!user) return (
    <main className="min-h-[100dvh] bg-white text-[#27232D] lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#29166F] p-12 lg:flex">
        <picture><source media="(min-width: 1024px)" srcSet="/images/school/outdoor-learning-circle.jpg"/><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="Marie Louise School pupils learning outdoors" className="absolute inset-0 h-full w-full object-cover" /></picture><div className="absolute inset-0 bg-[#29166F]/85" />
        <div className="relative"><SchoolLogo variant="dark" onClick={onBackToSchool} /></div>
        <div className="relative max-w-lg pb-12"><p className="mb-5 text-xs font-bold uppercase tracking-widest text-[#E9DB3D]">Parent partnership</p><h1 className="text-5xl font-extrabold leading-tight text-white">Every milestone, closer to home.</h1><p className="mt-6 leading-7 text-white/80">Follow your child&apos;s learning, attendance, school notices and fee records from one private space.</p></div>
      </section>
      <section className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-12">
        <div className="lg:hidden"><SchoolLogo onClick={onBackToSchool} /></div><button type="button" onClick={onBackToSchool} className={`${linkButtonClass} mt-4 -ml-2 self-start no-underline`}><ArrowLeft aria-hidden="true" size={16} />School website</button>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <span aria-hidden="true" className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1ECF6] text-[#581C87]">{challenge ? <Mail size={28} /> : <ShieldCheck size={28} />}</span><p className="text-xs font-extrabold uppercase tracking-widest text-[#581C87]">Parent portal · Step {challenge ? "2" : "1"} of 2</p><h2 className="mt-2 text-3xl font-extrabold text-[#29166F] sm:text-4xl">{challenge ? "Check your email." : "Welcome back."}</h2><p className="mt-3 text-sm leading-6 text-[#625B69]">{challenge ? "Enter the 6-digit code we sent to finish signing in. Check your spam folder if it hasn't arrived within a minute." : <>Sign in with the email address the school has on record for you and your child&apos;s Student ID. We&apos;ll email you a one-time code to finish signing in.</>} <a className="font-bold text-[#581C87] underline underline-offset-2" href={`mailto:${schoolConfig.email}?subject=Parent%20portal%20sign-in%20help`}>Get sign-in help</a>.</p>
          {demoExamples ? <p role="note" className="mt-5 rounded-lg bg-[#E9DB3D] px-4 py-3 text-sm font-bold leading-6 text-[#29166F]">Demo: fictional families only. Codes appear on screen instead of being emailed. <a href="/parent-portal" className="underline">Leave demo</a></p> : null}
          {serviceUnavailable ? <PortalUnavailable retry={() => setSessionCheck(value => value + 1)} /> : null}
          {!challenge ? <form key={formKey} onSubmit={startSignIn} className="mt-8 space-y-5" aria-busy={busy} hidden={serviceUnavailable}>
            <label className="block text-sm font-bold">Email<input name="email" type="email" autoComplete="email" required disabled={busy} defaultValue={details?.email} className={inputClass} placeholder="parent@email.com" /></label>
            <label className="block text-sm font-bold">Unique ID<input name="unique_id" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} required maxLength={50} disabled={busy} defaultValue={details?.unique_id} className={`${inputClass} uppercase placeholder:normal-case`} placeholder="e.g. ML-2025-014" aria-describedby="unique-id-help" /><span id="unique-id-help" className="mt-2 block text-xs font-normal leading-5 text-[#625B69]">Your child&apos;s Student ID, as shown on their enrolment record. Any of your children&apos;s IDs will work.</span></label>
            {errorBox}<button disabled={busy} className={`${buttonClass} h-12 w-full`}>{busy ? "Please wait…" : "Email me a sign-in code"}</button>
          </form> : <form onSubmit={verifyCode} className="mt-8 space-y-5" aria-busy={busy} hidden={serviceUnavailable}>
            {loginNotice ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-6 text-emerald-800">{loginNotice}</p> : null}
            {demoOutcome ? <div className="rounded-lg border border-dashed border-[#B7A3CC] bg-[#F7F3FB] p-4 text-sm leading-6 text-[#29166F]"><p className="text-xs font-extrabold uppercase tracking-widest text-[#581C87]">Demo inbox</p>{demoOutcome.code ? <><p className="mt-1">In the live portal this code is emailed to {demoOutcome.email}.</p><p className="mt-2 font-mono text-2xl font-extrabold tracking-[0.3em]">{demoOutcome.code}</p></> : <p className="mt-1">These details don&apos;t match an eligible family, so no email would be sent. The parent sees exactly the same message as above, so the portal never reveals which families exist.</p>}</div> : null}
            <label className="block text-sm font-bold">Sign-in code<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required disabled={busy} autoFocus className={`${inputClass} h-14 text-center font-mono text-2xl tracking-[0.5em] sm:text-2xl`} placeholder="••••••" /></label>
            {errorBox}<button disabled={busy} className={`${buttonClass} h-12 w-full`}>{busy ? "Please wait…" : "Sign in securely"}</button>
            <div className="-mx-2 flex flex-wrap justify-between gap-2"><button type="button" className={linkButtonClass} disabled={busy} onClick={changeDetails}><ArrowLeft aria-hidden="true" size={15} />Use different details</button><button type="button" className={linkButtonClass} disabled={busy || !details} onClick={() => details && void requestCode(details)}><RefreshCw aria-hidden="true" size={15} />Send a new code</button></div>
          </form>}
          {demoExamples && demoExamples.length > 0 && !serviceUnavailable ? <section aria-label="Demo sign-ins" className="mt-8 rounded-lg border border-dashed border-[#B7A3CC] bg-[#F7F3FB] p-4"><p className="text-xs font-extrabold uppercase tracking-widest text-[#581C87]">Demo · fictional families</p><p className="mt-1 text-xs leading-5 text-[#625B69]">Pick an example to fill in the form, then press the button above.</p><ul className="mt-3 space-y-3">{demoExamples.map((example) => <li key={example.label}><button type="button" disabled={busy} onClick={() => pickExample(example)} className={`w-full rounded-md bg-white p-3 text-left text-sm shadow-sm ring-1 ring-[#E5DFE9] transition hover:ring-[#581C87] disabled:opacity-60 ${focusRing}`}><span className="block font-bold text-[#29166F]">{example.label}</span><span className="block font-mono text-xs text-[#625B69]">{example.email} · {example.unique_id}</span><span className="mt-1 block text-xs leading-5 text-[#625B69]">{example.expect}</span></button></li>)}</ul></section> : null}
          {!demoExamples ? <a href={DEMO_PATH} className={`mt-8 block rounded-lg border border-dashed border-[#B7A3CC] bg-[#F7F3FB] p-4 text-sm leading-6 text-[#29166F] transition hover:border-[#581C87] ${focusRing}`}><span className="block font-extrabold">Try the parent portal demo</span><span className="block text-[#625B69]">See how sign-in and the portal work using fictional families. No real records are shown.</span></a> : null}
        </div><p className="border-t border-[#E8E2ED] pt-5 text-center text-xs text-[#625B69]">Private access for Marie Louise School families</p>
      </section>
    </main>
  );

  const selected = children.find((child) => String(child.id) === studentId);
  const developerPreview = user.role === "developer";
  const portalNavigation = navigation;
  const current = records?.id === studentId ? records : null;
  const filteredResults = current?.results.data?.filter(row => matchesAcademicTerm(row.term_id, resultTerm));
  const dashboard = current?.dashboard.data;
  const retry = () => { setRecords(null); setPrintDocument(null); setRecordReload((value) => value + 1); };
  const invoiceNumber = (receipt: Row) => String(receipt.invoice_number ?? current?.fees.data?.find((invoice) => Number(invoice.id) === Number(receipt.invoice_id))?.invoice_number ?? "—");
  return (
    <main id="parent-portal-root" className="min-h-[100dvh] bg-[#F5F3F7] text-[#27232D]">
      <style>{`@media print { body * { visibility: hidden !important; } #parent-portal-root > header, #parent-portal-root > div { display: none !important; } #parent-portal-print, #parent-portal-print * { visibility: visible !important; } #parent-portal-print { display: block !important; position: absolute; inset: 0; padding: 20px; background: white; color: black; } #parent-portal-print table { font-size: 10px; } #parent-portal-print .overflow-x-auto { overflow: visible; } #parent-portal-print th, #parent-portal-print td { white-space: normal; } #parent-portal-print tr { break-inside: avoid; } }`}</style>
      {demoExamples ? <p role="note" className="bg-[#E9DB3D] px-4 py-2 text-center text-xs font-bold text-[#29166F]">Demo portal: every name and record here is fictional. <a href="/parent-portal" className="underline">Leave demo</a></p> : null}
      <SkipLink target="portal-content" />
      <header className="border-b border-[#E5DFE9] bg-white px-4 py-3 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><SchoolLogo onClick={onBackToSchool} /><div className="flex min-w-0 items-center gap-2 sm:gap-4"><span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1ECF6] text-sm font-extrabold text-[#581C87] sm:flex">{user.full_name.trim().charAt(0).toUpperCase() || "?"}</span><span className="hidden truncate text-sm font-bold text-[#29166F] sm:inline">{user.full_name}</span><button type="button" onClick={signOut} disabled={busy} className={`${linkButtonClass} no-underline`}><LogOut aria-hidden="true" size={17} />Sign out</button></div></div></header>
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Parent portal" className="sticky top-0 z-10 min-w-0 border-b border-[#E5DFE9] bg-white/95 backdrop-blur lg:static lg:min-h-[calc(100vh-72px)] lg:border-r lg:p-4"><div className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:p-0">{portalNavigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setView(id)} aria-current={view === id ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-left text-sm font-bold transition ${focusRing} ${view === id ? "bg-[#581C87] text-white shadow-sm" : "text-[#4C4058] hover:bg-[#F1ECF6]"}`}><Icon aria-hidden="true" size={17} className="shrink-0" />{label}</button>)}<button type="button" onClick={onBackToSchool} className={`hidden min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm font-bold text-[#625B69] hover:bg-[#F1ECF6] lg:mt-3 lg:flex ${focusRing}`}><ArrowLeft aria-hidden="true" size={17} />School website</button></div></nav>
        <section id="portal-content" tabIndex={-1} className="min-w-0 p-4 outline-none sm:p-8">
          {developerPreview ? <aside aria-label="Developer preview" className="mb-6 rounded-lg border-l-4 border-[#E9DB3D] bg-[#29166F] p-5 text-white"><h2 className="font-extrabold">Developer preview · Read-only school records</h2><p className="mt-2 text-sm leading-6 text-white/85">Choose a student to inspect the parent-facing reports, attendance, fees and notices. You are signed in as Developer; this does not grant a parent account access to that student.</p><a href="/admin" className="mt-3 inline-flex min-h-11 items-center font-bold text-[#E9DB3D] underline">Back to staff workspace</a></aside> : null}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#581C87]">Parent portal</p><h1 className="mt-2 text-2xl font-extrabold text-[#29166F] sm:text-3xl">{navigation.find((item) => item.id === view)?.label}</h1><p className="mt-1 text-sm text-[#625B69]">{viewIntro[view]}</p></div>{children.length && (developerPreview || children.length > 4) ? <label className="w-full text-xs font-bold text-[#625B69] sm:w-auto">{developerPreview ? "Preview student" : "Child"}<select value={studentId} onChange={(event) => { setStudentId(event.target.value); setPrintDocument(null); }} className={`${inputClass} sm:min-w-56`}>{developerPreview ? <option value="">Choose a student to preview</option> : null}{children.map((child) => <option key={child.id} value={String(child.id)}>{nameOf(child)}{child.class_name ? ` · ${child.class_name}` : ""}</option>)}</select></label> : null}</div>
          {/* A few children: one tap to switch, with every child's name always visible. */}
          {!developerPreview && children.length > 1 && children.length <= 4 ? <div role="group" aria-label="Choose a child" className="mb-6 flex flex-wrap gap-2">{children.map((child) => { const active = String(child.id) === studentId; return <button key={child.id} type="button" aria-pressed={active} onClick={() => { setStudentId(String(child.id)); setPrintDocument(null); }} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${focusRing} ${active ? "border-[#581C87] bg-white shadow-sm ring-1 ring-[#581C87]" : "border-[#E5DFE9] bg-white/60 hover:border-[#B7A3CC] hover:bg-white"}`}><span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${active ? "bg-[#581C87] text-white" : "bg-[#F1ECF6] text-[#581C87]"}`}>{child.first_name.charAt(0)}</span><span><span className="block text-sm font-bold text-[#29166F]">{child.first_name}</span><span className="block text-xs text-[#625B69]">{child.class_name || "Class not assigned"}</span></span></button>; })}</div> : null}
          {childrenLoading ? <LoadingBlock label={developerPreview ? "Loading students for preview…" : "Loading your children…"} rows={2} /> : childrenError ? <Failure message={childrenError} retry={() => setReload((value) => value + 1)} /> : !children.length ? <Empty message={developerPreview ? "No active students are available to preview." : "No children are linked to your account yet. Please contact the school office and they will link your child's record."} /> : !studentId ? <Empty message="Choose a student above to preview their parent portal." /> : <>
            {selected ? <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5DFE9] border-l-4 border-l-[#E9DB3D] bg-white px-4 py-3"><div><h2 className="text-lg font-extrabold text-[#29166F]">{nameOf(selected)}</h2><p className="mt-0.5 text-sm text-[#625B69]">{selected.class_name || "Class not assigned"} · <span className="whitespace-nowrap font-mono text-xs">{selected.student_code}</span></p></div>{current ? <button type="button" onClick={retry} className={`${linkButtonClass} no-underline`}><RefreshCw aria-hidden="true" size={15} />Refresh</button> : null}</div> : null}
            {!current ? <LoadingBlock label="Loading school records…" /> : <>
              {view === "overview" || view === "notices" ? current.dashboard.error ? <Failure message={current.dashboard.error} retry={retry} /> : dashboard ? <>
                {view === "overview" ? (() => {
                  const total = Number(dashboard.attendance.total_days ?? 0), present = Number(dashboard.attendance.days_present ?? 0);
                  const balance = Math.max(0, Number(dashboard.fees.total_due) - Number(dashboard.fees.total_paid));
                  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Summary icon={CalendarCheck} label="Attendance" value={total > 0 ? `${Math.round(present / total * 1000) / 10}%` : "No records"} note={`${present} of ${total} days present`} />
                    <Summary icon={AlertCircle} label="Absent or late" value={String(Number(dashboard.attendance.days_absent ?? 0) + Number(dashboard.attendance.other_days ?? 0))} note={`${dashboard.attendance.days_absent ?? 0} absent · ${dashboard.attendance.other_days ?? 0} late or excused`} />
                    <Summary icon={CreditCard} label="Total fees" value={money(dashboard.fees.total_due)} note={`${money(dashboard.fees.total_paid)} paid so far`} />
                    <Summary icon={Wallet} label="Outstanding balance" value={money(balance)} note={balance > 0 ? "See Fees & receipts for details" : "Fully paid. Thank you!"} tone={balance > 0 ? "warning" : "success"} action={balance > 0 ? () => setView("fees") : undefined} />
                  </div><h3 className="mb-4 mt-8 text-lg font-extrabold text-[#29166F]">Latest notices</h3></>;
                })() : null}
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
                {current.fees.error ? <Failure message={current.fees.error} retry={retry} /> : current.fees.data ? <RecordTable numeric={[3, 4, 5]} headers={["Invoice", "Description", "Due date", "Amount due", "Paid", "Balance", "Status"]} rows={current.fees.data.map((row) => [<span key="n" className="whitespace-nowrap font-mono text-xs">{row.invoice_number}</span>, row.description, date(row.due_date), money(row.amount_due), money(row.amount_paid), <strong key="b">{money(Math.max(0, Number(row.amount_due) - Number(row.amount_paid)))}</strong>, <StatusBadge key="s" value={row.status} fallback="unpaid" />])} empty="No invoices have been issued yet." /> : null}
                <h3 className="mb-4 mt-8 text-lg font-extrabold text-[#29166F]">Payment receipts</h3>
                {current.payments.error ? <Failure message={current.payments.error} retry={retry} /> : current.payments.data ? <RecordTable numeric={[3]} headers={["Receipt", "Invoice", "Date", "Amount paid", "Method", "Reference", "Print"]} rows={current.payments.data.map((row) => [<span key="r" className="whitespace-nowrap font-mono text-xs">{row.receipt_number}</span>, <span key="i" className="whitespace-nowrap font-mono text-xs">{invoiceNumber(row)}</span>, date(row.payment_date), money(row.amount_paid), humanize(row.payment_method), row.reference, <button key={row.id} type="button" disabled={!selected} className={`${linkButtonClass} -my-2 no-underline`} onClick={() => selected && setPrintDocument({ kind: "receipt", student: selected, receipt: row, invoice: invoiceNumber(row) })}><Printer size={16} />Print<span className="sr-only"> receipt {row.receipt_number}</span></button>])} empty="No payment receipts are available yet." /> : null}
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

function Empty({ message }: { message: string }) { return <div className="rounded-xl border border-dashed border-[#DCD5E1] bg-white px-6 py-8 text-center"><FileText aria-hidden="true" size={24} className="mx-auto mb-2 text-[#B7A3CC]" /><p className="mx-auto max-w-md text-sm leading-6 text-[#625B69]">{message}</p></div>; }
function Failure({ message, retry }: { message: string; retry: () => void }) { return <div role="alert" className="my-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle aria-hidden="true" size={18} className="mt-0.5 shrink-0" /><div><p className="leading-6">{message}</p><button type="button" onClick={retry} className="mt-2 min-h-11 font-bold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-red-800">Try again</button></div></div>; }
const summaryTones = { neutral: "border-[#E5DFE9] bg-white", warning: "border-[#F4D98F] bg-[#FFFBEF]", success: "border-[#BFE5D1] bg-[#F3FBF7]" };
function Summary({ icon: Icon, label, value, note, tone = "neutral", action }: { icon: React.ElementType; label: string; value: string; note: string; tone?: keyof typeof summaryTones; action?: () => void }) {
  return <div className={`flex flex-col rounded-xl border p-5 shadow-[0_1px_2px_rgba(41,22,111,0.04)] ${summaryTones[tone]}`}>
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-[#625B69]">{label}</p><span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1ECF6] text-[#581C87]"><Icon size={18} /></span></div>
    <p className="mt-3 text-2xl font-extrabold tabular-nums text-[#29166F] sm:text-3xl">{value}</p>
    <p className="mt-1 text-xs leading-5 text-[#625B69]">{note}</p>
    {action ? <button type="button" onClick={action} className={`${linkButtonClass} -mx-2 mt-2 self-start`}>View fees</button> : null}
  </div>;
}
function Notices({ notices }: { notices: Row[] }) { return notices.length ? <div className="space-y-3">{notices.map((notice) => <article key={notice.id} className="rounded-xl border border-[#E5DFE9] bg-white p-5"><p className="text-xs font-bold text-[#625B69]"><time dateTime={String(notice.published_at ?? "")}>{date(notice.published_at)}</time></p><h3 className="mt-1.5 font-extrabold text-[#29166F]">{notice.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4C4058]">{notice.message}</p></article>)}</div> : <Empty message="There are no school notices to show." />; }
function Results({ rows }: { rows: Row[] }) { return <><h3 className="mb-4 mt-6 text-lg font-extrabold text-[#29166F]">Published results</h3><RecordTable numeric={[2, 3, 4, 5]} headers={["Term", "Subject", "CA 1", "CA 2", "Exam", "Total", "Grade", "Teacher remarks"]} rows={rows.map((row) => [row.term_name, <strong key="s" className="text-[#29166F]">{row.subject}</strong>, row.ca1_score, row.ca2_score, row.exam_score, <strong key="t">{row.total_score}</strong>, row.grade ? <span key="g" className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-[#F1ECF6] px-1.5 font-extrabold text-[#29166F]">{row.grade}</span> : null, <span key="r" className="block min-w-48">{row.teacher_remarks}</span>])} empty="No published results are available for this term yet." /></>; }
function Attendance({ rows }: { rows: Row[] }) { return <><h3 className="mb-4 mt-8 text-lg font-extrabold text-[#29166F]">Attendance records</h3><RecordTable headers={["Date", "Status", "Reason"]} rows={rows.map((row) => [date(row.attendance_date), <StatusBadge key="s" value={row.status} fallback="present" />, row.reason])} empty="No attendance records are available yet." /></>; }
function RecordTable({ headers, rows, empty, numeric = [] }: { headers: string[]; rows: React.ReactNode[][]; empty: string; numeric?: number[] }) {
  if (!rows.length) return <Empty message={empty} />;
  const align = (column: number) => numeric.includes(column) ? "text-right" : "";
  return <div className="overflow-x-auto rounded-xl border border-[#E5DFE9] bg-white shadow-[0_1px_2px_rgba(41,22,111,0.04)]"><table className="w-full text-left text-sm tabular-nums"><thead className="bg-[#F8F6FA] text-xs uppercase tracking-wide text-[#625B69]"><tr>{headers.map((header, column) => <th key={header} scope="col" className={`whitespace-nowrap px-4 py-3 font-bold ${align(column)}`}>{header}</th>)}</tr></thead><tbody className="divide-y divide-[#EEE9F1]">{rows.map((row, index) => <tr key={index} className="transition-colors hover:bg-[#FCFAFE]">{row.map((cell, column) => <td key={column} className={`px-4 py-3 align-top ${align(column)} ${numeric.includes(column) ? "whitespace-nowrap" : ""}`}>{cell ?? "—"}</td>)}</tr>)}</tbody></table></div>;
}
