import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { ensureAirtableIdColumns, OPERATIONAL_AIRTABLE_TABLES } from './migrate.js';
import calendar from '../schema/academic-calendar.json' with { type: 'json' };
import { termLabel } from './academic-calendar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA_PATH = path.resolve(__dirname, '../schema/mls-airtable-schema.json');
const DEFAULT_EXPORT_DIR =
  process.env.AIRTABLE_EXPORT_DIR || path.resolve(__dirname, '../.local/airtable-exports');

const EXPORT_FILE_ALIASES = {
  Students: ['Students.json'],
  Parents: ['Parents.json'],
  ParentStudentLinks: ['ParentStudentLinks.json', 'Parent Student Links.json'],
  Classes: ['Classes.json'],
  'Academic Results': ['Academic Results.json'],
  'Academic Session': ['Academic Session.json', 'Academic Sessions.json'],
  Terms: ['Terms.json'],
  Attendance: ['Attendance.json'],
  Fees: ['Fees.json', 'Fee Invoices.json'],
  Payments: ['Payments.json'],
};

const OPERATIONAL_TARGETS = {
  Classes: 'classes',
  Students: 'students',
  Parents: 'parents',
  ParentStudentLinks: 'parent_students',
  'Academic Results': 'academic_results',
  Attendance: 'attendance',
  Fees: 'fee_invoices',
  Payments: 'payments',
};

const CLASS_CODE_TO_NAME = {
  N1: 'Nursery 1',
  N2: 'Nursery 2',
  PREP: 'Preparatory Class',
  TRAN: 'Transition Class',
  TRANS: 'Transition Class',
  P1: 'Primary 1',
  P2: 'Primary 2',
  P3: 'Primary 3',
  P4: 'Primary 4',
  P5: 'Primary 5',
  P6: 'Primary 6',
};

const VALID_ATTENDANCE_STATUSES = new Set(['present', 'absent', 'late', 'excused']);
const VALID_GUARDIAN_RELATIONSHIPS = new Set(['parent', 'mother', 'father', 'guardian']);

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '');
}

function readJsonFile(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, 'utf8')));
}

function isValidRecordId(value) {
  return typeof value === 'string' && /^rec[A-Za-z0-9]{10,20}$/.test(value.trim());
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function firstString(value) {
  if (Array.isArray(value)) return value.length ? String(value[0] ?? '').trim() : '';
  return String(value ?? '').trim();
}

function normalizeEmail(value) {
  const email = firstString(value).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function normalizeDate(value) {
  const raw = firstString(value);
  if (!raw) return null;
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === isoMatch[1]) {
      return isoMatch[1];
    }
  }
  return null;
}

function normalizeAcademicYear(value) {
  const raw = firstString(value);
  if (!raw) return null;
  if (/fee/i.test(raw)) return null;
  const shortMatch = raw.match(/^(\d{4})\s*[/-]\s*(\d{2})$/);
  if (shortMatch) {
    const century = shortMatch[1].slice(0, 2);
    return `${shortMatch[1]}/${century}${shortMatch[2]}`;
  }
  const fullMatch = raw.match(/^(\d{4})\s*[/-]\s*(\d{4})/);
  if (fullMatch) {
    return `${fullMatch[1]}/${fullMatch[2]}`;
  }
  return null;
}

function normalizeClassCode(value) {
  const raw = firstString(value).toUpperCase();
  if (!raw) return '';
  if (raw === 'TRANS') return 'TRAN';
  return raw;
}

function normalizePaymentMethod(value) {
  const raw = firstString(value).toLowerCase();
  if (!raw) return '';
  if (raw.includes('transfer') || raw === 'bank_transfer') return 'bank_transfer';
  if (raw.includes('cash')) return 'cash';
  if (raw.includes('pos') || raw.includes('card')) return 'pos';
  if (raw.includes('online')) return 'online';
  if (raw.includes('cheque')) return 'cheque';
  return '';
}

function computeScoreAndGrade({ ca1, ca2, exam }) {
  const n1 = Number(ca1 ?? 0);
  const n2 = Number(ca2 ?? 0);
  const n3 = Number(exam ?? 0);
  if (
    !Number.isFinite(n1) ||
    !Number.isFinite(n2) ||
    !Number.isFinite(n3) ||
    n1 < 0 ||
    n1 > 100 ||
    n2 < 0 ||
    n2 > 100 ||
    n3 < 0 ||
    n3 > 100
  ) {
    return { error: 'Component score out of range' };
  }
  const total = Math.round((n1 + n2 + n3) * 100) / 100;
  if (total > 100) {
    return { error: 'Combined score exceeds 100', ca1: n1, ca2: n2, exam: n3, total };
  }
  const grade =
    total >= 70
      ? 'A'
      : total >= 60
        ? 'B'
        : total >= 50
          ? 'C'
          : total >= 45
            ? 'D'
            : total >= 40
              ? 'E'
              : 'F';
  return { ca1: n1, ca2: n2, exam: n3, total, grade };
}

function createTableSummary(sourceCount = 0) {
  return {
    sourceCount,
    toInsert: 0,
    toUpdate: 0,
    toSkip: 0,
    flagged: 0,
    issues: {},
    flaggedRecords: [],
  };
}

function flagRecord(summary, recordId, issueCodes) {
  const codes = [...new Set(asArray(issueCodes).filter(Boolean))];
  summary.flagged += 1;
  for (const code of codes) {
    summary.issues[code] = (summary.issues[code] || 0) + 1;
  }
  summary.flaggedRecords.push({
    recordId: String(recordId || 'unknown'),
    issues: codes,
  });
}

export function loadAirtableExports(
  sourceDir = DEFAULT_EXPORT_DIR,
  schemaPath = DEFAULT_SCHEMA_PATH,
) {
  const schemaDoc = fs.existsSync(schemaPath) ? readJsonFile(schemaPath) : { tables: [] };
  const dirEntries = fs.existsSync(sourceDir) ? fs.readdirSync(sourceDir) : [];
  const fileMap = new Map(dirEntries.map((entry) => [entry.toLowerCase(), entry]));

  const recordsByTable = {};
  const availableFiles = [];
  const missingFiles = [];

  for (const tableSpec of schemaDoc.tables || []) {
    const tableId = tableSpec.airtableTableId || tableSpec.id || null;
    const sqlTable = tableSpec.mysqlTable || tableSpec.sqlTable || null;
    const candidates = EXPORT_FILE_ALIASES[tableSpec.name] || [`${tableSpec.name}.json`];
    const matchedEntry = candidates
      .map((candidate) => fileMap.get(candidate.toLowerCase()))
      .find(Boolean);

    if (matchedEntry) {
      const fullPath = path.join(sourceDir, matchedEntry);
      const parsed = readJsonFile(fullPath);
      const records = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.records)
          ? parsed.records
          : [];
      recordsByTable[tableSpec.name] = records;
      availableFiles.push({
        fileName: matchedEntry,
        tableName: tableSpec.name,
        tableId,
        sqlTable,
        operationalTarget: OPERATIONAL_TARGETS[tableSpec.name] || null,
        recordCount: records.length,
      });
    } else {
      recordsByTable[tableSpec.name] = null;
      missingFiles.push({
        expectedFileName: `${tableSpec.name}.json`,
        tableName: tableSpec.name,
        tableId,
        sqlTable,
        operationalTarget: OPERATIONAL_TARGETS[tableSpec.name] || null,
      });
    }
  }

  for (const [tableName, candidates] of Object.entries(EXPORT_FILE_ALIASES)) {
    if (recordsByTable[tableName] !== undefined) continue;
    const matchedEntry = candidates
      .map((candidate) => fileMap.get(candidate.toLowerCase()))
      .find(Boolean);
    if (matchedEntry) {
      const parsed = readJsonFile(path.join(sourceDir, matchedEntry));
      const records = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.records)
          ? parsed.records
          : [];
      recordsByTable[tableName] = records;
      availableFiles.push({
        fileName: matchedEntry,
        tableName,
        tableId: null,
        sqlTable: null,
        operationalTarget: OPERATIONAL_TARGETS[tableName] || null,
        recordCount: records.length,
      });
    }
  }

  return {
    sourceDir,
    schemaDoc,
    recordsByTable,
    availableFiles,
    missingFiles,
  };
}

function analyzeBrokenRelationships(recordsByTable) {
  const brokenRelationships = [];
  const studentRecords = recordsByTable.Students || [];
  const studentIds = new Set(studentRecords.map((r) => r.id));
  const classRecords = recordsByTable.Classes || [];
  const classIds = new Set(classRecords.map((r) => r.id));
  const feeRecords = recordsByTable.Fees || [];
  const feeIds = new Set(feeRecords.map((r) => r.id));
  const termRecords = recordsByTable.Terms || [];
  const termIds = new Set(termRecords.map((r) => r.id));
  const sessionRecords = recordsByTable['Academic Session'] || [];
  const sessionIds = new Set(sessionRecords.map((r) => r.id));

  const checks = [
    {
      sourceTable: 'Classes',
      targetTable: 'Students',
      field: 'Students',
      records: classRecords,
      targetSet: studentIds,
      targetFileAvailable: Array.isArray(recordsByTable.Students),
    },
    {
      sourceTable: 'Parents',
      targetTable: 'Students',
      field: 'Students',
      records: recordsByTable.Parents || [],
      targetSet: studentIds,
      targetFileAvailable: Array.isArray(recordsByTable.Students),
    },
    {
      sourceTable: 'Parents',
      targetTable: 'Students',
      field: 'ParentEmail_Student',
      records: recordsByTable.Parents || [],
      targetSet: studentIds,
      targetFileAvailable: Array.isArray(recordsByTable.Students),
    },
    {
      sourceTable: 'Academic Results',
      targetTable: 'Students',
      field: 'Student_Link',
      records: recordsByTable['Academic Results'] || [],
      targetSet: studentIds,
      targetFileAvailable: Array.isArray(recordsByTable.Students),
    },
    {
      sourceTable: 'Attendance',
      targetTable: 'Students',
      field: 'Student_Link',
      records: recordsByTable.Attendance || [],
      targetSet: studentIds,
      targetFileAvailable: Array.isArray(recordsByTable.Students),
    },
    {
      sourceTable: 'Fees',
      targetTable: 'Students',
      field: 'Students',
      records: feeRecords,
      targetSet: studentIds,
      targetFileAvailable: Array.isArray(recordsByTable.Students),
    },
    {
      sourceTable: 'Payments',
      targetTable: 'Students',
      field: 'Student_Link',
      records: recordsByTable.Payments || [],
      targetSet: studentIds,
      targetFileAvailable: Array.isArray(recordsByTable.Students),
    },
    {
      sourceTable: 'Payments',
      targetTable: 'Fees',
      field: 'Fees_Link',
      records: recordsByTable.Payments || [],
      targetSet: feeIds,
      targetFileAvailable: Array.isArray(recordsByTable.Fees),
    },
    {
      sourceTable: 'Students',
      targetTable: 'Fee Structure',
      field: 'Fee Structure',
      records: studentRecords,
      targetSet: new Set((recordsByTable['Fee Structure'] || []).map((r) => r.id)),
      targetFileAvailable: Array.isArray(recordsByTable['Fee Structure']),
    },
    {
      sourceTable: 'Students',
      targetTable: 'Payments Log',
      field: 'Payments Log',
      records: studentRecords,
      targetSet: new Set((recordsByTable['Payments Log'] || []).map((r) => r.id)),
      targetFileAvailable: Array.isArray(recordsByTable['Payments Log']),
    },
    {
      sourceTable: 'Students',
      targetTable: 'Terminal Scores',
      field: 'Terminal Scores 3',
      records: studentRecords,
      targetSet: new Set((recordsByTable['Terminal Scores'] || []).map((r) => r.id)),
      targetFileAvailable: Array.isArray(recordsByTable['Terminal Scores']),
    },
    {
      sourceTable: 'Payments',
      targetTable: 'Fee Structure',
      field: 'Fees_Structure_Link',
      records: recordsByTable.Payments || [],
      targetSet: new Set((recordsByTable['Fee Structure'] || []).map((r) => r.id)),
      targetFileAvailable: Array.isArray(recordsByTable['Fee Structure']),
    },
    {
      sourceTable: 'Students',
      targetTable: 'Classes',
      field: 'Student Class',
      records: studentRecords,
      targetSet: classIds,
      targetFileAvailable: Array.isArray(recordsByTable.Classes),
    },
    {
      sourceTable: 'Terms',
      targetTable: 'Academic Session',
      field: 'Academic_Year',
      records: termRecords,
      targetSet: sessionIds,
      targetFileAvailable: Array.isArray(recordsByTable['Academic Session']),
    },
    {
      sourceTable: 'Academic Results',
      targetTable: 'Terms',
      field: 'Term_Main',
      records: recordsByTable['Academic Results'] || [],
      targetSet: termIds,
      targetFileAvailable: Array.isArray(recordsByTable.Terms),
    },
  ];

  for (const check of checks) {
    const missingTargets = new Set();
    let affectedSourceRecords = 0;
    for (const record of check.records) {
      const links = asArray(record?.fields?.[check.field]).filter(isValidRecordId);
      const missingForRecord = links.filter((id) => !check.targetSet.has(id));
      if (missingForRecord.length > 0) {
        affectedSourceRecords += 1;
        for (const id of missingForRecord) missingTargets.add(id);
      }
    }
    if (missingTargets.size > 0) {
      brokenRelationships.push({
        sourceTable: check.sourceTable,
        targetTable: check.targetTable,
        field: check.field,
        targetFileExported: check.targetFileAvailable,
        affectedSourceRecordCount: affectedSourceRecords,
        missingTargetRecordCount: missingTargets.size,
        sampleMissingTargetIds: [...missingTargets].slice(0, 5),
      });
    }
  }

  return brokenRelationships;
}

async function fetchExistingDbState(executor) {
  const columnRows = await executor
    .query(
      `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND TABLE_NAME IN (${OPERATIONAL_AIRTABLE_TABLES.map(() => '?').join(',')})`,
      OPERATIONAL_AIRTABLE_TABLES,
    )
    .then(([rows]) => rows);

  const columnsByTable = new Map();
  for (const row of columnRows) {
    if (!columnsByTable.has(row.tableName)) {
      columnsByTable.set(row.tableName, new Set());
    }
    columnsByTable.get(row.tableName).add(row.columnName);
  }

  const hasAirtableCol = (t) => Boolean(columnsByTable.get(t)?.has('airtable_record_id'));

  const [classes] = await executor.query(
    `SELECT id, name, ${hasAirtableCol('classes') ? 'airtable_record_id' : 'NULL AS airtable_record_id'} FROM classes`,
  );
  const [students] = await executor.query(
    `SELECT id, student_code, first_name, last_name, DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS date_of_birth, class_id, enrollment_status, ${hasAirtableCol('students') ? 'airtable_record_id' : 'NULL AS airtable_record_id'} FROM students`,
  );
  const [parents] = await executor.query(
    `SELECT id, full_name, email, phone, status, ${hasAirtableCol('parents') ? 'airtable_record_id' : 'NULL AS airtable_record_id'} FROM parents`,
  );
  const [parentStudents] = await executor.query(
    `SELECT parent_id, student_id, relationship, is_primary_guardian, ${hasAirtableCol('parent_students') ? 'airtable_record_id' : 'NULL AS airtable_record_id'} FROM parent_students`,
  );
  const [academicResults] = await executor.query(
    `SELECT id, student_id, term_id, term_name, subject, ca1_score, ca2_score, exam_score, total_score, grade, teacher_remarks, publication_status, ${hasAirtableCol('academic_results') ? 'airtable_record_id' : 'NULL AS airtable_record_id'} FROM academic_results`,
  );
  const [attendance] = await executor.query(
    `SELECT id, student_id, DATE_FORMAT(attendance_date, '%Y-%m-%d') AS attendance_date, status, reason, ${hasAirtableCol('attendance') ? 'airtable_record_id' : 'NULL AS airtable_record_id'} FROM attendance`,
  );
  const [feeInvoices] = await executor.query(
    `SELECT id, student_id, invoice_number, description, amount_due, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date, status, ${hasAirtableCol('fee_invoices') ? 'airtable_record_id' : 'NULL AS airtable_record_id'} FROM fee_invoices`,
  );
  const [payments] = await executor.query(
    `SELECT id, invoice_id, receipt_number, amount_paid, DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date, payment_method, reference, ${hasAirtableCol('payments') ? 'airtable_record_id' : 'NULL AS airtable_record_id'} FROM payments`,
  );

  return {
    columnsByTable,
    classes,
    students,
    parents,
    parentStudents,
    academicResults,
    attendance,
    feeInvoices,
    payments,
  };
}

export async function runAirtableImport(options = {}) {
  const {
    sourceDir = DEFAULT_EXPORT_DIR,
    schemaPath = DEFAULT_SCHEMA_PATH,
    apply = false,
    executor = pool,
  } = options;

  const { schemaDoc, recordsByTable, availableFiles, missingFiles } = loadAirtableExports(
    sourceDir,
    schemaPath,
  );
  const brokenRelationships = analyzeBrokenRelationships(recordsByTable);

  if (apply) {
    await ensureAirtableIdColumns(executor);
  }

  const existing = await fetchExistingDbState(executor);

  // Build valid Academic Session & Term maps from exported files and academic-calendar.json
  const validSessionsById = new Map();
  const validSessionLabels = new Set();
  for (const sessionRec of recordsByTable['Academic Session'] || []) {
    const f = sessionRec?.fields || {};
    const yearNorm = normalizeAcademicYear(
      f['Academic Session'] || f.Academic_Year || f['Session Name'] || f['Session Code'],
    );
    if (isValidRecordId(sessionRec?.id) && yearNorm) {
      validSessionsById.set(sessionRec.id, {
        id: sessionRec.id,
        academicYear: yearNorm,
        name: firstString(f['Academic Session'] || f['Session Name']) || `${yearNorm} Academic Year`,
      });
      validSessionLabels.add(yearNorm);
    }
  }

  const validTermsById = new Map();
  const validTermsByKey = new Map();

  for (const calTerm of calendar.terms || []) {
    const termEntry = {
      id: calTerm.id,
      name: calTerm.name,
      code: calTerm.code,
      sessionId: calTerm.sessionId,
      academicYear: '2025/2026',
      label: termLabel(calTerm),
    };
    validTermsById.set(calTerm.id, termEntry);
    validTermsByKey.set(calTerm.name.toLowerCase(), termEntry);
    if (calTerm.code) validTermsByKey.set(calTerm.code.toLowerCase(), termEntry);
  }

  for (const termRec of recordsByTable.Terms || []) {
    const f = termRec?.fields || {};
    const termName = firstString(f.Term || f.Term_Name || f.Terms);
    const termCode = firstString(f['Term Code'] || f.Term_Code);
    const linkedSessionIds = asArray(f['Academic Session'] || f.Academic_Year).filter(
      isValidRecordId,
    );
    const linkedSession = linkedSessionIds.map((id) => validSessionsById.get(id)).find(Boolean);
    const matchedCalTerm =
      validTermsById.get(termRec?.id) ||
      validTermsByKey.get(termName.toLowerCase()) ||
      validTermsByKey.get(termCode.toLowerCase()) ||
      null;

    if (isValidRecordId(termRec?.id) && (termName || matchedCalTerm)) {
      const academicYear =
        linkedSession?.academicYear ||
        normalizeAcademicYear(
          f['Academic Session (from Academic Session)'] || f['Session Name (from Academic_Year)'],
        ) ||
        matchedCalTerm?.academicYear ||
        '2025/2026';
      const canonicalTermId = matchedCalTerm?.id || termRec.id;
      const canonicalName = matchedCalTerm?.name || termName;
      const label = matchedCalTerm
        ? matchedCalTerm.label
        : `${canonicalName} · ${academicYear} Academic Year`;
      const termEntry = {
        id: canonicalTermId,
        sourceRecordId: termRec.id,
        name: canonicalName,
        code: termCode || matchedCalTerm?.code || '',
        academicYear,
        label,
      };
      validTermsById.set(termRec.id, termEntry);
      validTermsById.set(canonicalTermId, termEntry);
      if (canonicalName) validTermsByKey.set(canonicalName.toLowerCase(), termEntry);
      if (termCode) validTermsByKey.set(termCode.toLowerCase(), termEntry);
    }
  }

  function resolveExportTerm(rawTerm, termMainLinks = []) {
    for (const id of termMainLinks) {
      if (validTermsById.has(id)) return validTermsById.get(id);
    }
    const raw = firstString(rawTerm).toLowerCase();
    if (!raw) return null;
    if (validTermsByKey.has(raw)) return validTermsByKey.get(raw);
    if (raw.includes('term 1') || raw === 't1' || raw.includes('first')) {
      return validTermsByKey.get('term 1') || null;
    }
    if (raw.includes('term 2') || raw === 't2' || raw.includes('second')) {
      return validTermsByKey.get('term 2') || null;
    }
    if (raw.includes('term 3') || raw === 't3' || raw.includes('third')) {
      return validTermsByKey.get('term 3') || null;
    }
    return null;
  }

  // 1. Validate & plan CLASSES
  const classRecords = recordsByTable.Classes || [];
  const classesSummary = createTableSummary(classRecords.length);
  const validClassesByAirtableId = new Map();
  const validClassNamesSeen = new Set();
  const validClassCodesSeen = new Set();
  const classOperations = [];

  const existingClassesByAirtableId = new Map(
    existing.classes.filter((c) => c.airtable_record_id).map((c) => [c.airtable_record_id, c]),
  );
  const existingClassesByName = new Map(
    existing.classes.map((c) => [String(c.name).trim().toLowerCase(), c]),
  );

  for (const rec of classRecords) {
    const recordId = rec?.id;
    const f = rec?.fields || {};
    const issues = [];

    if (!isValidRecordId(recordId)) {
      issues.push('invalid_airtable_record_id');
    }

    const rawClassesField = firstString(f.Classes);
    const rawClassName = firstString(f['Class Name']);
    const rawClassCode = normalizeClassCode(f['Class Code']);
    const rawAcademicYear = firstString(f['Academic Year']);

    if (/https?:\/\//i.test(rawClassesField) || /https?:\/\//i.test(rawClassName)) {
      issues.push('invalid_class_name');
    }

    if (/fee/i.test(rawAcademicYear)) {
      issues.push('invalid_academic_year_fee_label');
    }

    const normalizedYear = normalizeAcademicYear(rawAcademicYear);
    if (!rawClassName || !rawClassCode) {
      issues.push('missing_class_name_or_code');
    }
    if (!normalizedYear && !issues.includes('invalid_academic_year_fee_label')) {
      issues.push('missing_or_invalid_academic_year');
    }

    if (rawClassName && validClassNamesSeen.has(rawClassName.toLowerCase())) {
      issues.push('duplicate_class_in_source');
    }
    if (rawClassCode && validClassCodesSeen.has(rawClassCode)) {
      issues.push('duplicate_class_in_source');
    }

    if (issues.length > 0) {
      flagRecord(classesSummary, recordId, issues);
      continue;
    }

    validClassNamesSeen.add(rawClassName.toLowerCase());
    validClassCodesSeen.add(rawClassCode);

    const existingRow =
      existingClassesByAirtableId.get(recordId) ||
      existingClassesByName.get(rawClassName.toLowerCase()) ||
      null;

    const planned = {
      airtableRecordId: recordId,
      name: rawClassName,
      classCode: rawClassCode,
      academicYear: normalizedYear,
      existingId: existingRow?.id || null,
    };

    validClassesByAirtableId.set(recordId, planned);

    if (!existingRow) {
      classesSummary.toInsert += 1;
      classOperations.push({ action: 'insert', ...planned });
    } else {
      const unchanged =
        existingRow.airtable_record_id === recordId && String(existingRow.name || '') === planned.name;
      if (unchanged) {
        classesSummary.toSkip += 1;
        classOperations.push({ action: 'skip', ...planned });
      } else {
        classesSummary.toUpdate += 1;
        classOperations.push({ action: 'update', ...planned });
      }
    }
  }

  // 2. Validate & plan STUDENTS
  const studentRecords = recordsByTable.Students || [];
  const studentsSummary = createTableSummary(studentRecords.length);
  const validStudentsByAirtableId = new Map();
  const seenStudentCodes = new Set();
  const studentOperations = [];

  const existingStudentsByAirtableId = new Map(
    existing.students.filter((s) => s.airtable_record_id).map((s) => [s.airtable_record_id, s]),
  );
  const existingStudentsByCode = new Map(
    existing.students.map((s) => [String(s.student_code).trim().toUpperCase(), s]),
  );

  for (const rec of studentRecords) {
    const recordId = rec?.id;
    const f = rec?.fields || {};
    const issues = [];

    if (!isValidRecordId(recordId)) {
      issues.push('invalid_airtable_record_id');
    }

    const studentCode = firstString(f.StudentIDCode);
    const firstName = firstString(f.First_Name);
    const lastName = firstString(f.Last_Name);
    const rawDob = firstString(f.Date_of_Birth);
    const dateOfBirth = rawDob ? normalizeDate(rawDob) : null;

    if (!studentCode || !firstName || !lastName) {
      issues.push('missing_required_student_fields');
    }
    if (rawDob && !dateOfBirth) {
      issues.push('invalid_date_of_birth');
    }

    const classLinks = asArray(f['Student Class']).filter(isValidRecordId);
    if (classLinks.length === 0) {
      issues.push('missing_student_class_link');
    } else if (classLinks.length > 1) {
      issues.push('multiple_student_class_links');
    }

    const linkedClassId = classLinks[0] || null;
    const resolvedClass = linkedClassId ? validClassesByAirtableId.get(linkedClassId) : null;
    if (linkedClassId && !resolvedClass) {
      issues.push('invalid_linked_class_record');
    }

    const currentClassCode = normalizeClassCode(f.Current_Class);
    if (resolvedClass && currentClassCode && currentClassCode !== resolvedClass.classCode) {
      issues.push('class_code_mismatch');
    }

    const rawEnrollmentStatus = firstString(f.Enrollment_Status).toLowerCase();
    let enrollmentStatus = 'active';
    if (rawEnrollmentStatus) {
      if (['active', 'enrolled'].includes(rawEnrollmentStatus)) {
        enrollmentStatus = 'active';
      } else if (rawEnrollmentStatus === 'pending') {
        enrollmentStatus = 'pending';
      } else if (['inactive', 'withdrawn', 'graduated', 'suspended'].includes(rawEnrollmentStatus)) {
        enrollmentStatus = 'inactive';
      } else {
        issues.push('invalid_enrollment_status');
      }
    }

    if (studentCode && seenStudentCodes.has(studentCode.toUpperCase())) {
      issues.push('duplicate_student_code_in_source');
    }

    const existingByAirtable = existingStudentsByAirtableId.get(recordId);
    const existingByCode = studentCode ? existingStudentsByCode.get(studentCode.toUpperCase()) : null;
    if (
      existingByCode &&
      existingByCode.airtable_record_id &&
      existingByCode.airtable_record_id !== recordId
    ) {
      issues.push('student_code_conflict_in_db');
    }

    if (issues.length > 0) {
      flagRecord(studentsSummary, recordId, issues);
      continue;
    }

    seenStudentCodes.add(studentCode.toUpperCase());
    const existingRow = existingByAirtable || existingByCode || null;

    // Collect explicit student-side guardian record links (never names or emails)
    const explicitParentLinksOnStudent = new Set([
      ...asArray(f.Parents).filter(isValidRecordId),
      ...asArray(f.ParentID).filter(isValidRecordId),
      ...asArray(f['Parents 2']).filter(isValidRecordId),
    ]);

    const planned = {
      airtableRecordId: recordId,
      studentCode,
      firstName,
      lastName,
      dateOfBirth,
      classAirtableId: resolvedClass.airtableRecordId,
      className: resolvedClass.name,
      classCode: resolvedClass.classCode,
      enrollmentStatus,
      explicitParentLinksOnStudent,
      existingId: existingRow?.id || null,
    };

    validStudentsByAirtableId.set(recordId, planned);

    if (!existingRow) {
      studentsSummary.toInsert += 1;
      studentOperations.push({ action: 'insert', ...planned });
    } else {
      const unchanged =
        existingRow.airtable_record_id === recordId &&
        String(existingRow.student_code || '') === planned.studentCode &&
        String(existingRow.first_name || '') === planned.firstName &&
        String(existingRow.last_name || '') === planned.lastName &&
        String(existingRow.date_of_birth || '') === String(planned.dateOfBirth || '') &&
        String(existingRow.enrollment_status || '') === planned.enrollmentStatus &&
        Boolean(
          resolvedClass.existingId && Number(existingRow.class_id) === Number(resolvedClass.existingId),
        );
      if (unchanged) {
        studentsSummary.toSkip += 1;
        studentOperations.push({ action: 'skip', ...planned });
      } else {
        studentsSummary.toUpdate += 1;
        studentOperations.push({ action: 'update', ...planned });
      }
    }
  }

  // 3. Validate & plan PARENTS
  const parentRecords = recordsByTable.Parents || [];
  const parentsSummary = createTableSummary(parentRecords.length);
  const validParentsByAirtableId = new Map();
  const parentOperations = [];

  const emailFrequency = new Map();
  for (const rec of parentRecords) {
    const email = normalizeEmail(rec?.fields?.ParentEmail || rec?.fields?.Email);
    if (email) {
      emailFrequency.set(email, (emailFrequency.get(email) || 0) + 1);
    }
  }

  const existingParentsByAirtableId = new Map(
    existing.parents.filter((p) => p.airtable_record_id).map((p) => [p.airtable_record_id, p]),
  );
  const existingParentsByEmail = new Map(
    existing.parents.map((p) => [String(p.email || '').trim().toLowerCase(), p]),
  );

  for (const rec of parentRecords) {
    const recordId = rec?.id;
    const f = rec?.fields || {};
    const issues = [];

    if (!isValidRecordId(recordId)) {
      issues.push('invalid_airtable_record_id');
    }

    const fullName = firstString(f['Parent Name'] || f.Full_Name);
    const rawEmail = firstString(f.ParentEmail || f.Email);
    const email = normalizeEmail(rawEmail);
    const phone = firstString(f.Phone_Number || f.Phone) || null;
    const rawStatus = firstString(f.Parent_Status).toLowerCase();
    const status = rawStatus === 'inactive' ? 'inactive' : 'active';

    if (!fullName) {
      issues.push('missing_parent_name');
    }
    if (!rawEmail) {
      issues.push('missing_parent_email');
    } else if (!email) {
      issues.push('invalid_parent_email');
    } else if ((emailFrequency.get(email) || 0) > 1) {
      issues.push('duplicate_parent_email_in_source');
    }

    const existingByAirtable = existingParentsByAirtableId.get(recordId);
    const existingByEmail = email ? existingParentsByEmail.get(email) : null;
    if (existingByEmail && !existingByAirtable) {
      issues.push('email_conflict_with_existing_parent');
    }

    if (issues.length > 0) {
      flagRecord(parentsSummary, recordId, issues);
      continue;
    }

    const existingRow = existingByAirtable || null;
    const planned = {
      airtableRecordId: recordId,
      fullName,
      email,
      phone,
      status,
      relationship: firstString(f.Relationship),
      explicitStudentLinks: asArray(f.Students).filter(isValidRecordId),
      existingId: existingRow?.id || null,
    };

    validParentsByAirtableId.set(recordId, planned);

    if (!existingRow) {
      parentsSummary.toInsert += 1;
      parentOperations.push({ action: 'insert', ...planned });
    } else {
      const unchanged =
        existingRow.airtable_record_id === recordId &&
        String(existingRow.full_name || '') === planned.fullName &&
        String(existingRow.email || '').toLowerCase() === planned.email &&
        String(existingRow.phone || '') === String(planned.phone || '') &&
        String(existingRow.status || '') === planned.status;
      if (unchanged) {
        parentsSummary.toSkip += 1;
        parentOperations.push({ action: 'skip', ...planned });
      } else {
        parentsSummary.toUpdate += 1;
        parentOperations.push({ action: 'update', ...planned });
      }
    }
  }

  // 4. Validate & plan PARENT_STUDENTS (Strict guardian-student access control)
  const explicitJunctionRecords = recordsByTable.ParentStudentLinks || [];
  const candidateLinks = [];

  if (Array.isArray(recordsByTable.ParentStudentLinks) && explicitJunctionRecords.length > 0) {
    for (const rec of explicitJunctionRecords) {
      const f = rec?.fields || {};
      candidateLinks.push({
        recordId: rec?.id,
        source: 'ParentStudentLinks',
        parentIds: asArray(f.Parent || f.Parent_Link || f.Parents).filter(isValidRecordId),
        studentIds: asArray(f.Student || f.Student_Link || f.Students).filter(isValidRecordId),
        relationship: firstString(f.Relationship),
        verified:
          f.Verified === true ||
          ['verified', 'active'].includes(
            firstString(f.Access_Status || f.Link_Status || f.Status).toLowerCase(),
          ),
        isPrimary: f.Is_Primary_Contact !== false && f.Is_Primary_Guardian !== false,
      });
    }
  }

  for (const rec of parentRecords) {
    const parentId = rec?.id;
    const f = rec?.fields || {};
    const directStudentIds = new Set([
      ...asArray(f.Students).filter(isValidRecordId),
      ...asArray(f['Students 2']).filter(isValidRecordId),
      ...asArray(f['Students 3']).filter(isValidRecordId),
    ]);
    const emailDerivedStudentIds = new Set(asArray(f.ParentEmail_Student).filter(isValidRecordId));

    for (const studentId of directStudentIds) {
      if (
        candidateLinks.some(
          (c) =>
            c.source === 'ParentStudentLinks' &&
            c.parentIds.includes(parentId) &&
            c.studentIds.includes(studentId),
        )
      ) {
        continue;
      }
      candidateLinks.push({
        recordId: `${parentId}:${studentId}`,
        source: 'Parents.Students',
        parentIds: [parentId],
        studentIds: [studentId],
        relationship: firstString(f.Relationship),
        verified: false,
        emailDerivedOnly: false,
        isPrimary: true,
      });
    }

    for (const studentId of emailDerivedStudentIds) {
      if (directStudentIds.has(studentId)) continue;
      candidateLinks.push({
        recordId: `${parentId}:${studentId}`,
        source: 'Parents.ParentEmail_Student',
        parentIds: [parentId],
        studentIds: [studentId],
        relationship: firstString(f.Relationship),
        verified: false,
        emailDerivedOnly: true,
        isPrimary: false,
      });
    }
  }

  const parentStudentsSummary = createTableSummary(candidateLinks.length);
  const parentStudentOperations = [];
  const seenParentStudentPairs = new Set();

  const existingParentStudentsByAirtableId = new Map(
    existing.parentStudents
      .filter((ps) => ps.airtable_record_id)
      .map((ps) => [ps.airtable_record_id, ps]),
  );
  const existingParentStudentsByPair = new Map(
    existing.parentStudents.map((ps) => [`${ps.parent_id}:${ps.student_id}`, ps]),
  );

  for (const candidate of candidateLinks) {
    const issues = [];
    if (candidate.emailDerivedOnly) {
      issues.push('email_or_name_derived_link_rejected');
    }
    if (candidate.parentIds.length !== 1 || candidate.studentIds.length !== 1) {
      issues.push('ambiguous_guardian_student_link');
    }

    const parentAirtableId = candidate.parentIds[0] || null;
    const studentAirtableId = candidate.studentIds[0] || null;
    const validParent = parentAirtableId ? validParentsByAirtableId.get(parentAirtableId) : null;
    const validStudent = studentAirtableId
      ? validStudentsByAirtableId.get(studentAirtableId)
      : null;

    if (!validParent) {
      issues.push('flagged_or_missing_parent_record');
    }
    if (!validStudent) {
      issues.push('missing_linked_student_record');
    }

    const hasBidirectionalVerification =
      Boolean(validParent && validStudent) &&
      validParent.explicitStudentLinks.includes(studentAirtableId) &&
      validStudent.explicitParentLinksOnStudent.has(parentAirtableId);

    const isExplicitlyVerified =
      !candidate.emailDerivedOnly &&
      ((candidate.source === 'ParentStudentLinks' && candidate.verified) ||
        hasBidirectionalVerification);

    if (!isExplicitlyVerified && !issues.includes('email_or_name_derived_link_rejected')) {
      issues.push('unverified_guardian_student_link');
    }

    const relRaw = firstString(candidate.relationship || validParent?.relationship);
    const relNorm = relRaw.toLowerCase();
    if (!relRaw || !VALID_GUARDIAN_RELATIONSHIPS.has(relNorm)) {
      issues.push('missing_or_invalid_guardian_relationship');
    }

    const pairKey = `${parentAirtableId}:${studentAirtableId}`;
    if (seenParentStudentPairs.has(pairKey)) {
      issues.push('duplicate_parent_student_link');
    }

    if (issues.length > 0) {
      flagRecord(parentStudentsSummary, candidate.recordId, issues);
      continue;
    }

    seenParentStudentPairs.add(pairKey);
    const relationshipLabel = relRaw.charAt(0).toUpperCase() + relRaw.slice(1).toLowerCase();
    const isPrimaryGuardian = candidate.isPrimary ? 1 : 0;

    const existingRow =
      existingParentStudentsByAirtableId.get(candidate.recordId) ||
      (validParent.existingId && validStudent.existingId
        ? existingParentStudentsByPair.get(`${validParent.existingId}:${validStudent.existingId}`)
        : null);

    const planned = {
      airtableRecordId: candidate.recordId,
      parentAirtableId,
      studentAirtableId,
      relationship: relationshipLabel,
      isPrimaryGuardian,
    };

    if (!existingRow) {
      parentStudentsSummary.toInsert += 1;
      parentStudentOperations.push({ action: 'insert', ...planned });
    } else {
      const unchanged =
        existingRow.airtable_record_id === candidate.recordId &&
        String(existingRow.relationship || '') === planned.relationship &&
        Number(existingRow.is_primary_guardian) === planned.isPrimaryGuardian;
      if (unchanged) {
        parentStudentsSummary.toSkip += 1;
        parentStudentOperations.push({ action: 'skip', ...planned });
      } else {
        parentStudentsSummary.toUpdate += 1;
        parentStudentOperations.push({ action: 'update', ...planned });
      }
    }
  }

  // 5. Validate & plan ACADEMIC_RESULTS
  const resultRecords = recordsByTable['Academic Results'] || [];
  const resultsSummary = createTableSummary(resultRecords.length);
  const resultOperations = [];

  const resultComboFrequency = new Map();
  for (const rec of resultRecords) {
    const f = rec?.fields || {};
    const studentId = asArray(f.Student_Link || f.Students).filter(isValidRecordId)[0] || '';
    const termEntry = resolveExportTerm(
      f.Term || f['Term Code'],
      asArray(f.Term_Main).filter(isValidRecordId),
    );
    const subject = firstString(f.Subject).toLowerCase();
    if (studentId && termEntry?.id && subject) {
      const key = `${studentId}:${termEntry.id}:${subject}`;
      resultComboFrequency.set(key, (resultComboFrequency.get(key) || 0) + 1);
    }
  }

  const existingResultsByAirtableId = new Map(
    existing.academicResults
      .filter((r) => r.airtable_record_id)
      .map((r) => [r.airtable_record_id, r]),
  );

  for (const rec of resultRecords) {
    const recordId = rec?.id;
    const f = rec?.fields || {};
    const issues = [];

    if (!isValidRecordId(recordId)) {
      issues.push('invalid_airtable_record_id');
    }

    const studentLinks = asArray(f.Student_Link || f.Students).filter(isValidRecordId);
    const subject = firstString(f.Subject);
    const rawTerm = firstString(f.Term || f['Term Code']);

    if (studentLinks.length === 0 && !subject && !rawTerm) {
      flagRecord(resultsSummary, recordId, ['empty_or_unlinked_result_record']);
      continue;
    }

    if (studentLinks.length === 0) {
      issues.push('missing_student_link');
    } else if (studentLinks.length > 1) {
      issues.push('multiple_student_links');
    }

    const studentAirtableId = studentLinks[0] || null;
    const validStudent = studentAirtableId
      ? validStudentsByAirtableId.get(studentAirtableId)
      : null;
    if (studentAirtableId && !validStudent) {
      issues.push('missing_linked_student_record');
    }

    if (!subject || !rawTerm) {
      issues.push('missing_subject_or_term');
    }

    const termMainLinks = asArray(f.Term_Main).filter(isValidRecordId);
    const matchedTerm = resolveExportTerm(rawTerm, termMainLinks);
    if (!matchedTerm) {
      issues.push('invalid_term_mapping');
    }

    const rawSession = normalizeAcademicYear(firstString(f.Session || f['Academic Sessions']));
    if (rawSession && validSessionLabels.size > 0 && !validSessionLabels.has(rawSession)) {
      issues.push('session_term_mismatch');
    } else if (matchedTerm && rawSession && matchedTerm.academicYear !== rawSession) {
      issues.push('session_term_mismatch');
    }

    const resultClassLinks = asArray(f.Classes).filter(isValidRecordId);
    const lookupClassCode = normalizeClassCode(f['Class (from Student_Link)']);
    if (resultClassLinks.length > 0) {
      const linkedResultClass = validClassesByAirtableId.get(resultClassLinks[0]);
      if (!linkedResultClass) {
        issues.push('invalid_linked_class_record');
      } else if (
        (lookupClassCode && linkedResultClass.classCode !== lookupClassCode) ||
        (validStudent && linkedResultClass.airtableRecordId !== validStudent.classAirtableId)
      ) {
        issues.push('class_mapping_mismatch');
      }
    }

    const ca1Val =
      f['CA1 Score'] ?? f['Continuous Assessment 1 (Score)'] ?? f['CA1 (20%)'] ?? f.CA1 ?? 0;
    const ca2Val =
      f['CA2 Score'] ?? f['Continuous Assessment 2 (Score)'] ?? f['CA2 (20%)'] ?? f.CA2 ?? 0;
    const examVal = f['Exam Score'] ?? f['Exam (60%)'] ?? f.Exam ?? 0;
    const computed = computeScoreAndGrade({ ca1: ca1Val, ca2: ca2Val, exam: examVal });
    const sourceTotal = Number(f['Total Score'] ?? f['Total Score 1'] ?? computed.total ?? NaN);
    if (
      computed.error ||
      !Number.isFinite(sourceTotal) ||
      sourceTotal < 0 ||
      sourceTotal > 100 ||
      Math.abs(sourceTotal - computed.total) > 0.01
    ) {
      issues.push('invalid_score_range');
    }

    if (studentAirtableId && matchedTerm?.id && subject) {
      const comboKey = `${studentAirtableId}:${matchedTerm.id}:${subject.toLowerCase()}`;
      if ((resultComboFrequency.get(comboKey) || 0) > 1) {
        issues.push('duplicate_student_term_subject');
      }
    }

    const approved = f.Approved === true;
    const published = f.Published === true;
    const rawStatus = firstString(f.Status).toLowerCase();
    let publicationStatus = null;
    if (approved && published && rawStatus !== 'draft') {
      publicationStatus = 'published';
    } else if (rawStatus === 'draft' || (f.Approved === false && f.Published === false)) {
      publicationStatus = 'draft';
    } else {
      issues.push('ambiguous_publication_status');
    }

    if (issues.length > 0) {
      flagRecord(resultsSummary, recordId, issues);
      continue;
    }

    const termId = matchedTerm.id;
    const termName = matchedTerm.label.slice(0, 50);
    const teacherRemarks =
      firstString(f['Teacher Remarks'] || f.Teacher_Remarks) || null;
    const grade = firstString(f.Grade) || computed.grade;

    const existingRow = existingResultsByAirtableId.get(recordId) || null;
    const planned = {
      airtableRecordId: recordId,
      studentAirtableId,
      termId,
      termName,
      subject,
      ca1Score: Number(computed.ca1.toFixed(2)),
      ca2Score: Number(computed.ca2.toFixed(2)),
      examScore: Number(computed.exam.toFixed(2)),
      totalScore: Number(computed.total.toFixed(2)),
      grade,
      teacherRemarks,
      publicationStatus,
      existingId: existingRow?.id || null,
    };

    if (!existingRow) {
      resultsSummary.toInsert += 1;
      resultOperations.push({ action: 'insert', ...planned });
    } else {
      const unchanged =
        existingRow.airtable_record_id === recordId &&
        String(existingRow.term_id || '') === planned.termId &&
        String(existingRow.term_name || '') === planned.termName &&
        String(existingRow.subject || '') === planned.subject &&
        Number(existingRow.ca1_score) === planned.ca1Score &&
        Number(existingRow.ca2_score) === planned.ca2Score &&
        Number(existingRow.exam_score) === planned.examScore &&
        Number(existingRow.total_score) === planned.totalScore &&
        String(existingRow.grade || '') === planned.grade &&
        String(existingRow.teacher_remarks || '') === String(planned.teacherRemarks || '') &&
        String(existingRow.publication_status || '') === planned.publicationStatus;
      if (unchanged) {
        resultsSummary.toSkip += 1;
        resultOperations.push({ action: 'skip', ...planned });
      } else {
        resultsSummary.toUpdate += 1;
        resultOperations.push({ action: 'update', ...planned });
      }
    }
  }

  // 6. Validate & plan ATTENDANCE
  const attendanceRecords = recordsByTable.Attendance || [];
  const attendanceSummary = createTableSummary(attendanceRecords.length);
  const attendanceOperations = [];

  const attendanceComboFrequency = new Map();
  for (const rec of attendanceRecords) {
    const f = rec?.fields || {};
    const studentId = asArray(f.Student_Link).filter(isValidRecordId)[0] || '';
    const attDate = normalizeDate(f.Date);
    if (studentId && attDate) {
      const key = `${studentId}:${attDate}`;
      attendanceComboFrequency.set(key, (attendanceComboFrequency.get(key) || 0) + 1);
    }
  }

  const existingAttendanceByAirtableId = new Map(
    existing.attendance
      .filter((a) => a.airtable_record_id)
      .map((a) => [a.airtable_record_id, a]),
  );
  const existingAttendanceByStudentDate = new Map(
    existing.attendance.map((a) => [`${a.student_id}:${a.attendance_date}`, a]),
  );

  for (const rec of attendanceRecords) {
    const recordId = rec?.id;
    const f = rec?.fields || {};
    const issues = [];

    if (!isValidRecordId(recordId)) {
      issues.push('invalid_airtable_record_id');
    }

    const studentLinks = asArray(f.Student_Link).filter(isValidRecordId);
    if (studentLinks.length === 0) {
      issues.push('missing_student_link');
    } else if (studentLinks.length > 1) {
      issues.push('multiple_student_links');
    }

    const studentAirtableId = studentLinks[0] || null;
    const validStudent = studentAirtableId
      ? validStudentsByAirtableId.get(studentAirtableId)
      : null;
    if (studentAirtableId && !validStudent) {
      issues.push('missing_linked_student_record');
    }

    const attendanceDate = normalizeDate(f.Date);
    if (!attendanceDate) {
      issues.push('invalid_attendance_date');
    }

    const status = firstString(f.Attendance_Status).toLowerCase();
    if (!VALID_ATTENDANCE_STATUSES.has(status)) {
      issues.push('invalid_attendance_status');
    }

    if (studentAirtableId && attendanceDate) {
      const comboKey = `${studentAirtableId}:${attendanceDate}`;
      if ((attendanceComboFrequency.get(comboKey) || 0) > 1) {
        issues.push('duplicate_student_attendance_date');
      }
    }

    if (issues.length > 0) {
      flagRecord(attendanceSummary, recordId, issues);
      continue;
    }

    const reason = firstString(f['Teacher Comments'] || f.Notes || f.Reason) || null;
    const existingRow =
      existingAttendanceByAirtableId.get(recordId) ||
      (validStudent.existingId
        ? existingAttendanceByStudentDate.get(`${validStudent.existingId}:${attendanceDate}`)
        : null);

    const planned = {
      airtableRecordId: recordId,
      studentAirtableId,
      attendanceDate,
      status,
      reason,
      existingId: existingRow?.id || null,
    };

    if (!existingRow) {
      attendanceSummary.toInsert += 1;
      attendanceOperations.push({ action: 'insert', ...planned });
    } else {
      const unchanged =
        existingRow.airtable_record_id === recordId &&
        String(existingRow.attendance_date || '') === planned.attendanceDate &&
        String(existingRow.status || '') === planned.status &&
        String(existingRow.reason || '') === String(planned.reason || '');
      if (unchanged) {
        attendanceSummary.toSkip += 1;
        attendanceOperations.push({ action: 'skip', ...planned });
      } else {
        attendanceSummary.toUpdate += 1;
        attendanceOperations.push({ action: 'update', ...planned });
      }
    }
  }

  // 7. Validate & plan FEE_INVOICES (Fees.json)
  const feeRecords = recordsByTable.Fees || [];
  const paymentRecords = recordsByTable.Payments || [];
  const paymentRecordsById = new Map(paymentRecords.map((p) => [p.id, p]));
  const feeRecordsById = new Map(feeRecords.map((f) => [f.id, f]));

  const feeInvoicesSummary = createTableSummary(feeRecords.length);
  const validInvoicesByAirtableId = new Map();
  const invoiceOperations = [];

  const existingInvoicesByAirtableId = new Map(
    existing.feeInvoices
      .filter((inv) => inv.airtable_record_id)
      .map((inv) => [inv.airtable_record_id, inv]),
  );
  const existingInvoicesByNumber = new Map(
    existing.feeInvoices.map((inv) => [String(inv.invoice_number || '').trim().toUpperCase(), inv]),
  );

  for (const rec of feeRecords) {
    const recordId = rec?.id;
    const f = rec?.fields || {};
    const issues = [];

    if (!isValidRecordId(recordId)) {
      issues.push('invalid_airtable_record_id');
    }

    const studentLinks = asArray(f.Students).filter(isValidRecordId);
    if (studentLinks.length === 0) {
      issues.push('missing_student_link_class_template');
    } else if (studentLinks.length > 1) {
      issues.push('ambiguous_multi_student_invoice');
    }

    const studentAirtableId = studentLinks.length === 1 ? studentLinks[0] : null;
    const validStudent = studentAirtableId
      ? validStudentsByAirtableId.get(studentAirtableId)
      : null;

    if (studentLinks.length >= 1) {
      const anyMissingStudent = studentLinks.some((id) => !validStudentsByAirtableId.has(id));
      if (anyMissingStudent) {
        issues.push('missing_linked_student_record');
      }
    }

    const targetClassCode = normalizeClassCode(f.Target_class);
    if (validStudent && targetClassCode && targetClassCode !== validStudent.classCode) {
      issues.push('target_class_mismatch');
    } else if (targetClassCode && !CLASS_CODE_TO_NAME[targetClassCode]) {
      issues.push('target_class_mismatch');
    }

    const linkedPaymentIds = asArray(f.Payments).filter(isValidRecordId);
    for (const payId of linkedPaymentIds) {
      const payRec = paymentRecordsById.get(payId);
      const payStudentIds = asArray(payRec?.fields?.Student_Link).filter(isValidRecordId);
      if (
        studentAirtableId &&
        payStudentIds.length > 0 &&
        (payStudentIds.length !== 1 || payStudentIds[0] !== studentAirtableId)
      ) {
        issues.push('cross_student_payment_link');
      }
    }

    const amountDue = Number(f.Amount_Billed ?? f.Amount_Due ?? NaN);
    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      issues.push('invalid_invoice_amount');
    }

    const rawTerm = firstString(f.Term || f.Fee_ID);
    const matchedTerm = resolveExportTerm(rawTerm);
    if (!matchedTerm) {
      issues.push('invalid_term_mapping');
    }

    const dueDate = normalizeDate(f.Due_Date) || '2026-01-31';
    const rawInvoiceNumber = firstString(f.Invoice_Number || f.Invoice_Code);
    const invoiceNumber =
      rawInvoiceNumber || `MLS-INV-${String(recordId || '').replace(/^rec/, '').toUpperCase()}`;

    if (issues.length > 0) {
      flagRecord(feeInvoicesSummary, recordId, issues);
      continue;
    }

    const description = firstString(f.Fee_ID || f.Notes) || matchedTerm.label;

    const existingRow =
      existingInvoicesByAirtableId.get(recordId) ||
      existingInvoicesByNumber.get(invoiceNumber.toUpperCase()) ||
      null;

    const planned = {
      airtableRecordId: recordId,
      studentAirtableId,
      invoiceNumber,
      description,
      amountDue: Number(amountDue.toFixed(2)),
      dueDate,
      status: 'unpaid',
      existingId: existingRow?.id || null,
    };

    validInvoicesByAirtableId.set(recordId, planned);
    invoiceOperations.push(planned);
  }

  // 8. Validate & plan PAYMENTS (Payments.json)
  const paymentsSummary = createTableSummary(paymentRecords.length);
  const paymentOperations = [];
  const seenReceiptNumbers = new Set();
  const cumulativePaidByInvoice = new Map();

  const existingPaymentsByAirtableId = new Map(
    existing.payments
      .filter((p) => p.airtable_record_id)
      .map((p) => [p.airtable_record_id, p]),
  );
  const existingPaymentsByReceipt = new Map(
    existing.payments.map((p) => [String(p.receipt_number || '').trim().toUpperCase(), p]),
  );

  for (const rec of paymentRecords) {
    const recordId = rec?.id;
    const f = rec?.fields || {};
    const issues = [];

    if (!isValidRecordId(recordId)) {
      issues.push('invalid_airtable_record_id');
    }

    const studentLinks = asArray(f.Student_Link).filter(isValidRecordId);
    if (studentLinks.length === 0) {
      issues.push('missing_student_link');
    } else if (studentLinks.length > 1) {
      issues.push('multiple_student_links');
    }
    const studentAirtableId = studentLinks[0] || null;
    const validStudent = studentAirtableId
      ? validStudentsByAirtableId.get(studentAirtableId)
      : null;
    if (studentAirtableId && !validStudent) {
      issues.push('missing_linked_student_record');
    }

    const feeLinks = asArray(f.Fees_Link).filter(isValidRecordId);
    if (feeLinks.length === 0) {
      issues.push('missing_invoice_link');
    } else if (feeLinks.length > 1) {
      issues.push('multiple_invoice_links');
    }

    const invoiceAirtableId = feeLinks[0] || null;
    const rawFeeRec = invoiceAirtableId ? feeRecordsById.get(invoiceAirtableId) : null;
    const validInvoice = invoiceAirtableId
      ? validInvoicesByAirtableId.get(invoiceAirtableId)
      : null;

    if (invoiceAirtableId && !rawFeeRec) {
      issues.push('missing_linked_invoice_record');
    } else if (rawFeeRec) {
      const feeStudentIds = asArray(rawFeeRec?.fields?.Students).filter(isValidRecordId);
      if (feeStudentIds.length === 0) {
        issues.push('invoice_missing_student_link');
      } else if (feeStudentIds.length > 1) {
        issues.push('ambiguous_multi_student_invoice');
      } else if (studentAirtableId && feeStudentIds[0] !== studentAirtableId) {
        issues.push('payment_invoice_student_mismatch');
      }
      if (!validInvoice) {
        issues.push('flagged_linked_invoice_record');
      }
    }

    const receiptNumber = firstString(f.Official_Receipt_Number || f.Receipt_Number);
    if (!receiptNumber) {
      issues.push('missing_receipt_number');
    } else if (seenReceiptNumbers.has(receiptNumber.toUpperCase())) {
      issues.push('duplicate_receipt_number_in_source');
    }

    const amountPaid = Number(f.Amount_Paid ?? NaN);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      issues.push('invalid_payment_amount');
    }

    const paymentDate = normalizeDate(f.Payment_Date);
    if (!paymentDate) {
      issues.push('invalid_payment_date');
    }

    const paymentMethod = normalizePaymentMethod(f.Payment_Method);
    if (!paymentMethod) {
      issues.push('missing_payment_method');
    }

    if (validInvoice && Number.isFinite(amountPaid) && amountPaid > 0) {
      const nextTotal = (cumulativePaidByInvoice.get(invoiceAirtableId) || 0) + amountPaid;
      if (nextTotal - validInvoice.amountDue > 0.01) {
        issues.push('payment_exceeds_invoice_amount');
      }
    }

    if (issues.length > 0) {
      flagRecord(paymentsSummary, recordId, issues);
      continue;
    }

    seenReceiptNumbers.add(receiptNumber.toUpperCase());
    const nextInvoicePaid =
      (cumulativePaidByInvoice.get(invoiceAirtableId) || 0) + Number(amountPaid.toFixed(2));
    cumulativePaidByInvoice.set(invoiceAirtableId, nextInvoicePaid);

    const existingRow =
      existingPaymentsByAirtableId.get(recordId) ||
      existingPaymentsByReceipt.get(receiptNumber.toUpperCase()) ||
      null;

    const planned = {
      airtableRecordId: recordId,
      invoiceAirtableId,
      studentAirtableId,
      receiptNumber,
      amountPaid: Number(amountPaid.toFixed(2)),
      paymentDate,
      paymentMethod,
      reference: firstString(f.Payment_Reference || f['Bursar Internal Notes'] || f.Notes) || null,
      existingId: existingRow?.id || null,
    };

    if (!existingRow) {
      paymentsSummary.toInsert += 1;
      paymentOperations.push({ action: 'insert', ...planned });
    } else {
      const unchanged =
        existingRow.airtable_record_id === recordId &&
        String(existingRow.receipt_number || '') === planned.receiptNumber &&
        Number(existingRow.amount_paid) === planned.amountPaid &&
        String(existingRow.payment_date || '') === planned.paymentDate &&
        String(existingRow.payment_method || '') === planned.paymentMethod &&
        String(existingRow.reference || '') === String(planned.reference || '');
      if (unchanged) {
        paymentsSummary.toSkip += 1;
        paymentOperations.push({ action: 'skip', ...planned });
      } else {
        paymentsSummary.toUpdate += 1;
        paymentOperations.push({ action: 'update', ...planned });
      }
    }
  }

  for (const inv of invoiceOperations) {
    const paid = Number((cumulativePaidByInvoice.get(inv.airtableRecordId) || 0).toFixed(2));
    const balance = Number(Math.max(0, inv.amountDue - paid).toFixed(2));
    const status = balance <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid';
    inv.status = status;

    const existingRow =
      existingInvoicesByAirtableId.get(inv.airtableRecordId) ||
      existingInvoicesByNumber.get(inv.invoiceNumber.toUpperCase()) ||
      null;

    if (!existingRow) {
      feeInvoicesSummary.toInsert += 1;
      inv.action = 'insert';
    } else {
      const unchanged =
        existingRow.airtable_record_id === inv.airtableRecordId &&
        String(existingRow.invoice_number || '') === inv.invoiceNumber &&
        String(existingRow.description || '') === inv.description &&
        Number(existingRow.amount_due) === inv.amountDue &&
        String(existingRow.due_date || '') === inv.dueDate &&
        String(existingRow.status || '') === inv.status;
      if (unchanged) {
        feeInvoicesSummary.toSkip += 1;
        inv.action = 'skip';
      } else {
        feeInvoicesSummary.toUpdate += 1;
        inv.action = 'update';
      }
    }
  }

  // Apply phase (only when apply === true)
  if (apply) {
    const classIdByAirtableId = new Map();
    for (const op of classOperations) {
      if (op.action === 'insert') {
        const [res] = await executor.query(
          'INSERT INTO classes (airtable_record_id, name) VALUES (?, ?)',
          [op.airtableRecordId, op.name],
        );
        classIdByAirtableId.set(op.airtableRecordId, res.insertId);
      } else if (op.action === 'update') {
        await executor.query('UPDATE classes SET airtable_record_id = ?, name = ? WHERE id = ?', [
          op.airtableRecordId,
          op.name,
          op.existingId,
        ]);
        classIdByAirtableId.set(op.airtableRecordId, op.existingId);
      } else if (op.existingId) {
        classIdByAirtableId.set(op.airtableRecordId, op.existingId);
      }
    }

    const studentIdByAirtableId = new Map();
    for (const op of studentOperations) {
      const classId = classIdByAirtableId.get(op.classAirtableId);
      if (op.action === 'insert') {
        const [res] = await executor.query(
          `INSERT INTO students
             (airtable_record_id, student_code, first_name, last_name, date_of_birth, class_id, enrollment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            op.airtableRecordId,
            op.studentCode,
            op.firstName,
            op.lastName,
            op.dateOfBirth,
            classId,
            op.enrollmentStatus,
          ],
        );
        studentIdByAirtableId.set(op.airtableRecordId, res.insertId);
      } else if (op.action === 'update') {
        await executor.query(
          `UPDATE students
              SET airtable_record_id = ?,
                  student_code = ?,
                  first_name = ?,
                  last_name = ?,
                  date_of_birth = ?,
                  class_id = ?,
                  enrollment_status = ?
            WHERE id = ?`,
          [
            op.airtableRecordId,
            op.studentCode,
            op.firstName,
            op.lastName,
            op.dateOfBirth,
            classId,
            op.enrollmentStatus,
            op.existingId,
          ],
        );
        studentIdByAirtableId.set(op.airtableRecordId, op.existingId);
      } else if (op.existingId) {
        studentIdByAirtableId.set(op.airtableRecordId, op.existingId);
      }
    }

    const parentIdByAirtableId = new Map();
    for (const op of parentOperations) {
      if (op.action === 'insert') {
        const [res] = await executor.query(
          `INSERT INTO parents
             (airtable_record_id, full_name, email, phone, status)
           VALUES (?, ?, ?, ?, ?)`,
          [op.airtableRecordId, op.fullName, op.email, op.phone, op.status],
        );
        parentIdByAirtableId.set(op.airtableRecordId, res.insertId);
      } else if (op.action === 'update') {
        await executor.query(
          `UPDATE parents
              SET airtable_record_id = ?,
                  full_name = ?,
                  email = ?,
                  phone = ?,
                  status = ?
            WHERE id = ?`,
          [op.airtableRecordId, op.fullName, op.email, op.phone, op.status, op.existingId],
        );
        parentIdByAirtableId.set(op.airtableRecordId, op.existingId);
      } else if (op.existingId) {
        parentIdByAirtableId.set(op.airtableRecordId, op.existingId);
      }
    }

    for (const op of parentStudentOperations) {
      const parentId = parentIdByAirtableId.get(op.parentAirtableId);
      const studentId = studentIdByAirtableId.get(op.studentAirtableId);
      if (!parentId || !studentId) continue;

      if (op.action === 'insert') {
        await executor.query(
          `INSERT INTO parent_students
             (parent_id, student_id, airtable_record_id, relationship, is_primary_guardian)
           VALUES (?, ?, ?, ?, ?)`,
          [parentId, studentId, op.airtableRecordId, op.relationship, op.isPrimaryGuardian],
        );
      } else if (op.action === 'update') {
        await executor.query(
          `UPDATE parent_students
              SET airtable_record_id = ?, relationship = ?, is_primary_guardian = ?
            WHERE parent_id = ? AND student_id = ?`,
          [op.airtableRecordId, op.relationship, op.isPrimaryGuardian, parentId, studentId],
        );
      }
    }

    for (const op of resultOperations) {
      const studentId = studentIdByAirtableId.get(op.studentAirtableId);
      if (!studentId) continue;

      if (op.action === 'insert') {
        await executor.query(
          `INSERT INTO academic_results
             (airtable_record_id, student_id, term_id, term_name, subject, ca1_score, ca2_score, exam_score, total_score, grade, teacher_remarks, publication_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            op.airtableRecordId,
            studentId,
            op.termId,
            op.termName,
            op.subject,
            op.ca1Score,
            op.ca2Score,
            op.examScore,
            op.totalScore,
            op.grade,
            op.teacherRemarks,
            op.publicationStatus,
          ],
        );
      } else if (op.action === 'update') {
        await executor.query(
          `UPDATE academic_results
              SET airtable_record_id = ?,
                  student_id = ?,
                  term_id = ?,
                  term_name = ?,
                  subject = ?,
                  ca1_score = ?,
                  ca2_score = ?,
                  exam_score = ?,
                  total_score = ?,
                  grade = ?,
                  teacher_remarks = ?,
                  publication_status = ?
            WHERE id = ?`,
          [
            op.airtableRecordId,
            studentId,
            op.termId,
            op.termName,
            op.subject,
            op.ca1Score,
            op.ca2Score,
            op.examScore,
            op.totalScore,
            op.grade,
            op.teacherRemarks,
            op.publicationStatus,
            op.existingId,
          ],
        );
      }
    }

    for (const op of attendanceOperations) {
      const studentId = studentIdByAirtableId.get(op.studentAirtableId);
      if (!studentId) continue;

      if (op.action === 'insert') {
        await executor.query(
          `INSERT INTO attendance
             (airtable_record_id, student_id, attendance_date, status, reason)
           VALUES (?, ?, ?, ?, ?)`,
          [op.airtableRecordId, studentId, op.attendanceDate, op.status, op.reason],
        );
      } else if (op.action === 'update') {
        await executor.query(
          `UPDATE attendance
              SET airtable_record_id = ?,
                  student_id = ?,
                  attendance_date = ?,
                  status = ?,
                  reason = ?
            WHERE id = ?`,
          [op.airtableRecordId, studentId, op.attendanceDate, op.status, op.reason, op.existingId],
        );
      }
    }

    const invoiceIdByAirtableId = new Map();
    for (const op of invoiceOperations) {
      const studentId = studentIdByAirtableId.get(op.studentAirtableId);
      if (!studentId) continue;

      if (op.action === 'insert') {
        const [res] = await executor.query(
          `INSERT INTO fee_invoices
             (airtable_record_id, student_id, invoice_number, description, amount_due, due_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            op.airtableRecordId,
            studentId,
            op.invoiceNumber,
            op.description,
            op.amountDue,
            op.dueDate,
            op.status,
          ],
        );
        invoiceIdByAirtableId.set(op.airtableRecordId, res.insertId);
      } else if (op.action === 'update') {
        await executor.query(
          `UPDATE fee_invoices
              SET airtable_record_id = ?,
                  student_id = ?,
                  invoice_number = ?,
                  description = ?,
                  amount_due = ?,
                  due_date = ?,
                  status = ?
            WHERE id = ?`,
          [
            op.airtableRecordId,
            studentId,
            op.invoiceNumber,
            op.description,
            op.amountDue,
            op.dueDate,
            op.status,
            op.existingId,
          ],
        );
        invoiceIdByAirtableId.set(op.airtableRecordId, op.existingId);
      } else if (op.existingId) {
        invoiceIdByAirtableId.set(op.airtableRecordId, op.existingId);
      }
    }

    for (const op of paymentOperations) {
      const invoiceId = invoiceIdByAirtableId.get(op.invoiceAirtableId);
      if (!invoiceId) continue;

      if (op.action === 'insert') {
        await executor.query(
          `INSERT INTO payments
             (airtable_record_id, invoice_id, receipt_number, amount_paid, payment_date, payment_method, reference)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            op.airtableRecordId,
            invoiceId,
            op.receiptNumber,
            op.amountPaid,
            op.paymentDate,
            op.paymentMethod,
            op.reference,
          ],
        );
      } else if (op.action === 'update') {
        await executor.query(
          `UPDATE payments
              SET airtable_record_id = ?,
                  invoice_id = ?,
                  receipt_number = ?,
                  amount_paid = ?,
                  payment_date = ?,
                  payment_method = ?,
                  reference = ?
            WHERE id = ?`,
          [
            op.airtableRecordId,
            invoiceId,
            op.receiptNumber,
            op.amountPaid,
            op.paymentDate,
            op.paymentMethod,
            op.reference,
            op.existingId,
          ],
        );
      }
    }
  }

  return {
    mode: apply ? 'apply' : 'dry-run',
    inventory: {
      totalSchemaTables: (schemaDoc.tables || []).length,
      availableFileCount: availableFiles.length,
      missingFileCount: missingFiles.length,
      availableFiles,
      missingFiles,
      brokenRelationships,
    },
    tables: {
      classes: classesSummary,
      students: studentsSummary,
      parents: parentsSummary,
      parent_students: parentStudentsSummary,
      academic_results: resultsSummary,
      attendance: attendanceSummary,
      fee_invoices: feeInvoicesSummary,
      payments: paymentsSummary,
    },
  };
}

export function formatImportReport(report) {
  const lines = [];
  lines.push(`=== Marie Louise School Airtable-to-MySQL Importer (${report.mode.toUpperCase()}) ===`);
  lines.push(
    `Schema Tables: ${report.inventory.totalSchemaTables} | Available Export Files: ${report.inventory.availableFileCount} | Missing Export Files: ${report.inventory.missingFileCount}`,
  );
  lines.push('');
  lines.push('--- Available Export Files ---');
  for (const f of report.inventory.availableFiles) {
    lines.push(
      `  - ${f.fileName} (${f.tableId || 'unmapped'}): ${f.recordCount} records -> operational: ${f.operationalTarget || 'reference-only'}`,
    );
  }
  lines.push('');
  lines.push('--- Missing Export Files (from MLS_Full_Schema.docx) ---');
  for (const m of report.inventory.missingFiles) {
    lines.push(
      `  - ${m.expectedFileName} (${m.tableId}): missing${m.operationalTarget ? ` [operational target: ${m.operationalTarget}]` : ''}`,
    );
  }
  lines.push('');
  lines.push('--- Broken / Unexported Cross-Table Links ---');
  for (const b of report.inventory.brokenRelationships) {
    lines.push(
      `  - ${b.sourceTable}.${b.field} -> ${b.targetTable}: ${b.affectedSourceRecordCount} source record(s) reference ${b.missingTargetRecordCount} missing target record(s) (target file exported: ${b.targetFileExported ? 'yes, partial' : 'no'})`,
    );
  }
  lines.push('');
  lines.push('--- Operational Table Import Summary (Zero PII) ---');
  for (const [tableName, summary] of Object.entries(report.tables)) {
    lines.push(
      `  [${tableName}] source=${summary.sourceCount} | insert=${summary.toInsert} | update=${summary.toUpdate} | skip=${summary.toSkip} | flagged=${summary.flagged}`,
    );
    const issueEntries = Object.entries(summary.issues);
    if (issueEntries.length > 0) {
      for (const [issueCode, count] of issueEntries) {
        lines.push(`      * issue "${issueCode}": ${count}`);
      }
    }
  }
  return lines.join('\n');
}

function parseCliArgs(argv) {
  let apply = false;
  let jsonOutput = false;
  let sourceDir = DEFAULT_EXPORT_DIR;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--json') jsonOutput = true;
    else if (arg === '--source' && argv[i + 1]) {
      sourceDir = argv[i + 1];
      i += 1;
    }
  }

  return { apply, jsonOutput, sourceDir };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  try {
    const report = await runAirtableImport(cliOptions);
    if (cliOptions.jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatImportReport(report));
    }
  } finally {
    await pool.end();
  }
}
