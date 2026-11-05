import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from '../app.js';
import { pool } from '../db.js';
import { hashPassword } from '../auth.js';
import { migrate } from '../migrate.js';
import { runAirtableImport } from '../import-airtable.js';

const runDbTests = process.env.RUN_DB_TESTS === '1';

function createAnonymizedFixtureDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mls-airtable-fixture-'));

  const writeJsonWithBom = (fileName, data) => {
    fs.writeFileSync(path.join(dir, fileName), `\uFEFF${JSON.stringify(data, null, 2)}`, 'utf8');
  };

  // Academic Session: 1 valid session + 1 blank row
  writeJsonWithBom('Academic Session.json', [
    {
      id: 'recSessValid00001',
      fields: {
        'Session Code': '2025-26',
        'Session Name': '2025/2026 Academic Year',
        Academic_Year: '2025/2026',
        Status: 'Active',
      },
    },
    {
      id: 'recSessBlank00002',
      fields: {
        'Session Code': '-',
      },
    },
  ]);

  // Terms: 1 valid term linked to valid session
  writeJsonWithBom('Terms.json', [
    {
      id: 'reccR4ZBVMQoLeZbn',
      fields: {
        Terms: '2025/2026 Academic Year - Term 1',
        Term: 'Term 1',
        Term_Name: 'Term 1',
        'Term Code': 'T1',
        'Academic Session': ['recSessValid00001'],
        'Academic Session (from Academic Session)': ['2025/2026 Academic Year'],
      },
    },
  ]);

  // Classes: 2 valid classes + 2 malformed/ambiguous classes
  writeJsonWithBom('Classes.json', [
    {
      id: 'recClassValid0001',
      fields: {
        Classes: 'Fixture Primary 1 (2025/26)',
        'Class Name': 'Fixture Primary 1',
        'Class Code': 'P1',
        'Academic Year': '2025/26',
      },
    },
    {
      id: 'recClassValid0002',
      fields: {
        Classes: 'Fixture Primary 2 (2025/26)',
        'Class Name': 'Fixture Primary 2',
        'Class Code': 'P2',
        'Academic Year': '2025/26',
      },
    },
    {
      id: 'recClassBadFee003',
      fields: {
        'Class Name': 'Fixture Primary 1',
        'Class Code': 'P1',
        'Academic Year': 'Term 1 Fees',
      },
    },
    {
      id: 'recClassBadUrl004',
      fields: {
        Classes: 'https://airtable.com/appExample/tblExample',
      },
    },
  ]);

  // Students: 3 valid students + 1 student missing Student Class link
  writeJsonWithBom('Students.json', [
    {
      id: 'recStudValid00001',
      fields: {
        StudentIDCode: 'FX-2026-901',
        First_Name: 'AnonFirstOne',
        Last_Name: 'SharedSurname',
        Gender: 'Female',
        Date_of_Birth: '2018-04-10',
        Current_Class: 'P1',
        'Student Class': ['recClassValid0001'],
        Parents: ['recParValid000001'],
        Enrollment_Status: 'Active',
      },
    },
    {
      id: 'recStudValid00002',
      fields: {
        StudentIDCode: 'FX-2026-902',
        First_Name: 'AnonFirstTwo',
        Last_Name: 'AnonLastTwo',
        Gender: 'Male',
        Date_of_Birth: '2017-09-15',
        Current_Class: 'P2',
        'Student Class': ['recClassValid0002'],
        Parents: ['recParValid000002'],
        Enrollment_Status: 'Active',
      },
    },
    {
      // Shares surname, class, and parent email text with Parent 1, but has NO verified link!
      id: 'recStudUnlinked03',
      fields: {
        StudentIDCode: 'FX-2026-903',
        First_Name: 'AnonFirstThree',
        Last_Name: 'SharedSurname',
        Gender: 'Female',
        Current_Class: 'P1',
        'Student Class': ['recClassValid0001'],
        Parent_Guardian: 'Guardian Alpha',
        Parent_Email: 'guardian.alpha.fixture@example.test',
      },
    },
    {
      // Missing Student Class link (only text Current_Class)
      id: 'recStudNoClass004',
      fields: {
        StudentIDCode: 'FX-2026-904',
        First_Name: 'AnonNoClass',
        Last_Name: 'Student',
        Current_Class: 'P1',
        Enrollment_Status: 'Pending',
      },
    },
  ]);

  // Parents:
  // - 2 valid parents with unique emails and explicit bidirectional links
  // - 1 parent with missing email and only email-lookup link (ParentEmail_Student)
  // - 2 parents sharing a duplicate email address
  writeJsonWithBom('Parents.json', [
    {
      id: 'recParValid000001',
      fields: {
        'Parent Name': 'Guardian Alpha',
        ParentEmail: 'guardian.alpha.fixture@example.test',
        Phone_Number: '08000000901',
        Relationship: 'Mother',
        Students: ['recStudValid00001'],
        // Also has an email-derived lookup pointing to Student 3 which MUST be rejected!
        ParentEmail_Student: ['recStudUnlinked03'],
      },
    },
    {
      id: 'recParValid000002',
      fields: {
        'Parent Name': 'Guardian Beta',
        ParentEmail: 'guardian.beta.fixture@example.test',
        Phone_Number: '08000000902',
        Relationship: 'Father',
        // recStudValid00001 is unilateral (not linked back to Beta on Student 1), so Beta->Student1 must be flagged!
        Students: ['recStudValid00002', 'recStudValid00001'],
      },
    },
    {
      id: 'recParNoEmail0003',
      fields: {
        'Parent Name': 'Guardian NoEmail',
        ParentEmail_Student: ['recStudUnlinked03'],
      },
    },
    {
      id: 'recParDupEmail004',
      fields: {
        'Parent Name': 'Guardian Dup One',
        ParentEmail: 'duplicate.fixture@example.test',
        Relationship: 'Parent',
        Students: ['recStudValid00001'],
      },
    },
    {
      id: 'recParDupEmail005',
      fields: {
        'Parent Name': 'Guardian Dup Two',
        ParentEmail: 'duplicate.fixture@example.test',
        Relationship: 'Parent',
        Students: ['recStudValid00002'],
      },
    },
  ]);

  // Academic Results:
  // - 1 valid published result for Student 1
  // - 1 valid draft result for Student 1
  // - 1 valid published result for Student 2
  // - 1 invalid score (>100)
  // - 1 ambiguous publication status (Approved: null, Published: null, Status: null)
  // - 1 blank record
  writeJsonWithBom('Academic Results.json', [
    {
      id: 'recResValidPub001',
      fields: {
        Student_Link: ['recStudValid00001'],
        Term: 'Term 1',
        Term_Main: ['reccR4ZBVMQoLeZbn'],
        Session: '2025/2026',
        Subject: 'Mathematics',
        'CA1 (20%)': 18,
        'CA2 (20%)': 17,
        'Exam (60%)': 52,
        'Total Score': 87,
        Grade: 'A',
        'Teacher Remarks': 'Excellent fixture work.',
        Approved: true,
        Published: true,
        Status: 'Published',
      },
    },
    {
      id: 'recResValidDrf002',
      fields: {
        Student_Link: ['recStudValid00001'],
        Term: 'Term 1',
        Term_Main: ['reccR4ZBVMQoLeZbn'],
        Session: '2025/2026',
        Subject: 'Civic Education',
        'CA1 (20%)': 14,
        'CA2 (20%)': 15,
        'Exam (60%)': 40,
        'Total Score': 69,
        Grade: 'B',
        Approved: false,
        Published: false,
        Status: 'Draft',
      },
    },
    {
      id: 'recResValidPub003',
      fields: {
        Student_Link: ['recStudValid00002'],
        Term: 'Term 1',
        Term_Main: ['reccR4ZBVMQoLeZbn'],
        Session: '2025/2026',
        Subject: 'English Studies',
        'CA1 (20%)': 16,
        'CA2 (20%)': 16,
        'Exam (60%)': 48,
        'Total Score': 80,
        Grade: 'A',
        Approved: true,
        Published: true,
        Status: 'Published',
      },
    },
    {
      id: 'recResOverScore04',
      fields: {
        Student_Link: ['recStudValid00001'],
        Term: 'Term 1',
        Term_Main: ['reccR4ZBVMQoLeZbn'],
        Session: '2025/2026',
        Subject: 'Basic Science',
        'CA1 (20%)': 60,
        'CA2 (20%)': 79,
        'Exam (60%)': 89,
        'Total Score': 228,
        Approved: true,
        Published: true,
      },
    },
    {
      id: 'recResAmbigPub005',
      fields: {
        Student_Link: ['recStudValid00002'],
        Term: 'Term 1',
        Term_Main: ['reccR4ZBVMQoLeZbn'],
        Session: '2025/2026',
        Subject: 'Fine Art',
        'CA1 (20%)': 15,
        'CA2 (20%)': 15,
        'Exam (60%)': 45,
        'Total Score': 75,
      },
    },
    {
      id: 'recResBlank000006',
      fields: {
        'Total Score': 0,
      },
    },
  ]);

  // Attendance:
  // - 1 valid row for Student 1
  // - 1 valid row for Student 2
  // - 2 duplicate (student, date) rows for Student 1
  // - 1 unlinked attendance row
  writeJsonWithBom('Attendance.json', [
    {
      id: 'recAttValid000001',
      fields: {
        Student_Link: ['recStudValid00001'],
        Date: '2026-02-10',
        Attendance_Status: 'Present',
        Term: 'Term 1',
      },
    },
    {
      id: 'recAttValid000002',
      fields: {
        Student_Link: ['recStudValid00002'],
        Date: '2026-02-10',
        Attendance_Status: 'Late',
        Term: 'Term 1',
      },
    },
    {
      id: 'recAttDupDate0003',
      fields: {
        Student_Link: ['recStudValid00001'],
        Date: '2026-02-11',
        Attendance_Status: 'Present',
      },
    },
    {
      id: 'recAttDupDate0004',
      fields: {
        Student_Link: ['recStudValid00001'],
        Date: '2026-02-11',
        Attendance_Status: 'Absent',
      },
    },
    {
      id: 'recAttNoStud00005',
      fields: {
        Date: '2026-02-12',
        Attendance_Status: 'Present',
      },
    },
  ]);

  // Fees:
  // - 1 valid invoice for Student 1
  // - 1 valid invoice for Student 2
  // - 1 class-template fee with no student
  // - 1 multi-student fee linked to 2 students
  writeJsonWithBom('Fees.json', [
    {
      id: 'recFeeValid000001',
      fields: {
        Fee_ID: 'Term 1 Fees',
        Term: 'Term 1',
        Target_class: 'P1',
        Amount_Billed: 50000,
        Due_Date: '2026-01-31',
        Students: ['recStudValid00001'],
        Payments: ['recPayValid000001'],
      },
    },
    {
      id: 'recFeeValid000002',
      fields: {
        Fee_ID: 'Term 1 Fees',
        Term: 'Term 1',
        Target_class: 'P2',
        Amount_Billed: 60000,
        Due_Date: '2026-01-31',
        Students: ['recStudValid00002'],
        Payments: ['recPayValid000002'],
      },
    },
    {
      id: 'recFeeTemplate003',
      fields: {
        Fee_ID: 'Term 1 Fees',
        Term: 'Term 1',
        Target_class: 'P1',
        Amount_Billed: 50000,
        Students: [],
      },
    },
    {
      id: 'recFeeMultiStud04',
      fields: {
        Fee_ID: 'Term 1 Fees',
        Term: 'Term 1',
        Target_class: 'P1',
        Amount_Billed: 50000,
        Students: ['recStudValid00001', 'recStudValid00002'],
      },
    },
  ]);

  // Payments:
  // - 1 valid payment for Student 1 -> Invoice 1
  // - 1 valid payment for Student 2 -> Invoice 2
  // - 1 cross-student payment (Student 2 linked to Student 1's Invoice 1)
  // - 1 payment with no Fees_Link
  writeJsonWithBom('Payments.json', [
    {
      id: 'recPayValid000001',
      fields: {
        Student_Link: ['recStudValid00001'],
        Fees_Link: ['recFeeValid000001'],
        Official_Receipt_Number: 'FX-RCP-9001',
        Amount_Paid: 30000,
        Payment_Date: '2026-01-15',
        Payment_Method: 'Bank Transfer',
      },
    },
    {
      id: 'recPayValid000002',
      fields: {
        Student_Link: ['recStudValid00002'],
        Fees_Link: ['recFeeValid000002'],
        Official_Receipt_Number: 'FX-RCP-9002',
        Amount_Paid: 60000,
        Payment_Date: '2026-01-16',
        Payment_Method: 'POS',
      },
    },
    {
      id: 'recPayCrossStud03',
      fields: {
        Student_Link: ['recStudValid00002'],
        Fees_Link: ['recFeeValid000001'],
        Official_Receipt_Number: 'FX-RCP-9003',
        Amount_Paid: 10000,
        Payment_Date: '2026-01-17',
        Payment_Method: 'Cash',
      },
    },
    {
      id: 'recPayNoInvoice04',
      fields: {
        Student_Link: ['recStudValid00001'],
        Fees_Link: [],
        Official_Receipt_Number: 'FX-RCP-9004',
        Amount_Paid: 5000,
        Payment_Date: '2026-01-18',
        Payment_Method: 'Cash',
      },
    },
  ]);

  return dir;
}

async function startServer() {
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function request(baseUrl, route, { method = 'GET', cookie, body } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, response };
}

test(
  'Airtable importer dry-run, idempotency, validation, and strict parent portal isolation',
  { skip: !runDbTests },
  async () => {
    await migrate();
    const fixtureDir = createAnonymizedFixtureDir();
    const { server, baseUrl } = await startServer();

    try {
      const [[beforeStudents]] = await pool.query('SELECT COUNT(*) AS count FROM students');
      const [[beforeAccounts]] = await pool.query('SELECT COUNT(*) AS count FROM accounts');

      // 1. DRY-RUN BY DEFAULT: verify zero database writes and exact validation/issue counts
      const dryRunReport = await runAirtableImport({ sourceDir: fixtureDir });
      assert.equal(dryRunReport.mode, 'dry-run');

      const [[afterDryRunStudents]] = await pool.query('SELECT COUNT(*) AS count FROM students');
      assert.equal(afterDryRunStudents.count, beforeStudents.count, 'Dry-run must not insert rows');

      assert.equal(dryRunReport.tables.classes.toInsert, 2);
      assert.equal(dryRunReport.tables.classes.flagged, 2);
      assert.equal(dryRunReport.tables.classes.issues.invalid_academic_year_fee_label, 1);
      assert.equal(dryRunReport.tables.classes.issues.invalid_class_name, 1);

      assert.equal(dryRunReport.tables.students.toInsert, 3);
      assert.equal(dryRunReport.tables.students.flagged, 1);
      assert.equal(dryRunReport.tables.students.issues.missing_student_class_link, 1);

      assert.equal(dryRunReport.tables.parents.toInsert, 2);
      assert.equal(dryRunReport.tables.parents.flagged, 3);
      assert.equal(dryRunReport.tables.parents.issues.missing_parent_email, 1);
      assert.equal(dryRunReport.tables.parents.issues.duplicate_parent_email_in_source, 2);

      // Only 2 bidirectional verified guardian-student links should be accepted;
      // email-derived links and unilateral links must be rejected!
      assert.equal(dryRunReport.tables.parent_students.toInsert, 2);
      assert.ok(dryRunReport.tables.parent_students.flagged >= 2);
      assert.ok(dryRunReport.tables.parent_students.issues.email_or_name_derived_link_rejected >= 1);
      assert.ok(dryRunReport.tables.parent_students.issues.unverified_guardian_student_link >= 1);

      assert.equal(dryRunReport.tables.academic_results.toInsert, 3);
      assert.equal(dryRunReport.tables.academic_results.flagged, 3);
      assert.equal(dryRunReport.tables.academic_results.issues.invalid_score_range, 1);
      assert.equal(dryRunReport.tables.academic_results.issues.ambiguous_publication_status, 1);
      assert.equal(dryRunReport.tables.academic_results.issues.empty_or_unlinked_result_record, 1);

      assert.equal(dryRunReport.tables.attendance.toInsert, 2);
      assert.equal(dryRunReport.tables.attendance.flagged, 3);
      assert.equal(dryRunReport.tables.attendance.issues.duplicate_student_attendance_date, 2);
      assert.equal(dryRunReport.tables.attendance.issues.missing_student_link, 1);

      assert.equal(dryRunReport.tables.fee_invoices.toInsert, 2);
      assert.equal(dryRunReport.tables.fee_invoices.flagged, 2);
      assert.equal(dryRunReport.tables.fee_invoices.issues.missing_student_link_class_template, 1);
      assert.equal(dryRunReport.tables.fee_invoices.issues.ambiguous_multi_student_invoice, 1);

      assert.equal(dryRunReport.tables.payments.toInsert, 2);
      assert.equal(dryRunReport.tables.payments.flagged, 2);
      assert.equal(dryRunReport.tables.payments.issues.payment_invoice_student_mismatch, 1);
      assert.equal(dryRunReport.tables.payments.issues.missing_invoice_link, 1);

      // 2. APPLY IMPORT (First Run)
      const applyReport1 = await runAirtableImport({ sourceDir: fixtureDir, apply: true });
      assert.equal(applyReport1.mode, 'apply');
      assert.equal(applyReport1.tables.students.toInsert, 3);
      assert.equal(applyReport1.tables.parents.toInsert, 2);
      assert.equal(applyReport1.tables.parent_students.toInsert, 2);

      // Verify existing accounts were untouched by the importer
      const [[afterApplyAccounts]] = await pool.query('SELECT COUNT(*) AS count FROM accounts');
      assert.equal(afterApplyAccounts.count, beforeAccounts.count);

      // 3. IDEMPOTENCY (Second Run with same Airtable record IDs)
      const applyReport2 = await runAirtableImport({ sourceDir: fixtureDir, apply: true });
      assert.equal(applyReport2.tables.classes.toInsert, 0);
      assert.equal(applyReport2.tables.classes.toSkip, 2);
      assert.equal(applyReport2.tables.students.toInsert, 0);
      assert.equal(applyReport2.tables.students.toSkip, 3);
      assert.equal(applyReport2.tables.parents.toInsert, 0);
      assert.equal(applyReport2.tables.parents.toSkip, 2);
      assert.equal(applyReport2.tables.parent_students.toInsert, 0);
      assert.equal(applyReport2.tables.parent_students.toSkip, 2);
      assert.equal(applyReport2.tables.academic_results.toInsert, 0);
      assert.equal(applyReport2.tables.academic_results.toSkip, 3);
      assert.equal(applyReport2.tables.attendance.toInsert, 0);
      assert.equal(applyReport2.tables.attendance.toSkip, 2);
      assert.equal(applyReport2.tables.fee_invoices.toInsert, 0);
      assert.equal(applyReport2.tables.fee_invoices.toSkip, 2);
      assert.equal(applyReport2.tables.payments.toInsert, 0);
      assert.equal(applyReport2.tables.payments.toSkip, 2);

      // 4. PARENT ACCESS PROTECTION & ISOLATION BETWEEN TWO SEPARATE PARENT ACCOUNTS
      const [[parentAlpha]] = await pool.query(
        'SELECT id, email FROM parents WHERE airtable_record_id = ?',
        ['recParValid000001'],
      );
      const [[parentBeta]] = await pool.query(
        'SELECT id, email FROM parents WHERE airtable_record_id = ?',
        ['recParValid000002'],
      );
      const [[studentOne]] = await pool.query(
        'SELECT id, student_code FROM students WHERE airtable_record_id = ?',
        ['recStudValid00001'],
      );
      const [[studentTwo]] = await pool.query(
        'SELECT id, student_code FROM students WHERE airtable_record_id = ?',
        ['recStudValid00002'],
      );
      const [[studentThreeUnlinked]] = await pool.query(
        'SELECT id, student_code FROM students WHERE airtable_record_id = ?',
        ['recStudUnlinked03'],
      );

      assert.ok(parentAlpha?.id && parentBeta?.id);
      assert.ok(studentOne?.id && studentTwo?.id && studentThreeUnlinked?.id);

      const password = 'FixtureParentPass!234';
      const passwordHash = await hashPassword(password);
      await pool.query(
        `INSERT INTO accounts (full_name, email, password_hash, role, parent_id, active)
         VALUES (?, ?, ?, 'parent', ?, 1), (?, ?, ?, 'parent', ?, 1)`,
        [
          'Guardian Alpha',
          parentAlpha.email,
          passwordHash,
          parentAlpha.id,
          'Guardian Beta',
          parentBeta.email,
          passwordHash,
          parentBeta.id,
        ],
      );

      const alphaLogin = await request(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: { email: parentAlpha.email, password },
      });
      const betaLogin = await request(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: { email: parentBeta.email, password },
      });
      assert.equal(alphaLogin.status, 200);
      assert.equal(betaLogin.status, 200);
      const alphaCookie = alphaLogin.response.headers.get('set-cookie').split(';')[0];
      const betaCookie = betaLogin.response.headers.get('set-cookie').split(';')[0];

      // Parent Alpha sees ONLY Student One (NOT Student Two, and NOT Student Three who shared email/surname/class)
      const alphaStudents = await request(baseUrl, '/api/students', { cookie: alphaCookie });
      assert.equal(alphaStudents.status, 200);
      assert.deepEqual(
        alphaStudents.data.map((s) => s.id),
        [studentOne.id],
      );

      // Parent Beta sees ONLY Student Two (NOT Student One, despite unilateral link on Parents.json)
      const betaStudents = await request(baseUrl, '/api/students', { cookie: betaCookie });
      assert.equal(betaStudents.status, 200);
      assert.deepEqual(
        betaStudents.data.map((s) => s.id),
        [studentTwo.id],
      );

      // Cross-parent access checks: Alpha cannot view Beta's child or Beta's parent children endpoint
      assert.equal(
        (await request(baseUrl, `/api/students/${studentTwo.id}/dashboard`, { cookie: alphaCookie }))
          .status,
        403,
      );
      assert.equal(
        (await request(baseUrl, `/api/students/${studentTwo.id}/results`, { cookie: alphaCookie }))
          .status,
        403,
      );
      assert.equal(
        (
          await request(baseUrl, `/api/students/${studentTwo.id}/attendance`, {
            cookie: alphaCookie,
          })
        ).status,
        403,
      );
      assert.equal(
        (await request(baseUrl, `/api/students/${studentTwo.id}/fees`, { cookie: alphaCookie }))
          .status,
        403,
      );
      assert.equal(
        (await request(baseUrl, `/api/parents/${parentBeta.id}/children`, { cookie: alphaCookie }))
          .status,
        403,
      );
      assert.equal(
        (
          await request(baseUrl, `/api/students/${studentThreeUnlinked.id}/dashboard`, {
            cookie: alphaCookie,
          })
        ).status,
        403,
      );

      // Beta cannot view Alpha's child or Alpha's parent children endpoint
      assert.equal(
        (await request(baseUrl, `/api/students/${studentOne.id}/dashboard`, { cookie: betaCookie }))
          .status,
        403,
      );
      assert.equal(
        (await request(baseUrl, `/api/parents/${parentAlpha.id}/children`, { cookie: betaCookie }))
          .status,
        403,
      );

      // Verify Alpha only sees published results (draft Civic Education result is hidden from parent)
      const alphaResults = await request(baseUrl, `/api/students/${studentOne.id}/results`, {
        cookie: alphaCookie,
      });
      assert.equal(alphaResults.status, 200);
      assert.equal(alphaResults.data.length, 1);
      assert.equal(alphaResults.data[0].subject, 'Mathematics');

      // Verify payments isolation: Alpha only sees FX-RCP-9001, Beta only sees FX-RCP-9002
      const alphaPayments = await request(baseUrl, '/api/payments', { cookie: alphaCookie });
      assert.equal(alphaPayments.status, 200);
      assert.deepEqual(
        alphaPayments.data.map((p) => p.receipt_number),
        ['FX-RCP-9001'],
      );

      const betaPayments = await request(baseUrl, '/api/payments', { cookie: betaCookie });
      assert.equal(betaPayments.status, 200);
      assert.deepEqual(
        betaPayments.data.map((p) => p.receipt_number),
        ['FX-RCP-9002'],
      );
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(() => resolve()));
      fs.rmSync(fixtureDir, { recursive: true, force: true });

      try {
        await pool.query(
          "DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE email IN ('guardian.alpha.fixture@example.test', 'guardian.beta.fixture@example.test'))",
        );
        await pool.query(
          "DELETE FROM accounts WHERE email IN ('guardian.alpha.fixture@example.test', 'guardian.beta.fixture@example.test')",
        );
        await pool.query("DELETE FROM payments WHERE airtable_record_id LIKE 'recPay%'");
        await pool.query("DELETE FROM fee_invoices WHERE airtable_record_id LIKE 'recFee%'");
        await pool.query("DELETE FROM attendance WHERE airtable_record_id LIKE 'recAtt%'");
        await pool.query("DELETE FROM academic_results WHERE airtable_record_id LIKE 'recRes%'");
        await pool.query("DELETE FROM parent_students WHERE airtable_record_id LIKE 'recPar%'");
        await pool.query("DELETE FROM parents WHERE airtable_record_id LIKE 'recPar%'");
        await pool.query("DELETE FROM students WHERE airtable_record_id LIKE 'recStud%'");
        await pool.query("DELETE FROM classes WHERE airtable_record_id LIKE 'recClass%'");
      } finally {
        await pool.end();
      }
    }
  },
);
