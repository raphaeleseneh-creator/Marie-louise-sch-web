import type {
  Parent,
  Pupil,
  Assignment,
  AttendanceRecord,
  Invoice,
  Payment,
  TimetableEntry,
  CalendarEvent,
  AbsenceReport,
  PaymentProof,
  Notice,
  SubjectGradeSummary,
  ParentDashboardData,
  CreateAbsenceReportInput,
  CreatePaymentProofInput,
} from "../types/portal";

import {
  demoParents,
  demoPupils,
  demoAssignments,
  demoAttendanceRecords,
  demoInvoices,
  demoPayments,
  demoTimetables,
  demoCalendarEvents,
  demoAbsenceReports,
  demoPaymentProofs,
  demoNotices,
} from "../data/portalDemoData";

/**
 * Service Contract for the Parent Portal.
 *
 * Visual components interact ONLY with this interface.
 * When integrating with Airtable, this interface remains unchanged;
 * a server-proxied Airtable implementation can simply swap into `portalService`
 * without touching any UI component.
 *
 * SECURITY NOTE:
 * Airtable Personal Access Tokens (PAT) or API keys must NEVER be placed in client-side code.
 * In production, Airtable queries are handled by a backend proxy/API endpoint (e.g. /api/portal/*)
 * that securely reads tokens from server environment variables and validates session tokens.
 */
export interface ParentPortalService {
  authenticate(
    identity: string,
    password?: string
  ): Promise<{ success: boolean; parent?: Parent; error?: string }>;

  getDashboardData(
    parentId?: string,
    pupilId?: string
  ): Promise<ParentDashboardData>;

  getParent(parentId: string): Promise<Parent | null>;
  getPupilsForParent(parentId: string): Promise<Pupil[]>;
  getPupil(pupilId: string): Promise<Pupil | null>;
  getAssignments(pupilId: string): Promise<Assignment[]>;
  getAttendanceRecords(pupilId: string): Promise<AttendanceRecord[]>;
  getInvoices(pupilId: string): Promise<Invoice[]>;
  getPayments(pupilId: string): Promise<Payment[]>;
  getTimetable(className: string): Promise<TimetableEntry[]>;
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getNotices(): Promise<Notice[]>;
  getAbsenceReports(pupilId: string): Promise<AbsenceReport[]>;
  getPaymentProofs(pupilId: string): Promise<PaymentProof[]>;

  submitAbsenceReport(input: CreateAbsenceReportInput): Promise<AbsenceReport>;
  submitPaymentProof(input: CreatePaymentProofInput): Promise<PaymentProof>;
}

/**
 * Local demo implementation of the Parent Portal Service.
 * Serves strongly-typed records with stable Airtable IDs.
 */
class LocalParentPortalService implements ParentPortalService {
  private parents: Parent[] = [...demoParents];
  private pupils: Pupil[] = [...demoPupils];
  private assignments: Assignment[] = [...demoAssignments];
  private attendanceRecords: AttendanceRecord[] = [...demoAttendanceRecords];
  private invoices: Invoice[] = [...demoInvoices];
  private payments: Payment[] = [...demoPayments];
  private timetables: TimetableEntry[] = [...demoTimetables];
  private calendarEvents: CalendarEvent[] = [...demoCalendarEvents];
  private absenceReports: AbsenceReport[] = [...demoAbsenceReports];
  private paymentProofs: PaymentProof[] = [...demoPaymentProofs];
  private notices: Notice[] = [...demoNotices];

  async authenticate(
    identity: string,
    _password?: string
  ): Promise<{ success: boolean; parent?: Parent; error?: string }> {
    const trimmed = identity.trim().toLowerCase();

    // Check if demo preview mode or valid credentials
    if (!trimmed) {
      return { success: false, error: "Please enter your email or admission number." };
    }

    // Match by email or admission number
    const matchedParent = this.parents.find(
      (p) =>
        p.email.toLowerCase() === trimmed ||
        p.admissionIdentity.toLowerCase() === trimmed
    ) || this.parents[0]; // fallback to primary demo parent for ease of testing

    return {
      success: true,
      parent: matchedParent,
    };
  }

  async getDashboardData(
    parentId?: string,
    pupilId?: string
  ): Promise<ParentDashboardData> {
    const activeParent =
      (parentId ? this.parents.find((p) => p.id === parentId) : null) ||
      this.parents[0];

    const parentPupils = this.pupils.filter((pupil) =>
      pupil.parentIds.includes(activeParent.id)
    );

    const activePupil =
      (pupilId ? parentPupils.find((p) => p.id === pupilId) : null) ||
      parentPupils[0] ||
      this.pupils[0];

    // Compute academic progress from assignments for the selected pupil
    const pupilAssignments = this.assignments.filter(
      (a) => a.pupilId === activePupil.id
    );

    const academicProgress: SubjectGradeSummary[] = pupilAssignments.map((a) => ({
      subject: a.subject,
      score: a.score,
      grade: a.grade,
      trend: "steady",
    }));

    const pupilInvoices = this.invoices.filter(
      (i) => i.pupilId === activePupil.id
    );

    const pupilPayments = this.payments.filter(
      (p) => p.pupilId === activePupil.id
    );

    const pupilAttendance = this.attendanceRecords.filter(
      (att) => att.pupilId === activePupil.id
    );

    const pupilAbsences = this.absenceReports.filter(
      (abs) => abs.pupilId === activePupil.id
    );

    const pupilProofs = this.paymentProofs.filter(
      (prf) => prf.pupilId === activePupil.id
    );

    const pupilTimetable = this.timetables.filter(
      (t) => t.class === activePupil.class
    );

    return {
      parent: activeParent,
      pupils: parentPupils,
      selectedPupil: activePupil,
      academicProgress,
      calendarEvents: [...this.calendarEvents],
      notices: [...this.notices],
      invoices: pupilInvoices,
      payments: pupilPayments,
      attendanceRecords: pupilAttendance,
      absenceReports: pupilAbsences,
      paymentProofs: pupilProofs,
      timetable: pupilTimetable,
    };
  }

  async getParent(parentId: string): Promise<Parent | null> {
    return this.parents.find((p) => p.id === parentId) || null;
  }

  async getPupilsForParent(parentId: string): Promise<Pupil[]> {
    return this.pupils.filter((pupil) => pupil.parentIds.includes(parentId));
  }

  async getPupil(pupilId: string): Promise<Pupil | null> {
    return this.pupils.find((p) => p.id === pupilId) || null;
  }

  async getAssignments(pupilId: string): Promise<Assignment[]> {
    return this.assignments.filter((a) => a.pupilId === pupilId);
  }

  async getAttendanceRecords(pupilId: string): Promise<AttendanceRecord[]> {
    return this.attendanceRecords.filter((a) => a.pupilId === pupilId);
  }

  async getInvoices(pupilId: string): Promise<Invoice[]> {
    return this.invoices.filter((i) => i.pupilId === pupilId);
  }

  async getPayments(pupilId: string): Promise<Payment[]> {
    return this.payments.filter((p) => p.pupilId === pupilId);
  }

  async getTimetable(className: string): Promise<TimetableEntry[]> {
    return this.timetables.filter((t) => t.class === className);
  }

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return [...this.calendarEvents];
  }

  async getNotices(): Promise<Notice[]> {
    return [...this.notices];
  }

  async getAbsenceReports(pupilId: string): Promise<AbsenceReport[]> {
    return this.absenceReports.filter((r) => r.pupilId === pupilId);
  }

  async getPaymentProofs(pupilId: string): Promise<PaymentProof[]> {
    return this.paymentProofs.filter((p) => p.pupilId === pupilId);
  }

  async submitAbsenceReport(input: CreateAbsenceReportInput): Promise<AbsenceReport> {
    const newReport: AbsenceReport = {
      id: `recAbs${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
      pupilId: input.pupilId,
      parentId: input.parentId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      notes: input.notes,
      status: "Submitted",
      submittedAt: new Date().toISOString(),
    };

    this.absenceReports.unshift(newReport);
    return newReport;
  }

  async submitPaymentProof(input: CreatePaymentProofInput): Promise<PaymentProof> {
    const newProof: PaymentProof = {
      id: `recPrf${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
      invoiceId: input.invoiceId,
      pupilId: input.pupilId,
      parentId: input.parentId,
      amount: input.amount,
      currency: "NGN",
      paymentDate: input.paymentDate,
      bankName: input.bankName,
      referenceNumber: input.referenceNumber,
      receiptFileUrl: input.receiptFileUrl,
      notes: input.notes,
      status: "Submitted",
      uploadedAt: new Date().toISOString(),
    };

    this.paymentProofs.unshift(newProof);
    return newProof;
  }
}

/**
 * Single exported service singleton for the Parent Portal.
 * Replace with a server-backed Airtable adapter when backend integration is ready.
 */
export const portalService: ParentPortalService = new LocalParentPortalService();
