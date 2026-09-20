/**
 * Strongly-typed data models for the Marie Louise School Parent Portal.
 * Designed for seamless 1:1 mapping with Airtable tables and linked records.
 */

export type AirtableRecordId = string;

export type Gender = "Male" | "Female";
export type StudentStatus = "Good standing" | "Active" | "Probation" | "Alumni";
export type AttendanceStatus = "Present" | "Late" | "Absent" | "Excused";
export type InvoiceStatus = "Settled" | "Partially Paid" | "Pending" | "Overdue";
export type PaymentStatus = "Verified" | "Processing" | "Failed";
export type AssignmentStatus = "Graded" | "Submitted" | "Pending" | "Overdue";
export type AbsenceReason = "Illness" | "Medical Appointment" | "Family Event" | "Travel" | "Other";
export type AbsenceStatus = "Submitted" | "Approved" | "Under Review" | "Declined";
export type PaymentProofStatus = "Submitted" | "Under Verification" | "Approved" | "Declined";
export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
export type PortalView = "overview" | "reports" | "fees" | "notices";

/**
 * 1. Parent Model (Airtable: Parents)
 */
export interface Parent {
  id: AirtableRecordId;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  admissionIdentity: string; // Identifier used for portal sign-in (e.g. email or MLS-0012)
  relationship: "Mother" | "Father" | "Guardian";
  address?: string;
  pupilLinkIds: AirtableRecordId[]; // Linked record IDs to ParentPupilLinks
  pupilIds: AirtableRecordId[]; // Linked record IDs to Pupils
  createdAt: string;
}

/**
 * 2. Pupil Model (Airtable: Pupils)
 */
export interface Pupil {
  id: AirtableRecordId;
  admissionNumber: string; // e.g. "MLS-P3-042"
  firstName: string;
  lastName: string;
  fullName: string;
  class: string; // e.g. "Primary 3"
  gender: Gender;
  dateOfBirth: string;
  house: string; // e.g. "Blue House"
  classTeacher: string; // e.g. "Mrs A. Adeyemi"
  teacherRole?: string; // e.g. "Primary 3 Lead Teacher"
  status: StudentStatus;
  avatarInitials: string; // e.g. "KC"
  attendanceRate: number; // e.g. 98.2
  currentAverage: number; // e.g. 90.3
  academicTerm: string; // e.g. "First term · 2026/2027 academic session"
  teacherRemarks: string; // Lead teacher's term appraisal
  parentLinkIds: AirtableRecordId[]; // Linked record IDs to ParentPupilLinks
  parentIds: AirtableRecordId[]; // Linked record IDs to Parents
}

/**
 * 3. Parent-Pupil Link Model (Airtable: ParentPupilLinks)
 * Junction table mapping parents to pupils with authorization flags.
 */
export interface ParentPupilLink {
  id: AirtableRecordId;
  parentId: AirtableRecordId;
  pupilId: AirtableRecordId;
  relationshipType: "Mother" | "Father" | "Legal Guardian" | "Authorized Pickup";
  isPrimaryContact: boolean;
  canPickup: boolean;
  emergencyContact: boolean;
}

/**
 * 4. Assignment Model (Airtable: Assignments)
 */
export interface Assignment {
  id: AirtableRecordId;
  pupilId: AirtableRecordId;
  subject: string; // e.g. "Mathematics & problem solving"
  title: string;
  description?: string;
  dueDate: string;
  submittedDate?: string;
  score: number; // e.g. 92
  maxScore: number; // e.g. 100
  grade: string; // e.g. "Distinction", "Excellent"
  status: AssignmentStatus;
  teacherFeedback?: string;
}

/**
 * 5. Attendance Model (Airtable: Attendance)
 */
export interface AttendanceRecord {
  id: AirtableRecordId;
  pupilId: AirtableRecordId;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  timeIn?: string; // e.g. "07:48 AM"
  remarks?: string;
}

/**
 * 6. Invoice Model (Airtable: Invoices)
 */
export interface Invoice {
  id: AirtableRecordId;
  invoiceNumber: string; // e.g. "MLS-INV-2026-01"
  pupilId: AirtableRecordId;
  parentId: AirtableRecordId;
  term: string; // e.g. "First Term 2026/2027"
  academicYear: string; // e.g. "2026/2027"
  title: string; // e.g. "Term 1 Comprehensive School Bill"
  amountDue: number; // in NGN
  amountPaid: number;
  balance: number;
  currency: string; // "NGN"
  dueDate: string;
  issueDate: string;
  status: InvoiceStatus;
}

/**
 * 7. Payment Model (Airtable: Payments)
 */
export interface Payment {
  id: AirtableRecordId;
  receiptNumber: string; // e.g. "MLS-RCP-8921"
  invoiceId: AirtableRecordId;
  pupilId: AirtableRecordId;
  parentId: AirtableRecordId;
  itemDescription: string; // e.g. "Tuition & learning materials"
  amount: number;
  currency: string;
  paymentDate: string; // e.g. "08 Sep 2026"
  paymentMethod: "Bank Transfer" | "Card" | "Direct Debit" | "Cash";
  status: PaymentStatus;
  reference: string;
}

/**
 * 8. Timetable Model (Airtable: Timetables)
 */
export interface TimetableEntry {
  id: AirtableRecordId;
  class: string; // e.g. "Primary 3"
  dayOfWeek: DayOfWeek;
  period: number;
  startTime: string; // e.g. "08:15"
  endTime: string; // e.g. "09:00"
  subject: string;
  teacher: string;
  room?: string;
}

/**
 * 9. Calendar Event Model (Airtable: CalendarEvents)
 */
export interface CalendarEvent {
  id: AirtableRecordId;
  title: string;
  description?: string;
  date: string; // ISO date string
  day: string; // e.g. "23"
  month: string; // e.g. "SEP"
  category: "Academic" | "Sports" | "Arts & Culture" | "School Event" | "Holiday";
  targetClass?: string;
  location?: string;
}

/**
 * 10. Absence Report Model (Airtable: AbsenceReports)
 */
export interface AbsenceReport {
  id: AirtableRecordId;
  pupilId: AirtableRecordId;
  parentId: AirtableRecordId;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: AbsenceReason;
  notes: string;
  status: AbsenceStatus;
  submittedAt: string;
  reviewedBy?: string;
  acknowledgementNote?: string;
}

/**
 * 11. Payment Proof Model (Airtable: PaymentProofs)
 */
export interface PaymentProof {
  id: AirtableRecordId;
  invoiceId: AirtableRecordId;
  pupilId: AirtableRecordId;
  parentId: AirtableRecordId;
  amount: number;
  currency: string;
  paymentDate: string;
  bankName: string;
  referenceNumber: string;
  receiptFileUrl?: string;
  notes?: string;
  status: PaymentProofStatus;
  uploadedAt: string;
}

/**
 * Notice Model (Airtable: Notices)
 */
export interface Notice {
  id: AirtableRecordId;
  category: string;
  title: string;
  date: string;
  copy: string;
  isPriority?: boolean;
  targetAudience?: string;
}

/**
 * Aggregate summary structures returned by the service layer
 */
export interface SubjectGradeSummary {
  subject: string;
  score: number;
  grade: string;
  trend?: "up" | "steady" | "down";
}

export interface ParentDashboardData {
  parent: Parent;
  pupils: Pupil[];
  selectedPupil: Pupil;
  academicProgress: SubjectGradeSummary[];
  calendarEvents: CalendarEvent[];
  notices: Notice[];
  invoices: Invoice[];
  payments: Payment[];
  attendanceRecords: AttendanceRecord[];
  absenceReports: AbsenceReport[];
  paymentProofs: PaymentProof[];
  timetable: TimetableEntry[];
}

export interface CreateAbsenceReportInput {
  pupilId: AirtableRecordId;
  parentId: AirtableRecordId;
  startDate: string;
  endDate: string;
  reason: AbsenceReason;
  notes: string;
}

export interface CreatePaymentProofInput {
  invoiceId: AirtableRecordId;
  pupilId: AirtableRecordId;
  parentId: AirtableRecordId;
  amount: number;
  bankName: string;
  paymentDate: string;
  referenceNumber: string;
  receiptFileUrl?: string;
  notes?: string;
}
