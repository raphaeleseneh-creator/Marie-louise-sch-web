import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';

// Opt in only against the existing local database; no migrations or seed data run.
test('real database API boundaries and transactions', {skip: process.env.RUN_DB_TESTS !== '1', timeout: Number(process.env.DB_TEST_TIMEOUT_MS || 120000)}, async t => {
  const {app} = await import('../app.js');
  const {pool} = await import('../db.js');
  const {hashPassword} = await import('../auth.js');
  const prefix = `test_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  const password = 'Fixture-password-123!';
  const owned = {classes: [], students: [], parents: [], accounts: [], announcements: []};
  const publicEmail = `${prefix}_public@example.invalid`;
  let server;

  t.after(async () => {
    try {
      if (server) {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      }
    } finally {
      try {
        const db = await pool.getConnection();
        try {
          await db.beginTransaction();
          // Every deletion is restricted to recorded fixture IDs or this run's exact email.
          for (const id of owned.announcements) await db.query('DELETE FROM announcements WHERE id=?', [id]);
          for (const id of owned.students) {
            await db.query('DELETE p FROM payments p JOIN fee_invoices f ON f.id=p.invoice_id WHERE f.student_id=?', [id]);
            for (const table of ['fee_invoices','academic_results','attendance','parent_students']) await db.query(`DELETE FROM ${table} WHERE student_id=?`, [id]);
            await db.query('DELETE FROM students WHERE id=?', [id]);
          }
          for (const id of owned.accounts) {
            await db.query('DELETE FROM sessions WHERE account_id=?', [id]);
            await db.query('DELETE FROM staff_classes WHERE account_id=?', [id]);
            await db.query('DELETE FROM accounts WHERE id=?', [id]);
          }
          for (const id of owned.parents) await db.query('DELETE FROM parents WHERE id=?', [id]);
          for (const id of owned.classes) await db.query('DELETE FROM classes WHERE id=?', [id]);
          await db.query('DELETE FROM admissions WHERE parent_email=?', [publicEmail]);
          await db.query('DELETE FROM tours WHERE email=?', [publicEmail]);
          await db.commit();
        } catch (error) { await db.rollback(); throw error; }
        finally { db.release(); }
        for (const [table, ids] of Object.entries(owned)) {
          if (ids.length) {
            const [[row]] = await pool.query(`SELECT COUNT(*) count FROM ${table} WHERE id IN (?)`, [ids]);
            assert.equal(Number(row.count), 0, `${table} fixture cleanup`);
          }
        }
        for (const [table, column] of [['admissions','parent_email'],['tours','email']]) {
          const [[row]] = await pool.query(`SELECT COUNT(*) count FROM ${table} WHERE ${column}=?`, [publicEmail]);
          assert.equal(Number(row.count), 0, `${table} fixture cleanup`);
        }
      } finally { await pool.end(); }
    }
  });

  async function insert(table, sql, params) {
    const [row] = await pool.query(sql, params);
    owned[table].push(row.insertId);
    return row.insertId;
  }
  const students = [], parents = [], classes = [];
  for (let i = 0; i < 2; i++) {
    classes.push(await insert('classes', 'INSERT INTO classes(name) VALUES (?)', [`${prefix}_class${i}`]));
    students.push(await insert('students', 'INSERT INTO students(student_code,first_name,last_name,class_id,enrollment_status) VALUES (?,?,?,?,?)', [`${prefix}_s${i}`, 'Fixture', `${prefix}_${i}`, classes[i], 'active']));
    parents.push(await insert('parents', 'INSERT INTO parents(full_name,email,phone,status) VALUES (?,?,?,?)', [`${prefix}_parent${i}`, `${prefix}_p${i}@example.invalid`, '08000000000', 'active']));
    await pool.query('INSERT INTO parent_students(parent_id,student_id,relationship,is_primary_guardian) VALUES (?,?,?,?)', [parents[i], students[i], 'Parent', true]);
  }
  const hash = await hashPassword(password);
  const accounts = {};
  for (const name of ['admin','teacher','bursar','parent0','parent1']) {
    const role = name.startsWith('parent') ? 'parent' : name;
    accounts[name] = await insert('accounts', 'INSERT INTO accounts(full_name,email,password_hash,role,parent_id) VALUES (?,?,?,?,?)', [`${prefix}_${name}`, `${prefix}_${name}@example.invalid`, hash, role, role === 'parent' ? parents[Number(name.at(-1))] : null]);
  }
  await pool.query('INSERT INTO staff_classes(account_id,class_id) VALUES (?,?)', [accounts.teacher, classes[0]]);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const cookies = {};
  async function request(role, method, path, body, expected = 200, headers = {}) {
    const response = await fetch(base + '/api' + path, {
      method, headers: {...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(cookies[role] ? {Cookie:cookies[role]} : {}), ...headers},
      ...(body === undefined ? {} : {body:JSON.stringify(body)}), signal:AbortSignal.timeout(10000),
    });
    const data = await response.json();
    assert.equal(response.status, expected, `${role || 'anonymous'} ${method} ${path}: ${JSON.stringify(data)}`);
    return {data, response};
  }
  for (const name of Object.keys(accounts)) {
    const {data, response} = await request(null, 'POST', '/auth/login', {email:`${prefix}_${name}@example.invalid`, password});
    assert.equal(data.user.id, accounts[name]);
    assert.equal(data.user.role, name.startsWith('parent') ? 'parent' : name);
    cookies[name] = response.headers.get('set-cookie').split(';')[0];
    assert.match(cookies[name], /^ml_session=[a-f0-9]{64}$/);
  }
  const result = (student, subject, status = 'draft') => ({student_id:student, term_id:'reccR4ZBVMQoLeZbn', subject, ca1_score:10, ca2_score:20, exam_score:60, publication_status:status});
  async function login(name, value = password, cookieName = name) {
    const {data, response} = await request(null,'POST','/auth/login',{email:`${prefix}_${name}@example.invalid`,password:value});
    cookies[cookieName] = response.headers.get('set-cookie').split(';')[0];
    return data.user;
  }
  async function createAccount(name, role, extra = {}) {
    const {data} = await request('admin','POST','/accounts',{full_name:`${prefix}_${name}`,email:`${prefix}_${name}@example.invalid`,password,role,...extra},201);
    owned.accounts.push(data.id);
    return data.id;
  }
  async function createNotice(name, extra = {}, role = 'admin') {
    const {data} = await request(role,'POST','/announcements',{title:`${prefix}_${name}`,message:'Fixture notice',audience:'school',is_published:true,...extra},201);
    owned.announcements.push(data.id);
    return data.id;
  }

  await t.test('origin checks reject unexpected production origins and permit both development previews', async () => {
    const previous = {NODE_ENV:process.env.NODE_ENV, APP_ORIGIN:process.env.APP_ORIGIN};
    try {
      process.env.NODE_ENV = 'production';
      process.env.APP_ORIGIN = 'https://school.example.invalid';
      for (const origin of ['https://unexpected.example.invalid','http://localhost:3000','http://127.0.0.1:3000']) {
        const {data} = await request(null,'POST','/auth/logout',{},403,{Origin:origin});
        assert.match(data.error,/origin/i);
      }
      // Logout without a cookie checks the middleware without touching any sessions.
      await request(null,'POST','/auth/logout',{},200,{Origin:base});
      await request(null,'POST','/auth/logout',{},200,{Origin:process.env.APP_ORIGIN});
      process.env.NODE_ENV = 'development';
      for (const origin of ['http://localhost:3000','http://127.0.0.1:3000']) await request(null,'POST','/auth/logout',{},200,{Origin:origin});
      await request(null,'POST','/auth/logout',{},403,{Origin:'https://unexpected.example.invalid'});
    } finally {
      for (const [key,value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });

  await t.test('admin account creation links parents and enforces teacher assignment changes', async () => {
    const teacherId = await createAccount('created_teacher','teacher',{class_ids:[classes[0],classes[0]]});
    const parentId = await createAccount('created_parent','parent',{parent_id:parents[1]});
    const all = (await request('admin','GET','/accounts')).data;
    assert.deepEqual(all.find(a=>a.id===teacherId).class_ids,[classes[0]]);
    assert.equal(all.find(a=>a.id===parentId).parent_id,parents[1]);
    assert.ok(all.filter(a=>[teacherId,parentId].includes(a.id)).every(a=>!('password_hash' in a)));
    await login('created_teacher');
    assert.deepEqual((await request('created_teacher','GET','/students')).data.map(s=>s.id),[students[0]]);
    await request('created_teacher','POST','/accounts',{full_name:prefix},403);
    await request('admin','PATCH',`/accounts/${teacherId}`,{class_ids:[classes[1],classes[1]]});
    await request('created_teacher','GET','/auth/me',undefined,401);
    await login('created_teacher');
    assert.deepEqual((await request('created_teacher','GET','/classes')).data.map(c=>c.id),[classes[1]]);
    assert.deepEqual((await request('created_teacher','GET','/students')).data.map(s=>s.id),[students[1]]);
    await request('created_teacher','GET',`/students/${students[0]}/dashboard`,undefined,403);
    const parent = await login('created_parent');
    assert.equal(parent.parent_id,parents[1]);
    assert.deepEqual((await request('created_parent','GET','/students')).data.map(s=>s.id),[students[1]]);
    await request('created_parent','GET',`/students/${students[0]}/dashboard`,undefined,403);
    await request('admin','POST','/accounts',{full_name:prefix,email:`${prefix}_missing_parent@example.invalid`,password,role:'parent'},400);
    await request('admin','PATCH',`/accounts/${parentId}`,{class_ids:[classes[0]]},400);
  });

  await t.test('deactivating an account revokes every active session and blocks login', async () => {
    const id = await createAccount('deactivated','teacher',{class_ids:[classes[0]]});
    await login('deactivated',password,'deactivated_first');
    await login('deactivated',password,'deactivated_second');
    for (const role of ['deactivated_first','deactivated_second']) await request(role,'GET','/auth/me');
    await request('admin','PATCH',`/accounts/${id}`,{active:false});
    for (const role of ['deactivated_first','deactivated_second']) await request(role,'GET','/auth/me',undefined,401);
    const [[sessions]] = await pool.query('SELECT COUNT(*) count FROM sessions WHERE account_id=?',[id]);
    assert.equal(Number(sessions.count),0);
    await request(null,'POST','/auth/login',{email:`${prefix}_deactivated@example.invalid`,password},401);
  });

  await t.test('password change rejects invalid input and invalidates all sessions', async () => {
    const id = await createAccount('password_change','parent',{parent_id:parents[0]});
    await login('password_change',password,'password_first');
    await login('password_change',password,'password_second');
    const nextPassword = 'Replacement-password-456!';
    await request('password_first','POST','/auth/password',{current_password:'wrong-password',new_password:nextPassword},400);
    await request('password_first','POST','/auth/password',{current_password:password,new_password:'short'},400);
    for (const role of ['password_first','password_second']) await request(role,'GET','/auth/me');
    const {response} = await request('password_first','POST','/auth/password',{current_password:password,new_password:nextPassword});
    assert.match(response.headers.get('set-cookie'),/ml_session=;/);
    for (const role of ['password_first','password_second']) await request(role,'GET','/auth/me',undefined,401);
    const [[sessions]] = await pool.query('SELECT COUNT(*) count FROM sessions WHERE account_id=?',[id]);
    assert.equal(Number(sessions.count),0);
    await request(null,'POST','/auth/login',{email:`${prefix}_password_change@example.invalid`,password},401);
    assert.equal((await login('password_change',nextPassword)).id,id);
    await request('password_change','GET','/auth/me');
  });

  await t.test('anonymous callers cannot read or mutate protected resources', async () => {
    for (const path of ['/auth/me','/accounts','/students','/classes','/parents','/results','/attendance','/fees','/payments','/announcements','/admin/announcements','/admissions','/tours',`/students/${students[0]}/dashboard`,`/students/${students[0]}/results`,`/students/${students[0]}/fees`]) await request(null,'GET',path,undefined,401);
    for (const path of ['/accounts','/classes','/students','/parents','/results','/results/import','/attendance','/fees','/payments','/announcements','/sync/students']) await request(null,'POST',path,{},401);
  });

  await t.test('parents see only linked students and published results', async () => {
    for (let i = 0; i < 2; i++) {
      for (const status of ['draft','pending','published','archived']) await request('admin','POST','/results',result(students[i],`visibility_${status}`,status),201);
      const role = `parent${i}`, other = 1-i;
      assert.deepEqual((await request(role,'GET','/students')).data.map(s=>s.id), [students[i]]);
      assert.deepEqual((await request(role,'GET',`/parents/${parents[i]}/children`)).data.map(s=>s.id), [students[i]]);
      await request(role,'GET',`/parents/${parents[other]}/children`,undefined,403);
      const rows = (await request(role,'GET',`/students/${students[i]}/results`)).data;
      assert.equal(rows.length,1);
      assert.equal(rows[0].publication_status,'published');
      for (const suffix of ['dashboard','results','attendance','fees']) await request(role,'GET',`/students/${students[other]}/${suffix}`,undefined,403);
      await request(role,'GET',`/payments?student_id=${students[other]}`,undefined,403);
      await request(role,'POST','/results',result(students[i],'parent_write'),403);
    }
  });

  await t.test('teachers are class scoped and cannot publish or access finance', async () => {
    assert.deepEqual((await request('teacher','GET','/classes')).data.map(c=>c.id), [classes[0]]);
    assert.deepEqual((await request('teacher','GET','/students')).data.map(s=>s.id), [students[0]]);
    assert.deepEqual((await request('teacher','GET',`/students?class_id=${classes[1]}`)).data, []);
    assert.ok((await request('teacher','GET','/results')).data.every(r=>r.student_id===students[0]));
    await request('teacher','POST','/results',result(students[1],'outside'),403);
    await request('teacher','POST','/attendance',{student_id:students[1], attendance_date:'2026-10-01', status:'present'},403);
    const {data} = await request('teacher','POST','/results',result(students[0],'teacher_draft'),201);
    const [[savedTerm]] = await pool.query('SELECT term_id, term_name FROM academic_results WHERE id=?', [data.id]);
    assert.equal(savedTerm.term_id, 'reccR4ZBVMQoLeZbn');
    assert.match(savedTerm.term_name, /Term 1.*2025\/2026/);
    await request('teacher','POST','/results',{...result(students[0],'unknown_term'),term_id:'unknown'},400);
    await request('teacher','PATCH',`/results/${data.id}`,{publication_status:'published'},403);
    await request('teacher','POST','/results',result(students[0],'teacher_published','published'),403);
    const published = (await request('parent0','GET',`/students/${students[0]}/results`)).data[0];
    await request('teacher','PATCH',`/results/${published.id}`,{exam_score:1},403);
    for (const path of ['/fees','/payments',`/students/${students[0]}/fees`]) await request('teacher','GET',path,undefined,403);
    for (const path of ['/fees','/payments']) await request('teacher','POST',path,{},403);
    const [[saved]] = await pool.query('SELECT publication_status FROM academic_results WHERE id=?',[data.id]);
    assert.equal(saved.publication_status,'draft');
  });

  await t.test('announcements target school, class and student audiences and exclude drafts/expired notices', async () => {
    const school = await createNotice('school');
    const class0 = await createNotice('class0',{audience:'class',class_id:classes[0]},'teacher');
    const class1 = await createNotice('class1',{audience:'class',class_id:classes[1]});
    const student0 = await createNotice('student0',{audience:'student',student_id:students[0]},'teacher');
    const student1 = await createNotice('student1',{audience:'student',student_id:students[1]});
    const draft = await createNotice('draft',{is_published:false});
    const expired = await createNotice('expired',{expires_at:new Date(Date.now()-86400000).toISOString()});
    const ids = [school,class0,class1,student0,student1,draft,expired];
    // Filter by this run's IDs so existing school notices do not affect assertions.
    const fixtureIds = rows => rows.filter(row=>ids.includes(row.id)).map(row=>row.id).sort((a,b)=>a-b);
    for (let i=0;i<2;i++) {
      const expected = [school,i===0?class0:class1,i===0?student0:student1].sort((a,b)=>a-b);
      assert.deepEqual(fixtureIds((await request(`parent${i}`,'GET','/announcements')).data),expected);
      assert.deepEqual(fixtureIds((await request(`parent${i}`,'GET',`/announcements?student_id=${students[i]}`)).data),expected);
      assert.deepEqual(fixtureIds((await request(`parent${i}`,'GET',`/students/${students[i]}/dashboard`)).data.announcements),expected);
      await request(`parent${i}`,'GET',`/announcements?student_id=${students[1-i]}`,undefined,403);
    }
    assert.deepEqual(fixtureIds((await request('bursar','GET','/announcements')).data),[school]);
    assert.deepEqual(fixtureIds((await request('admin','GET','/admin/announcements')).data),[...ids].sort((a,b)=>a-b));
    assert.deepEqual(fixtureIds((await request('teacher','GET','/admin/announcements')).data),[school,class0,student0,draft,expired].sort((a,b)=>a-b));
    const notice = {title:`${prefix}_denied`,message:'Fixture',is_published:true};
    await request('teacher','POST','/announcements',{...notice,audience:'school'},403);
    await request('teacher','POST','/announcements',{...notice,audience:'class',class_id:classes[1]},403);
    await request('teacher','POST','/announcements',{...notice,audience:'student',student_id:students[1]},403);
    for (const id of [school,class1,student1]) await request('teacher','PATCH',`/announcements/${id}`,{message:'Denied change'},403);
    for (const role of ['parent0','bursar']) await request(role,'PATCH',`/announcements/${class0}`,{message:'Denied change'},403);
    await request('teacher','PATCH',`/announcements/${class0}`,{title:`${prefix}_edited`,message:'Updated fixture notice'});
    await request('teacher','PATCH',`/announcements/${class0}`,{audience:'class',class_id:classes[1]},403);
    await request('teacher','PATCH',`/announcements/${class0}`,{audience:'student',student_id:students[1]},403);
    await request('teacher','PATCH',`/announcements/${class0}`,{audience:'school'},403);
    const [[saved]] = await pool.query('SELECT title,message,audience,class_id FROM announcements WHERE id=?',[class0]);
    assert.equal(saved.title,`${prefix}_edited`);
    assert.equal(saved.message,'Updated fixture notice');
    assert.equal(saved.audience,'class');
    assert.equal(saved.class_id,classes[0]);
    await request('admin','PATCH',`/announcements/${draft}`,{is_published:true});
    assert.ok(fixtureIds((await request('parent0','GET','/announcements')).data).includes(draft));
    const [[published]] = await pool.query('SELECT published_at FROM announcements WHERE id=?',[draft]);
    assert.equal(typeof published.published_at,'string');
    await request('admin','PATCH',`/announcements/${draft}`,{is_published:false});
    assert.ok(!fixtureIds((await request('parent0','GET','/announcements')).data).includes(draft));
    const [[unpublished]] = await pool.query('SELECT published_at FROM announcements WHERE id=?',[draft]);
    assert.equal(unpublished.published_at,null);
    await request('admin','PATCH',`/announcements/${class0}`,{audience:'student',student_id:students[1]});
    assert.ok(!fixtureIds((await request('parent0','GET','/announcements')).data).includes(class0));
    assert.ok(fixtureIds((await request('parent1','GET','/announcements')).data).includes(class0));
    const [[retargeted]] = await pool.query('SELECT class_id,student_id FROM announcements WHERE id=?',[class0]);
    assert.equal(retargeted.class_id,null);
    assert.equal(retargeted.student_id,students[1]);
  });

  await t.test('announcement expiry uses database local time and survives partial patches without timezone drift', async () => {
    const expiry = new Date(Date.now()+30*60000).toISOString();
    const id = await createNotice('expiry_regression',{audience:'class',class_id:classes[0],expires_at:expiry},'teacher');
    const read = async () => (await pool.query('SELECT expires_at,published_at,TIMESTAMPDIFF(SECOND,NOW(),expires_at) seconds_left FROM announcements WHERE id=?',[id]))[0][0];
    const before = await read();
    assert.equal(typeof before.expires_at,'string');
    // Allow small host/database clock and DATETIME rounding differences.
    assert.ok(Math.abs(before.seconds_left-30*60)<=5,`Expiry should be 30 minutes after database NOW(), got ${before.seconds_left} seconds`);
    for (const message of ['First edit','Second edit']) {
      await request('teacher','PATCH',`/announcements/${id}`,{message});
      const after = await read();
      assert.equal(after.expires_at,before.expires_at,'An omitted expiry must preserve the stored local datetime');
      assert.equal(after.published_at,before.published_at);
      assert.ok((await request('parent0','GET','/announcements')).data.some(row=>row.id===id));
    }
    await request('admin','PATCH',`/announcements/${id}`,{expires_at:'not-a-date'},400);
    assert.equal((await read()).expires_at,before.expires_at);
    await request('admin','PATCH',`/announcements/${id}`,{expires_at:new Date(Date.now()-30*60000).toISOString()});
    assert.ok(!(await request('parent0','GET','/announcements')).data.some(row=>row.id===id));
    await request('admin','PATCH',`/announcements/${id}`,{expires_at:null});
    assert.equal((await read()).expires_at,null);
    assert.ok((await request('parent0','GET','/announcements')).data.some(row=>row.id===id));
  });

  await t.test('CSV import rolls back invalid row two, preserves quoted remarks and rejects duplicates atomically', async () => {
    const header = 'student_id,term_id,subject,ca1_score,ca2_score,exam_score,teacher_remarks';
    const csvRow = (subject, exam = 60, remarks = 'Fine') => `${students[0]},reccR4ZBVMQoLeZbn,${subject},10,20,${exam},${remarks}`;
    await request('teacher','POST','/results/import',{csv:`${header}\n${csvRow('rollback_first')}\n${csvRow('rollback_second',90)}`},400);
    const [[rolledBack]] = await pool.query('SELECT COUNT(*) count FROM academic_results WHERE student_id=? AND term_id=? AND subject IN (?,?)',[students[0],'reccR4ZBVMQoLeZbn','rollback_first','rollback_second']);
    assert.equal(Number(rolledBack.count),0);
    const remarks = 'Good, "steady" work\nKeep going';
    const goodCsv = `${header}\n${csvRow('quoted',60,'"Good, ""steady"" work\nKeep going"')}`;
    assert.equal((await request('teacher','POST','/results/import',{csv:goodCsv},201)).data.imported,1);
    const [[saved]] = await pool.query('SELECT teacher_remarks,total_score,publication_status FROM academic_results WHERE student_id=? AND term_id=? AND subject=?',[students[0],'reccR4ZBVMQoLeZbn','quoted']);
    assert.equal(saved.teacher_remarks,remarks);
    assert.equal(Number(saved.total_score),90);
    assert.equal(saved.publication_status,'draft');
    await request('teacher','POST','/results/import',{csv:`${header}\n${csvRow('duplicate_first')}\n${csvRow('quoted')}`},409);
    const [[duplicates]] = await pool.query('SELECT COUNT(*) count FROM academic_results WHERE student_id=? AND term_id=? AND subject IN (?,?)',[students[0],'reccR4ZBVMQoLeZbn','quoted','duplicate_first']);
    assert.equal(Number(duplicates.count),1);
  });

  await t.test('bursar payments reject overpayment and update partial/paid status', async () => {
    const {data:invoice} = await request('bursar','POST','/fees',{student_id:students[0], invoice_number:`${prefix}_invoice`,description:'Fixture tuition',amount_due:100},201);
    const payment = (amount, suffix) => ({invoice_id:invoice.id,receipt_number:`${prefix}_${suffix}`,amount_paid:amount,payment_date:'2026-10-01',payment_method:'cash'});
    await request('bursar','POST','/payments',payment(101,'over_initial'),400);
    await request('bursar','POST','/payments',payment(40,'partial'),201);
    const invoiceState = async () => (await pool.query('SELECT status FROM fee_invoices WHERE id=?',[invoice.id]))[0][0].status;
    assert.equal(await invoiceState(),'partially_paid');
    await request('bursar','POST','/payments',payment(61,'over_remaining'),400);
    assert.equal(await invoiceState(),'partially_paid');
    await request('bursar','POST','/payments',payment(60,'final'),201);
    assert.equal(await invoiceState(),'paid');
    await request('bursar','POST','/payments',payment(0.01,'over_paid'),400);
    const [[paid]] = await pool.query('SELECT COUNT(*) count,SUM(amount_paid) total FROM payments WHERE invoice_id=?',[invoice.id]);
    assert.equal(Number(paid.count),2);
    assert.equal(Number(paid.total),100);
    assert.equal((await request('parent0','GET','/payments')).data.length,2);
    assert.deepEqual((await request('parent1','GET','/payments')).data,[]);
    await request('parent0','POST','/payments',payment(1,'parent'),403);
  });

  await t.test('public admissions and tours validate, persist and restrict status changes', async () => {
    const admission = {parentFullName:prefix,parentEmail:publicEmail,parentPhone:'08000000000',childFullName:`${prefix}_child`,childDateOfBirth:'2020-01-02',selectedClass:prefix,notes:'Fixture only'};
    const tour = {fullName:prefix,email:publicEmail,phone:'08000000000',preferredDate:'2027-01-02',interestedClass:prefix,message:'Fixture only'};
    for (const [table, body, invalidBody, nextStatus, column] of [
      ['admissions',admission,{...admission,childDateOfBirth:'2025-02-29'},'contacted','parent_email'],
      ['tours',tour,{...tour,email:'invalid'},'confirmed','email'],
    ]) {
      await request(null,'POST',`/${table}`,invalidBody,400);
      const [[invalidCount]] = await pool.query(`SELECT COUNT(*) count FROM ${table} WHERE ${column}=?`,[publicEmail]);
      assert.equal(Number(invalidCount.count),0);
      const {data} = await request(null,'POST',`/${table}`,body,201);
      assert.match(data.reference, table==='admissions' ? /^MLS-APP-[A-F0-9]+$/ : /^MLS-TOUR-[A-F0-9]+$/);
      const [[saved]] = await pool.query(`SELECT * FROM ${table} WHERE id=? AND ${column}=?`,[data.id,publicEmail]);
      assert.equal(saved.status,'new');
      assert.equal(saved.reference,data.reference);
      for (const role of [null,'parent0','teacher','bursar']) await request(role,'PATCH',`/${table}/${data.id}`,{status:nextStatus},role?403:401);
      await request('admin','PATCH',`/${table}/${data.id}`,{status:'invalid'},400);
      await request('admin','PATCH',`/${table}/${data.id}`,{status:nextStatus});
      const record = (await request('admin','GET',`/${table}`)).data.find(r=>r.id===data.id);
      assert.equal(record.status,nextStatus);
    }
  });
});
