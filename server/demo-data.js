// Seeds the fictional families in shared/portal-demo.js into the separate *_demo database (`npm run demo`).
import { randomBytes } from 'node:crypto';
import calendar from '../schema/academic-calendar.json' with { type: 'json' };
import { termLabel } from './academic-calendar.js';
import { hashPassword } from './auth.js';
import { DEMO_CLASSES, DEMO_PUPILS, DEMO_PARENTS, SIGN_IN_EXAMPLES, buildDemoRecords, demoTerm } from '../shared/portal-demo.js';

export { SIGN_IN_EXAMPLES };

/** Fills an EMPTY demo database. `db` is a single connection inside a transaction. */
export async function seedDemo(db) {
  const records = buildDemoRecords(demoTerm(calendar, termLabel));
  const classIds = {}, pupilIds = {};
  for (const name of DEMO_CLASSES) classIds[name] = (await db.query('INSERT INTO classes(name) VALUES (?)', [name]))[0].insertId;
  for (const p of DEMO_PUPILS) {
    pupilIds[p.key] = (await db.query('INSERT INTO students(airtable_record_id,student_code,first_name,last_name,date_of_birth,class_id,enrollment_status) VALUES (?,?,?,?,?,?,?)',
      [`recDemoPupil${p.key}`, p.code, p.first, p.last, p.dob, classIds[p.cls], p.status]))[0].insertId;
  }
  for (const parent of DEMO_PARENTS) {
    const id = (await db.query("INSERT INTO parents(airtable_record_id,full_name,email,status) VALUES (?,?,?,'active')", [`recDemoParent${parent.key}`, parent.name, parent.email]))[0].insertId;
    for (const [child, relationship] of parent.children) {
      await db.query('INSERT INTO parent_students(parent_id,student_id,airtable_record_id,relationship,is_primary_guardian) VALUES (?,?,?,?,TRUE)', [id, pupilIds[child], `recDemoLink${parent.key}${child}`, relationship]);
    }
    if (parent.existingAccount) {
      await db.query("INSERT INTO accounts(full_name,email,password_hash,role,parent_id) VALUES (?,?,?,'parent',?)", [parent.name, parent.email, await hashPassword(randomBytes(32).toString('hex')), id]);
    }
  }
  for (const r of records.results) {
    await db.query("INSERT INTO academic_results(student_id,term_name,term_id,subject,ca1_score,ca2_score,exam_score,total_score,grade,teacher_remarks,publication_status) VALUES (?,?,?,?,?,?,?,?,?,?,'published')",
      [pupilIds[r.pupil], r.term_name, r.term_id, r.subject, r.ca1_score, r.ca2_score, r.exam_score, r.total_score, r.grade, r.teacher_remarks]);
  }
  for (const a of records.attendance) {
    await db.query('INSERT INTO attendance(student_id,attendance_date,status,reason) VALUES (?,?,?,?)', [pupilIds[a.pupil], a.attendance_date, a.status, a.reason]);
  }
  for (const inv of records.invoices) {
    const invoiceId = (await db.query('INSERT INTO fee_invoices(student_id,invoice_number,description,amount_due,due_date,status) VALUES (?,?,?,?,?,?)',
      [pupilIds[inv.pupil], inv.invoice_number, inv.description, inv.amount_due, inv.due_date, inv.status]))[0].insertId;
    for (const p of inv.payments) {
      await db.query('INSERT INTO payments(invoice_id,receipt_number,amount_paid,payment_date,payment_method,reference) VALUES (?,?,?,?,?,?)',
        [invoiceId, p.receipt_number, p.amount_paid, p.payment_date, p.payment_method, p.reference]);
    }
  }
  for (const n of records.notices) {
    await db.query('INSERT INTO announcements(title,message,audience,class_id,student_id,is_published,published_at) VALUES (?,?,?,?,?,?,?)',
      [n.title, n.message, n.audience, n.cls ? classIds[n.cls] : null, n.pupil ? pupilIds[n.pupil] : null, n.is_published, n.published_at]);
  }
  return { classes: DEMO_CLASSES.length, pupils: DEMO_PUPILS.length, parents: DEMO_PARENTS.length };
}
