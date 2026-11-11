// Parent Email + Unique ID sign-in, end to end, against the local database with synthetic data only.
// Every row is created from this run's random suffix and removed by exact ID afterwards.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';

const runDbTests = process.env.RUN_DB_TESTS === '1';

test('parent sign-in with Email + Unique ID and emailed code', { skip: !runDbTests, timeout: 180000 }, async (t) => {
  const { app, resetRateLimitsForTesting } = await import('../app.js');
  const { pool } = await import('../db.js');
  const { hashPassword } = await import('../auth.js');
  const { migrate } = await import('../migrate.js');
  const { runAirtableImport } = await import('../import-airtable.js');
  const { setMailTransportForTesting } = await import('../mailer.js');
  const { GENERIC_SIGN_IN_ERROR, MAX_CODE_ATTEMPTS } = await import('../parent-access.js');

  await migrate();
  const run = randomBytes(3).toString('hex');
  const RUN = run.toUpperCase();
  const rid = (name) => `recPsi${run}${name}`; // e.g. recPsia1b2c3Stud01 (valid Airtable-style ID)
  const ids = {
    class: rid('Class01'),
    studExisting: rid('StudEx1'), studNew: rid('StudNw1'), studSibA: rid('StudSbA'), studSibB: rid('StudSbB'),
    studLookalike: rid('StudLk1'), studStaff: rid('StudSt1'), studPending: rid('StudPd1'), studManual: rid('StudMn1'),
    parExisting: rid('ParEx01'), parNew: rid('ParNw01'), parSib: rid('ParSb01'), parStaff: rid('ParSt01'), parManual: rid('ParMn01'),
    linkSibB: rid('LinkSbB'),
  };
  const code = (n) => `PSI-${RUN}-${n}`;
  const codes = { existing: code('001'), new: code('002'), sibA: code('003'), sibB: code('004'), lookalike: code('005'), staff: code('006'), pending: code('007'), manual: code('008') };
  const mail = (who) => `psi-${run}-${who}@example.invalid`;
  const emails = { existing: mail('existing'), new: mail('new'), sib: mail('sibling'), staff: mail('staff'), manual: mail('manual') };
  const startedAt = new Date(Date.now() - 2000);

  // --- Synthetic Airtable exports -------------------------------------------------------------
  function student(id, studentCode, first, parents = [], extra = {}) {
    return { id, fields: { StudentIDCode: studentCode, First_Name: first, Last_Name: `Psi${run}`, 'Student Class': [ids.class], Enrollment_Status: 'Active', ...(parents.length ? { Parents: parents } : {}), ...extra } };
  }
  function parent(id, name, address, students) {
    return { id, fields: { 'Parent Name': name, ParentEmail: address, Relationship: 'Mother', Students: students } };
  }
  function writeExport({ includeNew = false, removeLinks = false } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mls-psi-'));
    const write = (name, rows) => fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(rows), 'utf8');
    write('Classes', [{ id: ids.class, fields: { 'Class Name': `PSI ${run} Primary 1`, 'Class Code': 'P1', 'Academic Year': '2025/26' } }]);
    const students = [
      student(ids.studExisting, codes.existing, 'Existing', removeLinks ? [] : [ids.parExisting]),
      student(ids.studSibA, codes.sibA, 'SiblingA', [ids.parSib]),
      // Recorded link to the sibling family, but enrolment is still Pending: not eligible.
      student(ids.studPending, codes.pending, 'PendingSib', [ids.parSib], { Enrollment_Status: 'Pending' }),
      // Airtable parent whose email already belongs to a parent created by staff in the portal.
      student(ids.studManual, codes.manual, 'ManualOwner', [ids.parManual]),
      // Sibling B is linked only through the ParentStudentLinks junction table.
      student(ids.studSibB, codes.sibB, 'SiblingB'),
      // Same surname and the sibling parent's email typed on the record, but no recorded link.
      student(ids.studLookalike, codes.lookalike, 'Lookalike', [], { Parent_Email: emails.sib }),
      student(ids.studStaff, codes.staff, 'StaffChild', [ids.parStaff]),
    ];
    const parents = [
      parent(ids.parExisting, `Psi Existing ${run}`, emails.existing, removeLinks ? [] : [ids.studExisting]),
      parent(ids.parSib, `Psi Sibling ${run}`, emails.sib, [ids.studSibA, ids.studPending]),
      parent(ids.parStaff, `Psi Staff ${run}`, emails.staff, [ids.studStaff]),
      parent(ids.parManual, `Psi Manual ${run}`, emails.manual, [ids.studManual]),
    ];
    if (includeNew) {
      students.push(student(ids.studNew, codes.new, 'Newcomer', [ids.parNew]));
      parents.push(parent(ids.parNew, `Psi New ${run}`, emails.new, [ids.studNew]));
    }
    write('Students', students);
    write('Parents', parents);
    write('ParentStudentLinks', [{ id: ids.linkSibB, fields: { Parent: [ids.parSib], Student: [ids.studSibB], Relationship: 'Mother', Link_Status: removeLinks ? 'Revoked' : 'Active' } }]);
    return dir;
  }
  async function importExport(options) {
    const dir = writeExport(options);
    try { return await runAirtableImport({ sourceDir: dir, apply: true }); }
    finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }

  // --- Cleanup by exact IDs --------------------------------------------------------------------
  let server;
  const outbox = [];
  const logged = [];
  const originalConsole = { log: console.log, error: console.error, warn: console.warn };
  t.after(async () => {
    Object.assign(console, originalConsole);
    setMailTransportForTesting(null);
    try {
      if (server) { server.closeAllConnections(); await new Promise((r) => server.close(r)); }
    } finally {
      try {
        const allEmails = Object.values(emails);
        const recordIds = Object.values(ids);
        await pool.query('DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE email IN (?))', [allEmails]);
        await pool.query('DELETE FROM accounts WHERE email IN (?)', [allEmails]);
        await pool.query('DELETE ps FROM parent_students ps JOIN students s ON s.id = ps.student_id WHERE s.airtable_record_id IN (?)', [recordIds]);
        await pool.query('DELETE ps FROM parent_students ps JOIN parents p ON p.id = ps.parent_id WHERE p.airtable_record_id IN (?) OR p.email LIKE ?', [recordIds, `%psi-${run}-%`]);
        await pool.query('DELETE FROM parent_sign_in_challenges WHERE parent_id IS NULL AND created_at >= ?', [startedAt]);
        await pool.query('DELETE FROM parents WHERE airtable_record_id IN (?) OR email LIKE ?', [recordIds, `%psi-${run}-%`]);
        await pool.query('DELETE FROM students WHERE airtable_record_id IN (?)', [recordIds]);
        await pool.query('DELETE FROM classes WHERE airtable_record_id IN (?)', [recordIds]);
        for (const mirror of ['mls_airtable_classes', 'mls_airtable_students', 'mls_airtable_parents', 'mls_airtable_parentstudentlinks']) {
          try { await pool.query(`DELETE FROM \`${mirror}\` WHERE airtable_record_id IN (?)`, [recordIds]); }
          catch (error) { if (error.code !== 'ER_NO_SUCH_TABLE') throw error; }
        }
        const [[left]] = await pool.query('SELECT (SELECT COUNT(*) FROM students WHERE airtable_record_id IN (?)) + (SELECT COUNT(*) FROM parents WHERE airtable_record_id IN (?)) + (SELECT COUNT(*) FROM accounts WHERE email IN (?)) AS n', [recordIds, recordIds, allEmails]);
        assert.equal(Number(left.n), 0, 'fixture cleanup');
      } finally { await pool.end(); }
    }
  });

  // --- Setup: existing Airtable families, one pre-existing portal account, one staff collision -----
  setMailTransportForTesting((message) => { outbox.push(message); });
  // A parent record + account created by staff in the portal before Airtable had them.
  const [manualParent] = await pool.query("INSERT INTO parents (full_name, email, status) VALUES (?, ?, 'active')", [`Psi Manual ${run}`, emails.manual]);
  await pool.query("INSERT INTO accounts (full_name, email, password_hash, role, parent_id) VALUES (?, ?, ?, 'parent', ?)", [`Psi Manual ${run}`, emails.manual, await hashPassword('Manual-parent-password-123!'), manualParent.insertId]);
  const firstImport = await importExport();
  assert.equal(firstImport.tables.students.flagged, 0, JSON.stringify(firstImport.tables.students.issues));
  assert.equal(firstImport.tables.parent_students.toInsert, 5); // existing, sibA, sibB (junction), pending sib, staff child
  assert.equal(firstImport.tables.parents.issues.email_conflict_with_existing_parent, 1, 'portal-created parent left unmatched');
  const dbId = async (table, airtableId) => (await pool.query(`SELECT id FROM ${table} WHERE airtable_record_id = ?`, [airtableId]))[0][0]?.id;
  const sid = {};
  for (const key of ['studExisting', 'studSibA', 'studSibB', 'studLookalike', 'studStaff', 'studPending', 'studManual']) sid[key] = await dbId('students', ids[key]);
  const pid = { existing: await dbId('parents', ids.parExisting), sib: await dbId('parents', ids.parSib) };

  const legacyPassword = 'Legacy-parent-password-123!';
  const [existingAccount] = await pool.query("INSERT INTO accounts (full_name, email, password_hash, role, parent_id) VALUES (?, ?, ?, 'parent', ?)", [`Psi Existing ${run}`, emails.existing, await hashPassword(legacyPassword), pid.existing]);
  await pool.query("INSERT INTO accounts (full_name, email, password_hash, role) VALUES (?, ?, ?, 'teacher')", [`Psi Staff ${run}`, emails.staff, await hashPassword(legacyPassword)]);

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(method, route, { body, cookie } = {}) {
    const response = await fetch(base + route, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json().catch(() => null), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  // Captures console output during sign-in flows to prove IDs and codes never reach logs.
  for (const level of ['log', 'error', 'warn']) console[level] = (...args) => { logged.push(args.map(String).join(' ')); originalConsole[level](...args); };

  async function startSignIn(address, uniqueId) {
    const before = outbox.length;
    const res = await call('POST', '/auth/parent/start', { body: { email: address, unique_id: uniqueId } });
    const sent = outbox.slice(before);
    // Outside the demo database the code is only ever emailed, never returned (no `demo` field).
    if (res.status === 200) assert.deepEqual(Object.keys(res.data).sort(), ['challenge', 'expires_in_minutes']);
    const emailed = sent.length ? sent[0].text.match(/code is: (\d{6})/)[1] : null;
    return { ...res, sent, emailed };
  }
  async function signIn(address, uniqueId) {
    const started = await startSignIn(address, uniqueId);
    assert.equal(started.status, 200, JSON.stringify(started.data));
    assert.equal(started.sent.length, 1, 'a code must be emailed for a matching pair');
    assert.equal(started.sent[0].to, address);
    const verified = await call('POST', '/auth/parent/verify', { body: { challenge: started.data.challenge, code: started.emailed } });
    assert.equal(verified.status, 200, JSON.stringify(verified.data));
    assert.match(verified.cookie, /^ml_session=[a-f0-9]{64}$/);
    return { user: verified.data.user, cookie: verified.cookie, code: started.emailed, challenge: started.data.challenge };
  }
  async function assertDenied(address, uniqueId) {
    const started = await startSignIn(address, uniqueId);
    assert.equal(started.status, 200, 'start must look identical for non-matching details');
    assert.deepEqual(Object.keys(started.data).sort(), ['challenge', 'expires_in_minutes']);
    assert.equal(started.sent.length, 0, 'no code may be emailed for non-matching details');
    for (const guess of ['000000', '123456']) {
      const verified = await call('POST', '/auth/parent/verify', { body: { challenge: started.data.challenge, code: guess } });
      assert.equal(verified.status, 401);
      assert.equal(verified.data.error, GENERIC_SIGN_IN_ERROR);
    }
  }
  const childIds = async (cookie) => (await call('GET', '/students', { cookie })).data.map((s) => s.id).sort((a, b) => a - b);
  const sorted = (...values) => values.sort((a, b) => a - b);

  let existingCookie, siblingCookie;

  await t.test('existing parent signs in and keeps their existing account', async () => {
    resetRateLimitsForTesting();
    const { user, cookie } = await signIn(emails.existing, codes.existing.toLowerCase()); // ID is case-insensitive
    assert.equal(user.id, existingAccount.insertId);
    assert.equal(user.role, 'parent');
    assert.equal(user.parent_id, pid.existing);
    assert.deepEqual(await childIds(cookie), [sid.studExisting]);
    const [[count]] = await pool.query('SELECT COUNT(*) n FROM accounts WHERE email = ?', [emails.existing]);
    assert.equal(Number(count.n), 1, 'no duplicate account created');
    const legacy = await call('POST', '/auth/login', { body: { email: emails.existing, password: legacyPassword } });
    assert.equal(legacy.status, 200, 'existing password sign-in is preserved');
    existingCookie = cookie;
  });

  await t.test('newly enrolled parent gets access as soon as the import adds them, with no staff step', async () => {
    resetRateLimitsForTesting();
    await assertDenied(emails.new, codes.new); // not in the portal yet
    const report = await importExport({ includeNew: true });
    assert.equal(report.tables.parents.toInsert, 1);
    assert.equal(report.tables.parent_students.toInsert, 1);
    const [[noAccount]] = await pool.query('SELECT COUNT(*) n FROM accounts WHERE email = ?', [emails.new]);
    assert.equal(Number(noAccount.n), 0, 'nobody created an account by hand');
    const { user, cookie } = await signIn(emails.new, ` ${codes.new} `);
    assert.equal(user.role, 'parent');
    assert.equal(user.parent_id, await dbId('parents', ids.parNew));
    assert.deepEqual(await childIds(cookie), [await dbId('students', ids.studNew)]);
  });

  await t.test('parent with linked siblings sees exactly the recorded children, using either ID', async () => {
    resetRateLimitsForTesting();
    const first = await signIn(emails.sib, codes.sibA);
    assert.deepEqual(await childIds(first.cookie), sorted(sid.studSibA, sid.studSibB));
    assert.ok(!(await childIds(first.cookie)).includes(sid.studLookalike), 'email typed on a pupil record grants nothing');
    const second = await signIn(emails.sib, codes.sibB);
    assert.equal(second.user.id, first.user.id, 'same account for both siblings');
    const children = (await call('GET', `/parents/${pid.sib}/children`, { cookie: second.cookie })).data.map((c) => c.id).sort((a, b) => a - b);
    assert.deepEqual(children, sorted(sid.studSibA, sid.studSibB));
    siblingCookie = second.cookie;
  });

  await t.test('wrong email/ID combinations and unknown IDs are denied generically', async () => {
    resetRateLimitsForTesting();
    await assertDenied(emails.existing, codes.sibA); // real email, another family's real ID
    await assertDenied(emails.sib, codes.existing);
    await assertDenied(emails.existing, `PSI-${RUN}-999`); // unknown ID
    await assertDenied(mail('nobody'), codes.existing); // unknown email
    await assertDenied(emails.sib, codes.lookalike); // email typed on pupil record, no recorded link
    const malformed = await call('POST', '/auth/parent/start', { body: { email: emails.sib, unique_id: '<script>' } });
    assert.equal(malformed.status, 400);
  });

  await t.test('ambiguous matches are denied with the same generic error', async () => {
    resetRateLimitsForTesting();
    // The parent's email already belongs to a staff account.
    await assertDenied(emails.staff, codes.staff);
    // Two parent records resolve to the same email once normalised.
    const [dup] = await pool.query("INSERT INTO parents (full_name, email, status) VALUES (?, ?, 'active')", [`Psi Dup ${run}`, ` ${emails.sib}`]);
    try { await assertDenied(emails.sib, codes.sibA); }
    finally { await pool.query('DELETE FROM parents WHERE id = ?', [dup.insertId]); }
  });

  await t.test('Pending pupils stay ineligible even with a recorded link', async () => {
    resetRateLimitsForTesting();
    await assertDenied(emails.sib, codes.pending);
    assert.ok(!(await childIds(siblingCookie)).includes(sid.studPending), 'pending sibling not listed');
    assert.equal((await call('GET', `/students/${sid.studPending}/dashboard`, { cookie: siblingCookie })).status, 403);
  });

  await t.test('a portal-created parent is not matched to an Airtable parent by email', async () => {
    resetRateLimitsForTesting();
    await assertDenied(emails.manual, codes.manual);
    const [[link]] = await pool.query('SELECT COUNT(*) n FROM parent_students WHERE parent_id = ?', [manualParent.insertId]);
    assert.equal(Number(link.n), 0, 'no link created by email matching');
    const [[stillManual]] = await pool.query('SELECT airtable_record_id FROM parents WHERE id = ?', [manualParent.insertId]);
    assert.equal(stillManual.airtable_record_id, null);
  });

  await t.test("a signed-in parent cannot request another family's records", async () => {
    for (const suffix of ['dashboard', 'results', 'attendance', 'fees']) {
      assert.equal((await call('GET', `/students/${sid.studSibA}/${suffix}`, { cookie: existingCookie })).status, 403);
      assert.equal((await call('GET', `/students/${sid.studExisting}/${suffix}`, { cookie: siblingCookie })).status, 403);
      assert.equal((await call('GET', `/students/${sid.studLookalike}/${suffix}`, { cookie: siblingCookie })).status, 403);
    }
    assert.equal((await call('GET', `/parents/${pid.sib}/children`, { cookie: existingCookie })).status, 403);
    assert.equal((await call('GET', `/payments?student_id=${sid.studSibB}`, { cookie: existingCookie })).status, 403);
    assert.equal((await call('GET', `/announcements?student_id=${sid.studSibA}`, { cookie: existingCookie })).status, 403);
  });

  await t.test('codes are single-use, attempt-limited, and IDs/codes stay out of responses and logs', async () => {
    resetRateLimitsForTesting();
    const started = await startSignIn(emails.sib, codes.sibA);
    const wrong = started.emailed === '000000' ? '111111' : '000000';
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      const res = await call('POST', '/auth/parent/verify', { body: { challenge: started.data.challenge, code: wrong } });
      assert.equal(res.status, 401);
      assert.ok(!JSON.stringify(res.data).includes(codes.sibA));
    }
    const locked = await call('POST', '/auth/parent/verify', { body: { challenge: started.data.challenge, code: started.emailed } });
    assert.equal(locked.status, 401, 'correct code is refused after too many wrong attempts');
    const fresh = await signIn(emails.sib, codes.sibA);
    const replay = await call('POST', '/auth/parent/verify', { body: { challenge: fresh.challenge, code: fresh.code } });
    assert.equal(replay.status, 401, 'a code cannot be reused');
    const [stored] = await pool.query('SELECT * FROM parent_sign_in_challenges WHERE created_at >= ?', [startedAt]);
    assert.ok(!JSON.stringify(stored).includes(codes.sibA) && !JSON.stringify(stored).includes(fresh.code), 'only hashes are stored');
    const allLogs = logged.join('\n');
    for (const value of [...Object.values(codes), fresh.code]) assert.ok(!allLogs.includes(value), 'no unique ID or code in logs');
  });

  await t.test('sign-in is rate limited per email address', async () => {
    resetRateLimitsForTesting();
    for (let i = 0; i < 5; i++) assert.equal((await startSignIn(mail('limited'), codes.sibA)).status, 200);
    assert.equal((await startSignIn(mail('limited'), codes.sibA)).status, 429);
    resetRateLimitsForTesting();
  });

  await t.test('removed or revoked Airtable links stop granting access on the next import', async () => {
    resetRateLimitsForTesting();
    // A link added by staff in the portal (not from Airtable) must survive imports.
    const parNewId = await dbId('parents', ids.parNew);
    await pool.query("INSERT INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, 'Guardian')", [parNewId, sid.studLookalike]);
    const report = await importExport({ includeNew: true, removeLinks: true });
    assert.equal(report.tables.parent_students.toRemove, 2, 'existing family link deleted + sibling B junction revoked');
    assert.ok(report.tables.parent_students.issues.revoked_guardian_student_link >= 1);
    // Already-open sessions lose the removed child immediately.
    assert.deepEqual(await childIds(siblingCookie), [sid.studSibA]);
    assert.equal((await call('GET', `/students/${sid.studSibB}/dashboard`, { cookie: siblingCookie })).status, 403);
    assert.deepEqual(await childIds(existingCookie), []);
    // New sign-ins with the removed link's details fail.
    await assertDenied(emails.existing, codes.existing);
    await assertDenied(emails.sib, codes.sibB);
    const [[manual]] = await pool.query('SELECT COUNT(*) n FROM parent_students WHERE parent_id = ? AND student_id = ?', [parNewId, sid.studLookalike]);
    assert.equal(Number(manual.n), 1, 'staff-created link preserved');
  });

  await t.test('the Airtable API sync applies corrected records through the same importer', async () => {
    resetRateLimitsForTesting();
    const { runAirtableSync } = await import('../sync-airtable.js');
    const schema = JSON.parse(fs.readFileSync(new URL('../../schema/mls-airtable-schema.json', import.meta.url), 'utf8'));
    const nameById = new Map(schema.tables.map((table) => [table.airtableTableId, table.name]));
    // Correction in Airtable: sibling B's junction link is set back to Active.
    const dir = writeExport({ includeNew: true, removeLinks: true });
    const junction = JSON.parse(fs.readFileSync(path.join(dir, 'ParentStudentLinks.json'), 'utf8'));
    junction[0].fields.Link_Status = 'Active';
    fs.writeFileSync(path.join(dir, 'ParentStudentLinks.json'), JSON.stringify(junction));
    const fetched = [];
    const fakeFetch = async (tableId) => {
      const name = nameById.get(tableId) || tableId;
      fetched.push(name);
      const file = path.join(dir, `${name}.json`);
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    };
    try {
      const report = await runAirtableSync({ apply: true, fetchTable: fakeFetch });
      assert.equal(report.tables.parent_students.toInsert, 1);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    assert.ok(['Students', 'Parents', 'ParentStudentLinks', 'Classes'].every((name) => fetched.includes(name)));
    assert.deepEqual(await childIds(siblingCookie), sorted(sid.studSibA, sid.studSibB), 'restored link visible on the open session');
  });

  await t.test('sign-in reports a clear dependency when email delivery is not configured', async () => {
    resetRateLimitsForTesting();
    const saved = { SMTP_HOST: process.env.SMTP_HOST, MAIL_FROM: process.env.MAIL_FROM, MAIL_TRANSPORT: process.env.MAIL_TRANSPORT };
    setMailTransportForTesting(null);
    for (const key of Object.keys(saved)) delete process.env[key];
    try {
      const res = await call('POST', '/auth/parent/start', { body: { email: emails.sib, unique_id: codes.sibA } });
      assert.equal(res.status, 503);
      assert.match(res.data.error, /not available/);
    } finally {
      for (const [key, value] of Object.entries(saved)) if (value !== undefined) process.env[key] = value;
      setMailTransportForTesting((message) => { outbox.push(message); });
    }
  });
});
