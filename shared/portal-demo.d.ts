// Types for portal-demo.js (fictional demo families shared by the server and browser demos).
export type DemoPupil = { key: string; code: string; first: string; last: string; dob: string; cls: string; status: 'active' | 'pending' | 'inactive'; startDate?: string };
export type DemoParent = { key: string; name: string; email: string; children: [string, string][]; existingAccount?: boolean };
export type DemoExample = { label: string; email: string; unique_id: string; expect: string };
export type DemoPayment = { receipt_number: string; amount_paid: number; payment_date: string; payment_method: string; reference: string | null };
export type DemoRecords = {
  results: { pupil: string; term_id: string; term_name: string; subject: string; ca1_score: number; ca2_score: number; exam_score: number; total_score: number; grade: string; teacher_remarks: string }[];
  attendance: { pupil: string; attendance_date: string; status: 'present' | 'absent' | 'late' | 'excused'; reason: string | null }[];
  invoices: { pupil: string; invoice_number: string; description: string; amount_due: number; due_date: string; status: 'unpaid' | 'partially_paid' | 'paid'; payments: DemoPayment[] }[];
  notices: { audience: 'school' | 'class' | 'student'; cls: string | null; pupil: string | null; title: string; message: string; published_at: string | null; is_published: boolean }[];
};
export type DemoTerm = { id: string; name: string; start: string };
type CalendarTerm = { id: string; name: string; sessionId: string | null; start: string };

export const DEMO_CLASSES: string[];
export const DEMO_PUPILS: DemoPupil[];
export const DEMO_PARENTS: DemoParent[];
export const SIGN_IN_EXAMPLES: DemoExample[];
export function buildDemoRecords(term: DemoTerm): DemoRecords;
export function demoTerm<T extends CalendarTerm>(calendar: { terms: T[] }, label: (term: T) => string): DemoTerm;
