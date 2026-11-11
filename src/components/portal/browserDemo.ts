// Browser-only parent portal demo, used when the site is built with `npm run build:demo`.
// The static live site has no API server, so this answers the portal's /api requests in the
// visitor's browser using the fictional families in shared/portal-demo.js. It follows the same
// rules as the real server (generic denials, single-use codes, only Active linked pupils,
// 403 for other families), but nothing here touches real school data or sends email.
import calendar from "../../../schema/academic-calendar.json";
import { DEMO_CLASSES, DEMO_PARENTS, DEMO_PUPILS, SIGN_IN_EXAMPLES, buildDemoRecords, demoTerm } from "../../../shared/portal-demo.js";

export const BROWSER_DEMO = import.meta.env.MODE === "demo";

const GENERIC_SIGN_IN_ERROR = "We couldn't sign you in with those details. Check your email address, Student ID and code, then try again.";
const CODE_TTL_MINUTES = 10, MAX_ATTEMPTS = 5;
const SESSION_KEY = "ml-portal-demo-session";

type Term = { name: string; sessionId: string | null };
const label = (term: Term) => `${term.name} · ${calendar.sessions.find((s) => s.id === term.sessionId)?.name ?? "Session not assigned"}`;
const records = buildDemoRecords(demoTerm(calendar, label));

const classId = (name: string) => DEMO_CLASSES.indexOf(name) + 1;
const pupils = DEMO_PUPILS.map((p, i) => ({ ...p, id: i + 1, class_id: classId(p.cls) }));
const parents = DEMO_PARENTS.map((p, i) => ({ ...p, id: i + 1 }));
const pupilByKey = (key: string) => pupils.find((p) => p.key === key)!;
const results = records.results.map((r, i) => ({ id: i + 1, student_id: pupilByKey(r.pupil).id, publication_status: "published", ...r }));
const attendance = records.attendance.map((a, i) => ({ id: i + 1, student_id: pupilByKey(a.pupil).id, ...a }));
let paymentId = 0;
const invoices = records.invoices.map((inv, i) => ({ ...inv, id: i + 1, student_id: pupilByKey(inv.pupil).id, payments: inv.payments.map((p) => ({ ...p, id: ++paymentId, invoice_id: i + 1 })) }));
const notices = records.notices.map((n, i) => ({ ...n, id: i + 1, class_id: n.cls ? classId(n.cls) : null, student_id: n.pupil ? pupilByKey(n.pupil).id : null }));

// Accounts that exist so far: pre-existing ones, plus any created on first sign-in during this visit.
const accounts = new Set(parents.filter((p) => p.existingAccount).map((p) => p.id));
const challenges = new Map<string, { parentId: number | null; code: string; attempts: number; expires: number }>();

function readSession(): number | null {
  try { const value = Number(sessionStorage.getItem(SESSION_KEY)); return parents.some((p) => p.id === value) ? value : null; } catch { return null; }
}
function writeSession(parentId: number | null) {
  try { if (parentId) sessionStorage.setItem(SESSION_KEY, String(parentId)); else sessionStorage.removeItem(SESSION_KEY); } catch { /* demo still works for this page view */ }
}
const randomDigits = (count: number) => Array.from(crypto.getRandomValues(new Uint32Array(count)), (n) => String(n % 10)).join("");
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (n) => n.toString(16).padStart(2, "0")).join("");
function normalizeUniqueId(value: unknown) {
  if (typeof value !== "string") return "";
  const id = value.normalize("NFKC").trim().toUpperCase().replace(/[‐-―−]/g, "-").replace(/\s+/g, "");
  return /^[A-Z0-9][A-Z0-9-/]{2,49}$/.test(id) ? id : "";
}
const linkedPupils = (parentId: number) => {
  const parent = parents.find((p) => p.id === parentId);
  return parent ? parent.children.map(([key]) => pupilByKey(key)).filter((p) => p.status === "active") : [];
};
const userFor = (parentId: number) => {
  const parent = parents.find((p) => p.id === parentId)!;
  return { id: 1000 + parent.id, full_name: parent.name, role: "parent", parent_id: parent.id };
};
const studentRow = (p: (typeof pupils)[number]) => ({ id: p.id, student_code: p.code, first_name: p.first, last_name: p.last, class_name: p.cls });
const invoiceRow = (inv: (typeof invoices)[number]) => {
  const p = pupils.find((x) => x.id === inv.student_id)!;
  const { payments, pupil: _pupil, ...rest } = inv;
  return { ...rest, student_name: `${p.first} ${p.last}`, amount_paid: payments.reduce((sum, x) => sum + x.amount_paid, 0) };
};

type Reply = { status: number; body: unknown };
const ok = (body: unknown): Reply => ({ status: 200, body });
const error = (status: number, message: string): Reply => ({ status, body: { error: message } });

function handle(path: string, method: string, body: Record<string, unknown>): Reply {
  const url = new URL(path, "https://demo.invalid");
  const route = url.pathname;
  if (route === "/api/health") return ok({ ok: true, database: "demo", portalDemo: true });
  if (route === "/api/demo/sign-in-examples") return ok(SIGN_IN_EXAMPLES);
  if (route === "/api/auth/parent/start" && method === "POST") {
    const address = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return error(400, "Enter a valid email address.");
    const uniqueId = normalizeUniqueId(body.unique_id);
    if (!uniqueId) return error(400, "Enter the unique ID from your child’s enrolment record.");
    const parent = parents.find((p) => p.email === address);
    const pupil = pupils.find((p) => p.code === uniqueId);
    const match = parent && pupil && pupil.status === "active" && parent.children.some(([key]) => key === pupil.key);
    const token = randomToken(), code = randomDigits(6);
    challenges.set(token, { parentId: match ? parent.id : null, code, attempts: 0, expires: Date.now() + CODE_TTL_MINUTES * 60000 });
    return ok({ challenge: token, expires_in_minutes: CODE_TTL_MINUTES, demo: { code: match ? code : null } });
  }
  if (route === "/api/auth/parent/verify" && method === "POST") {
    const entry = challenges.get(String(body.challenge ?? ""));
    const code = String(body.code ?? "").replace(/\s+/g, "");
    if (!entry || entry.expires < Date.now() || entry.attempts >= MAX_ATTEMPTS) { challenges.delete(String(body.challenge ?? "")); return error(401, GENERIC_SIGN_IN_ERROR); }
    entry.attempts += 1;
    if (!entry.parentId || entry.code !== code) return error(401, GENERIC_SIGN_IN_ERROR);
    challenges.delete(String(body.challenge));
    accounts.add(entry.parentId); // first sign-in creates the account automatically
    writeSession(entry.parentId);
    return ok({ user: userFor(entry.parentId) });
  }
  if (route === "/api/auth/logout" && method === "POST") { writeSession(null); return ok({ ok: true }); }

  const parentId = readSession();
  if (!parentId) return error(401, "Please sign in.");
  if (route === "/api/auth/me") return ok({ user: userFor(parentId) });
  const mine = linkedPupils(parentId);
  const children = route.match(/^\/api\/parents\/(\d+)\/children$/);
  if (children) {
    if (Number(children[1]) !== parentId) return error(403, "You can only view your own children.");
    return ok([...mine].sort((a, b) => a.first.localeCompare(b.first)).map(studentRow));
  }
  const studentRoute = route.match(/^\/api\/students\/(\d+)\/(dashboard|results|attendance|fees)$/);
  const studentId = studentRoute ? Number(studentRoute[1]) : route === "/api/payments" ? Number(url.searchParams.get("student_id")) : null;
  if (studentId === null) return error(404, "Endpoint not found.");
  const pupil = mine.find((p) => p.id === studentId);
  if (!pupil) return pupils.some((p) => p.id === studentId) ? error(403, "This student is not linked to your account.") : error(404, "Student not found.");
  const ownInvoices = invoices.filter((inv) => inv.student_id === pupil.id);
  if (route === "/api/payments") {
    return ok(ownInvoices.flatMap((inv) => inv.payments.map((p) => ({ ...p, student_id: pupil.id, invoice_number: inv.invoice_number, description: inv.description, student_name: `${pupil.first} ${pupil.last}` })))
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.id - a.id));
  }
  const kind = studentRoute![2];
  const days = attendance.filter((a) => a.student_id === pupil.id);
  if (kind === "results") return ok(results.filter((r) => r.student_id === pupil.id).sort((a, b) => a.term_name.localeCompare(b.term_name) || a.subject.localeCompare(b.subject)));
  if (kind === "attendance") return ok([...days].sort((a, b) => b.attendance_date.localeCompare(a.attendance_date)));
  if (kind === "fees") return ok(ownInvoices.map(invoiceRow).sort((a, b) => b.id - a.id));
  const visibleNotices = notices.filter((n) => n.is_published && (n.audience === "school" || (n.audience === "class" && n.class_id === pupil.class_id) || (n.audience === "student" && n.student_id === pupil.id)))
    .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
  return ok({
    student: studentRow(pupil),
    attendance: { total_days: days.length, days_present: days.filter((a) => a.status === "present").length, days_absent: days.filter((a) => a.status === "absent").length, other_days: days.filter((a) => a.status === "late" || a.status === "excused").length },
    fees: { total_due: ownInvoices.reduce((sum, inv) => sum + inv.amount_due, 0), total_paid: ownInvoices.reduce((sum, inv) => sum + inv.payments.reduce((s, p) => s + p.amount_paid, 0), 0) },
    announcements: visibleNotices,
  });
}

/** Stands in for fetch() on the demo build. Resolves like a JSON API response. */
export async function demoRequest(path: string, options: RequestInit = {}): Promise<Reply> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  let body: Record<string, unknown> = {};
  try { body = typeof options.body === "string" ? JSON.parse(options.body) : {}; } catch { return error(400, "Send JSON data."); }
  return handle(path, (options.method || "GET").toUpperCase(), body);
}
