// Fictional families for the parent portal demo. Used by BOTH demos:
// - `npm run demo` (server/demo-data.js seeds these into a separate *_demo MySQL database), and
// - `npm run build:demo` (the static site serves them from the visitor's browser; no server).
// Every name, email and ID is invented. Emails use example.com, which cannot receive mail.
// No imports, so this file runs unchanged in Node and in the browser.

export const DEMO_CLASSES = ['Nursery 2', 'Primary 1', 'Primary 3'];

export const DEMO_PUPILS = [
  { key: 'tobi', code: 'ML-2025-101', first: 'Tobi', last: 'Adeyemi', dob: '2018-03-14', cls: 'Primary 3', status: 'active' },
  { key: 'kemi', code: 'ML-2025-102', first: 'Kemi', last: 'Adeyemi', dob: '2020-07-02', cls: 'Primary 1', status: 'active' },
  { key: 'chidi', code: 'ML-2026-103', first: 'Chidi', last: 'Okoro', dob: '2022-01-20', cls: 'Nursery 2', status: 'active', startDate: '2026-10-19' },
  { key: 'zara', code: 'ML-2026-104', first: 'Zara', last: 'Bello', dob: '2020-11-09', cls: 'Primary 1', status: 'pending' },
  { key: 'ifeoma', code: 'ML-2025-105', first: 'Ifeoma', last: 'Eze', dob: '2018-05-30', cls: 'Primary 3', status: 'active' },
];

export const DEMO_PARENTS = [
  // Already had a portal account before Email + Unique ID sign-in existed.
  { key: 'grace', name: 'Grace Adeyemi', email: 'grace.adeyemi@example.com', children: [['tobi', 'Mother'], ['kemi', 'Mother']], existingAccount: true },
  // Newly enrolled: no account until the first sign-in.
  { key: 'daniel', name: 'Daniel Okoro', email: 'daniel.okoro@example.com', children: [['chidi', 'Father']] },
  // Linked to a pupil whose enrolment is still Pending.
  { key: 'funmi', name: 'Funmi Bello', email: 'funmi.bello@example.com', children: [['zara', 'Mother']] },
  // Another family, to show records stay separate.
  { key: 'ngozi', name: 'Ngozi Eze', email: 'ngozi.eze@example.com', children: [['ifeoma', 'Mother']] },
];

export const SIGN_IN_EXAMPLES = [
  { label: 'Existing parent with two children', email: 'grace.adeyemi@example.com', unique_id: 'ML-2025-101', expect: 'Signs in to the account they already had and sees Tobi and Kemi. Kemi’s ID (ML-2025-102) works too.' },
  { label: 'Newly enrolled parent', email: 'daniel.okoro@example.com', unique_id: 'ML-2026-103', expect: 'Has no account yet. One is created automatically on first sign-in, with no staff step. Sees only Chidi.' },
  { label: 'Pupil still Pending', email: 'funmi.bello@example.com', unique_id: 'ML-2026-104', expect: 'Refused with the standard message until the enrolment is marked Active.' },
  { label: 'Email and ID from different families', email: 'grace.adeyemi@example.com', unique_id: 'ML-2025-105', expect: 'Refused with the same standard message. No code is sent.' },
];

const SUBJECTS = ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Creative Arts'];
const BREAK = ['2026-10-26', '2026-10-30'];
const HOLIDAYS = new Set(['2026-10-01']);
const ATTENDANCE_END = '2026-11-06';
const EXCEPTIONS = {
  tobi: { '2026-09-29': ['absent', 'Unwell'], '2026-10-14': ['late', 'Traffic'] },
  kemi: { '2026-09-29': ['absent', 'Unwell'], '2026-10-22': ['excused', 'Family event'] },
  chidi: { '2026-11-04': ['late', null] },
  ifeoma: { '2026-10-07': ['absent', null] },
};
const FEES = {
  tobi: [['Term 1 tuition', 350000, [[350000, '2026-09-10', 'bank_transfer']]], ['Books and learning materials', 45000, [[45000, '2026-09-10', 'cash']]]],
  kemi: [['Term 1 tuition', 350000, [[200000, '2026-09-12', 'bank_transfer']]], ['Books and learning materials', 45000, []]],
  chidi: [['Term 1 tuition (from 19 October)', 300000, []]],
  ifeoma: [['Term 1 tuition', 350000, [[350000, '2026-09-08', 'pos']]], ['Books and learning materials', 45000, [[45000, '2026-09-08', 'pos']]]],
};
const REMARKS = { A: 'Excellent work. Keep it up.', B: 'Very good progress this term.', C: 'Good effort; more practice will help.', D: 'Fair. Needs regular revision.', E: 'Needs support at home and in class.', F: 'Please see the class teacher.' };

function hash(text) { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }
function grade(total) { return total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 45 ? 'D' : total >= 40 ? 'E' : 'F'; }

function schoolDays(from, to) {
  const days = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10), weekday = d.getUTCDay();
    if (weekday === 0 || weekday === 6 || HOLIDAYS.has(iso) || (iso >= BREAK[0] && iso <= BREAK[1])) continue;
    days.push(iso);
  }
  return days;
}

/**
 * Builds every school record for the demo pupils. `term` is { id, name, start } from the school calendar.
 * Records refer to pupils and classes by key/name; callers assign database or in-memory IDs.
 */
export function buildDemoRecords(term) {
  const results = [], attendance = [], invoices = [];
  let invoiceNo = 0, receiptNo = 0;
  for (const p of DEMO_PUPILS.filter((x) => x.status === 'active')) {
    if (!p.startDate) {
      for (const subject of SUBJECTS) {
        const h = hash(p.code + subject), ca1 = 12 + (h % 9), ca2 = 11 + ((h >>> 4) % 10), exam = 30 + ((h >>> 8) % 29), total = ca1 + ca2 + exam, g = grade(total);
        results.push({ pupil: p.key, term_id: term.id, term_name: term.name, subject, ca1_score: ca1, ca2_score: ca2, exam_score: exam, total_score: total, grade: g, teacher_remarks: REMARKS[g] });
      }
    }
    for (const day of schoolDays(p.startDate || term.start, ATTENDANCE_END)) {
      const [status, reason] = EXCEPTIONS[p.key]?.[day] || ['present', null];
      attendance.push({ pupil: p.key, attendance_date: day, status, reason });
    }
    for (const [description, amount, paidList] of FEES[p.key] || []) {
      const paid = paidList.reduce((sum, [value]) => sum + value, 0);
      invoices.push({
        pupil: p.key,
        invoice_number: `INV-DEMO-${String(++invoiceNo).padStart(4, '0')}`,
        description,
        amount_due: amount,
        due_date: p.startDate ? '2026-10-30' : '2026-09-25',
        status: paid >= amount ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid',
        payments: paidList.map(([value, when, method]) => {
          receiptNo += 1;
          return { receipt_number: `RCT-DEMO-${String(receiptNo).padStart(4, '0')}`, amount_paid: value, payment_date: when, payment_method: method, reference: method === 'cash' ? null : `REF-DEMO-${String(receiptNo).padStart(4, '0')}` };
        }),
      });
    }
  }
  const notices = [
    { audience: 'school', cls: null, pupil: null, title: 'Mid-term break', message: 'School closes after lessons on Friday 23 October and resumes on Monday 2 November. Enjoy the break.', published_at: '2026-10-12 09:00:00', is_published: true },
    { audience: 'class', cls: 'Primary 3', pupil: null, title: 'Primary 3 science fair', message: 'Primary 3 pupils will present their science projects on Thursday 19 November. Parents are welcome from 11:00.', published_at: '2026-10-05 08:30:00', is_published: true },
    { audience: 'student', cls: null, pupil: 'chidi', title: 'Welcome to Marie Louise School', message: 'Welcome, Chidi! Your class teacher will share a short settling-in update at the end of the first week.', published_at: '2026-10-19 08:00:00', is_published: true },
    { audience: 'school', cls: null, pupil: null, title: 'Prize-giving day', message: 'Our end-of-term prize-giving day is on Friday 11 December at 10:00 in the main hall.', published_at: '2026-11-03 10:00:00', is_published: true },
    { audience: 'school', cls: null, pupil: null, title: 'Draft: end-of-term timetable', message: 'Unpublished draft. Parents never see this notice.', published_at: null, is_published: false },
  ];
  return { results, attendance, invoices, notices };
}

/** The calendar term the demo uses: the first term assigned to a session (else the first term). */
export function demoTerm(calendar, label) {
  const term = calendar.terms.find((t) => t.sessionId) || calendar.terms[0];
  return { id: term.id, name: label(term), start: term.start };
}
