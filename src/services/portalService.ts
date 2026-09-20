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
  PupilFamilyCard,
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
  toggleAssignmentCompletion(assignmentId: string, completed: boolean): Promise<Assignment>;
  downloadInvoice(invoiceId: string): Promise<{ success: boolean; filename: string; invoice?: Invoice }>;
  downloadReceipt(paymentId: string): Promise<{ success: boolean; filename: string; payment?: Payment }>;
  getAvailableTerms(): Promise<string[]>;
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

    if (!trimmed) {
      return { success: false, error: "Please enter your email or admission number." };
    }

    // Match by email or admission number
    const matchedParent =
      this.parents.find(
        (p) =>
          p.email.toLowerCase() === trimmed ||
          p.admissionIdentity.toLowerCase() === trimmed
      ) || this.parents[0];

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

    const isFamilyView = pupilId === "family";
    const selectedPupil = isFamilyView
      ? null
      : (pupilId ? parentPupils.find((p) => p.id === pupilId) : null) ||
        parentPupils[0] ||
        this.pupils[0];

    const activePupilId = isFamilyView ? "family" : (selectedPupil?.id || parentPupils[0]?.id || "");

    // Build family overview summary cards for each child
    const familyCards: PupilFamilyCard[] = parentPupils.map((pupil) => {
      const pupilInvs = this.invoices.filter((i) => i.pupilId === pupil.id);
      const unpaidBalance = pupilInvs.reduce((acc, inv) => acc + inv.balance, 0);
      const totalBilled = pupilInvs.reduce((acc, inv) => acc + inv.amountDue, 0);
      const totalPaid = pupilInvs.reduce((acc, inv) => acc + inv.amountPaid, 0);

      return {
        pupil,
        attendanceRate: pupil.attendanceRate,
        currentAverage: pupil.currentAverage,
        unpaidBalance,
        invoiceCount: pupilInvs.length,
        totalBilled,
        totalPaid,
      };
    });

    // Assignments & academic progress
    const pupilAssignments = selectedPupil
      ? this.assignments.filter((a) => a.pupilId === selectedPupil.id)
      : this.assignments.filter((a) =>
          parentPupils.some((p) => p.id === a.pupilId)
        );

    const academicProgress: SubjectGradeSummary[] = pupilAssignments
      .filter((a) => a.score !== undefined && a.grade !== undefined)
      .map((a) => ({
        subject: a.subject,
        score: a.score as number,
        grade: a.grade as string,
        trend: "steady",
      }));

    // Invoices and payments
    const pupilInvoices = selectedPupil
      ? this.invoices.filter((i) => i.pupilId === selectedPupil.id)
      : this.invoices.filter((i) =>
          parentPupils.some((p) => p.id === i.pupilId)
        );

    const pupilPayments = selectedPupil
      ? this.payments.filter((payment) => payment.pupilId === selectedPupil.id)
      : this.payments.filter((payment) =>
          parentPupils.some((pupil) => pupil.id === payment.pupilId)
        );

    // Attendance
    const pupilAttendance = selectedPupil
      ? this.attendanceRecords.filter((att) => att.pupilId === selectedPupil.id)
      : this.attendanceRecords.filter((att) =>
          parentPupils.some((p) => p.id === att.pupilId)
        );

    // Absence notices
    const pupilAbsences = selectedPupil
      ? this.absenceReports.filter((abs) => abs.pupilId === selectedPupil.id)
      : this.absenceReports.filter((abs) =>
          parentPupils.some((p) => p.id === abs.pupilId)
        );

    // Payment proofs
    const pupilProofs = selectedPupil
      ? this.paymentProofs.filter((prf) => prf.pupilId === selectedPupil.id)
      : this.paymentProofs.filter((prf) =>
          parentPupils.some((p) => p.id === prf.pupilId)
        );

    // Timetable
    const pupilTimetable = selectedPupil
      ? this.timetables.filter((t) => t.class === selectedPupil.class)
      : this.timetables.filter((t) =>
          parentPupils.some((p) => p.class === t.class)
        );

    return {
      parent: activeParent,
      pupils: parentPupils,
      selectedPupil,
      activePupilId,
      isFamilyView,
      familyCards,
      academicProgress,
      assignments: pupilAssignments,
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

  async toggleAssignmentCompletion(assignmentId: string, completed: boolean): Promise<Assignment> {
    const asg = this.assignments.find((a) => a.id === assignmentId);
    if (!asg) {
      throw new Error(`Assignment with ID ${assignmentId} not found.`);
    }
    asg.status = completed ? "Completed" : "Pending";
    asg.completedByParent = completed;
    if (completed) {
      asg.submittedDate = new Date().toISOString().split("T")[0];
    } else {
      asg.submittedDate = undefined;
    }
    return { ...asg };
  }

  async downloadInvoice(invoiceId: string): Promise<{ success: boolean; filename: string; invoice?: Invoice }> {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      throw new Error(`Invoice with ID ${invoiceId} not found.`);
    }
    // Simulate async network/generation latency
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      success: true,
      filename: `${inv.invoiceNumber}.pdf`,
      invoice: inv,
    };
  }

  async downloadReceipt(paymentId: string): Promise<{ success: boolean; filename: string; payment?: Payment }> {
    const pmt = this.payments.find((p) => p.id === paymentId);
    if (!pmt) {
      throw new Error(`Payment with ID ${paymentId} not found.`);
    }
    // Simulate async network/generation latency
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      success: true,
      filename: `${pmt.receiptNumber}.pdf`,
      payment: pmt,
    };
  }

  async getAvailableTerms(): Promise<string[]> {
    const terms = Array.from(new Set(this.invoices.map((i) => i.term)));
    return terms;
  }
}

/**
 * Single exported service singleton for the Parent Portal.
 * Replace with a server-backed Airtable adapter when backend integration is ready.
 */
export const portalService: ParentPortalService = new LocalParentPortalService();
