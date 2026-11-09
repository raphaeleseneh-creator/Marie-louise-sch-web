import {readWithReconnect} from './resilient-read.js';
import express from 'express';
import {randomBytes} from 'node:crypto';
import {pool} from './db.js';
import {identify,roles,requireAdmin,canAccessStudent,studentScope,fail,positiveId,hashPassword,verifyPassword,digest} from './auth.js';
import {text,number,choice,date,email,resultData,parseCsv} from './validation.js';
import {fetchAllAirtableRecords,airtableField} from './airtable.js';
import { resolveTerm, termLabel } from './academic-calendar.js';
import { installGoogleAuth } from './google-auth.js';
import {installEnrollment} from './enrollment.js';
export const app=express();
app.disable('x-powered-by');
app.set('trust proxy',false);
app.use(express.json({limit:'2mb'}));
app.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)){
    const origin=req.get('origin');
    const localPreview=process.env.NODE_ENV!=='production' && ['http://localhost:3000','http://127.0.0.1:3000'].includes(origin);
    if(origin && !localPreview && origin!==`http://${req.get('host')}` && origin!==`https://${req.get('host')}` && origin!==process.env.APP_ORIGIN) return res.status(403).json({error:'Request origin is not allowed.'});
    // Sign-out has no input. Older browsers/clients send an empty POST, for
    // which Express returns null from req.is(), even with a JSON header.
    const emptyLogout=req.path==='/api/auth/logout'&&!req.get('transfer-encoding')&&(!req.get('content-length')||req.get('content-length')==='0');
    if(!emptyLogout&&!req.is('application/json'))return res.status(415).json({error:'Send JSON data.'});
  }
  next();
});
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const all=roles('admin','teacher','bursar','parent'), staff=roles('admin','teacher','bursar'), teaching=roles('admin','teacher'),finance=roles('admin','bursar');
const buckets=new Map();
function limit(prefix,max){return(req,res,next)=>{const key=prefix+req.ip;const now=Date.now();let bucket=buckets.get(key);if(!bucket||bucket.until<now){bucket={count:0,until:now+15*60*1000};buckets.set(key,bucket);}if(++bucket.count>max)return res.status(429).json({error:'Too many requests. Please try again in 15 minutes.'});next();};}
const cleanup=setInterval(()=>{for(const [key,b]of buckets)if(b.until<Date.now())buckets.delete(key);},60000);cleanup.unref();
app.get('/api/health',wrap(async(_req,res)=>{await readWithReconnect(pool,'SELECT 1');res.json({ok:true,database:'connected',airtableConfigured:Boolean(process.env.AIRTABLE_API_TOKEN&&process.env.AIRTABLE_BASE_ID&&process.env.AIRTABLE_STUDENTS_TABLE)});}));
app.use(identify);
installGoogleAuth(app,{wrap,limit});
installEnrollment(app,{wrap,limit});
const cookieOptions={httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/api'};
app.post('/api/auth/login',limit('login',20),wrap(async(req,res)=>{
  const address=email(req.body.email),password=text(req.body.password,'Password',200);
  const [[account]]=await readWithReconnect(pool,'SELECT * FROM accounts WHERE email=? AND (active=TRUE OR (role=\'parent\' AND active=FALSE AND registration_pending=TRUE AND parent_id IS NULL))',[address]);
  const valid=account?await verifyPassword(password,account.password_hash):await verifyPassword(password,await hashPassword('unused-password-padding'));
  if(!account||!valid)fail(401,'Email or password is incorrect.');
  if(account.role==='parent'&&!account.registration_pending){const [[p]]=await pool.query("SELECT 1 FROM parents WHERE id=? AND status='active'",[account.parent_id]);if(!p)fail(403,'Contact the school office to activate your parent record.');}
  const previous=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ml_session='))?.slice(11);
  if(previous)await pool.query('DELETE FROM sessions WHERE token_hash=?',[digest(previous)]);
  await pool.query('DELETE FROM sessions WHERE expires_at<NOW()');
  const token=randomBytes(32).toString('hex');await pool.query('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 8 HOUR))',[digest(token),account.id]);
  res.cookie('ml_session',token,{...cookieOptions,maxAge:8*60*60*1000});
  const {id,full_name,role,parent_id}=account;res.json({user:{id,full_name,role,parent_id}});
}));
app.get('/api/auth/me',(req,res)=>req.user?res.json({user:req.user}):res.status(401).json({error:'Please sign in.'}));
app.post('/api/auth/logout',wrap(async(req,res)=>{const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ml_session='))?.slice(11);if(token)await pool.query('DELETE FROM sessions WHERE token_hash=?',[digest(token)]);res.clearCookie('ml_session',cookieOptions);res.json({ok:true});}));
app.post('/api/auth/password',all,wrap(async(req,res)=>{const [[a]]=await pool.query('SELECT password_hash FROM accounts WHERE id=?',[req.user.id]);if(!await verifyPassword(text(req.body.current_password,'Current password',200),a.password_hash))fail(400,'Current password is incorrect.');const password=text(req.body.new_password,'New password',200);if(password.length<12)fail(400,'Use at least 12 characters.');await pool.query('UPDATE accounts SET password_hash=? WHERE id=?',[await hashPassword(password),req.user.id]);await pool.query('DELETE FROM sessions WHERE account_id=?',[req.user.id]);res.clearCookie('ml_session',cookieOptions);res.json({ok:true});}));
app.get('/api/accounts',requireAdmin,wrap(async(_req,res)=>{const [rows]=await pool.query('SELECT id,full_name,email,role,parent_id,active,registration_pending,(google_sub IS NOT NULL) google_linked FROM accounts ORDER BY registration_pending DESC,full_name');const [links]=await pool.query('SELECT account_id,class_id FROM staff_classes');res.json(rows.map(r=>({...r,class_ids:links.filter(x=>x.account_id===r.id).map(x=>x.class_id)})));}));
app.get('/api/developer/parent-portal/students',roles('developer'),wrap(async(_req,res)=>{
  const [rows]=await pool.query("SELECT s.id,s.student_code,s.first_name,s.last_name,c.name class_name FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE s.enrollment_status='active' ORDER BY s.last_name,s.first_name");
  res.json(rows);
}));
app.post('/api/accounts',requireAdmin,wrap(async(req,res)=>{
  const b=req.body,role=choice(b.role,['admin','teacher','bursar','parent'],'role'),password=text(b.password,'Password',200);if(password.length<12)fail(400,'Use a password of at least 12 characters.');
  const parentId=role==='parent'?positiveId(b.parent_id):null;if(role==='parent'&&!parentId)fail(400,'Link this account to a parent record.');
  const classIds=b.class_ids||[];if(!Array.isArray(classIds)||classIds.some(x=>!positiveId(x)))fail(400,'Choose valid classes.');
  const hash=await hashPassword(password),db=await pool.getConnection();
  try{await db.beginTransaction();const [result]=await db.query('INSERT INTO accounts(full_name,email,password_hash,role,parent_id) VALUES (?,?,?,?,?)',[text(b.full_name,'Name',150),email(b.email),hash,role,parentId]);if(role==='teacher')for(const id of new Set(classIds))await db.query('INSERT INTO staff_classes(account_id,class_id) VALUES (?,?)',[result.insertId,id]);await db.commit();res.status(201).json({id:result.insertId});}catch(error){await db.rollback();throw error;}finally{db.release();}
}));
app.patch('/api/accounts/:id',requireAdmin,wrap(async(req,res)=>{const id=positiveId(req.params.id);if(!id)fail(400,'Invalid account.');if(id===req.user.id)fail(400,'Use your profile to change your own password.');const db=await pool.getConnection();try{await db.beginTransaction();const [[account]]=await db.query('SELECT * FROM accounts WHERE id=? FOR UPDATE',[id]);if(!account)fail(404,'Account not found.');if(account.role==='developer'&&req.user.role!=='developer')fail(403,'Only a developer can manage developer accounts.');if(account.registration_pending){if(req.body.active!==false)fail(409,'Parents link their children themselves using school-issued details.');await db.query('UPDATE accounts SET active=FALSE,registration_pending=FALSE WHERE id=?',[id]);await db.query('DELETE FROM sessions WHERE account_id=?',[id]);await db.commit();res.json({ok:true});return;}if(req.body.password){const password=text(req.body.password,'Password',200);if(password.length<12)fail(400,'Use at least 12 characters.');await db.query('UPDATE accounts SET password_hash=? WHERE id=?',[await hashPassword(password),id]);}if(req.body.active!==undefined){if(typeof req.body.active!=='boolean')fail(400,'Active must be true or false.');await db.query('UPDATE accounts SET active=? WHERE id=?',[req.body.active,id]);}if(req.body.class_ids!==undefined){if(account.role!=='teacher'||!Array.isArray(req.body.class_ids)||req.body.class_ids.some(x=>!positiveId(x)))fail(400,'Choose valid classes for a teacher.');await db.query('DELETE FROM staff_classes WHERE account_id=?',[id]);for(const classId of new Set(req.body.class_ids))await db.query('INSERT INTO staff_classes VALUES (?,?)',[id,classId]);}await db.query('DELETE FROM sessions WHERE account_id=?',[id]);await db.commit();res.json({ok:true});}catch(error){await db.rollback();throw error;}finally{db.release();}}));
app.get('/api/students',all,wrap(async(req,res)=>{const scope=studentScope(req.user);const params=[...scope.params];let filter=scope.sql;if(req.query.class_id){filter+=' AND s.class_id=?';params.push(number(req.query.class_id,'Class',1));}const [rows]=await pool.query(`SELECT s.*,c.name AS class_name FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE ${filter} ORDER BY s.last_name,s.first_name`,params);res.json(rows);}));
app.get('/api/classes',staff,wrap(async(req,res)=>{const teacher=req.user.role==='teacher';const [rows]=await pool.query(`SELECT id,name FROM classes ${teacher?'WHERE id IN (SELECT class_id FROM staff_classes WHERE account_id=?)':''} ORDER BY name`,teacher?[req.user.id]:[]);res.json(rows);}));
app.post('/api/classes',requireAdmin,wrap(async(req,res)=>{const name=text(req.body.name,'Class name',100);const [r]=await pool.query('INSERT INTO classes(name) VALUES (?)',[name]);res.status(201).json({id:r.insertId,name});}));
app.post('/api/students',requireAdmin,wrap(async(req,res)=>{const b=req.body;const [r]=await pool.query('INSERT INTO students(student_code,first_name,last_name,date_of_birth,class_id,enrollment_status) VALUES (?,?,?,?,?,?)',[text(b.student_code,'Student ID',50),text(b.first_name,'First name',100),text(b.last_name,'Last name',100),date(b.date_of_birth,'Date of birth',true),b.class_id?number(b.class_id,'Class',1):null,choice(b.enrollment_status||'active',['pending','active','inactive'],'enrollment status')]);res.status(201).json({id:r.insertId});}));
app.get('/api/parents',requireAdmin,wrap(async(_req,res)=>{const [rows]=await pool.query('SELECT id,full_name,email,phone,status FROM parents ORDER BY full_name');res.json(rows);}));
app.post('/api/parents',requireAdmin,wrap(async(req,res)=>{const b=req.body;const [r]=await pool.query('INSERT INTO parents(full_name,email,phone,status) VALUES (?,?,?,?)',[text(b.full_name,'Name',150),email(b.email),text(b.phone,'Phone',40,true),choice(b.status||'active',['active','inactive'],'parent status')]);res.status(201).json({id:r.insertId});}));
app.post('/api/parents/:parentId/students/:studentId',requireAdmin,wrap(async(req,res)=>{await canAccessStudent(req.user,req.params.studentId);if(!positiveId(req.params.parentId))fail(400,'Invalid parent.');await pool.query('INSERT INTO parent_students(parent_id,student_id,relationship,is_primary_guardian) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE relationship=VALUES(relationship),is_primary_guardian=VALUES(is_primary_guardian)',[req.params.parentId,req.params.studentId,text(req.body.relationship||'Parent','Relationship',50),req.body.is_primary_guardian===true]);res.status(201).json({linked:true});}));
app.get('/api/parents/:parentId/children',roles('admin','parent'),wrap(async(req,res)=>{if(!positiveId(req.params.parentId))fail(400,'Invalid parent.');if(req.user.role==='parent'&&Number(req.params.parentId)!==Number(req.user.parent_id))fail(403,'You can only view your own children.');const [rows]=await pool.query(`SELECT s.id,s.student_code,s.first_name,s.last_name,c.name AS class_name FROM parent_students ps JOIN parents p ON p.id=ps.parent_id JOIN students s ON s.id=ps.student_id LEFT JOIN classes c ON c.id=s.class_id WHERE ps.parent_id=? AND s.enrollment_status='active' AND p.status='active' ORDER BY s.first_name`,[req.params.parentId]);res.json(rows);}));
async function noticesFor(student){const [rows]=await pool.query(`SELECT * FROM announcements WHERE is_published=TRUE AND (expires_at IS NULL OR expires_at>=NOW()) AND (audience='school' OR (audience='class' AND class_id=?) OR (audience='student' AND student_id=?)) ORDER BY published_at DESC`,[student.class_id,student.id]);return rows;}
app.get('/api/students/:studentId/dashboard',all,wrap(async(req,res)=>{const s=await canAccessStudent(req.user,req.params.studentId);const [[student]]=await pool.query('SELECT s.id,s.student_code,s.first_name,s.last_name,c.name AS class_name FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE s.id=?',[s.id]);const [[attendance]]=await pool.query(`SELECT COUNT(*) total_days,COALESCE(SUM(status='present'),0) days_present,COALESCE(SUM(status='absent'),0) days_absent,COALESCE(SUM(status IN ('late','excused')),0) other_days FROM attendance WHERE student_id=?`,[s.id]);let fees={total_due:0,total_paid:0};if(req.user.role!=='teacher'){const [[summary]]=await pool.query('SELECT COALESCE(SUM(amount_due),0) total_due,(SELECT COALESCE(SUM(p.amount_paid),0) FROM payments p JOIN fee_invoices fi ON fi.id=p.invoice_id WHERE fi.student_id=?) total_paid FROM fee_invoices WHERE student_id=?',[s.id,s.id]);fees=summary;}res.json({student,attendance,fees,announcements:await noticesFor(s)});}));
app.get('/api/students/:studentId/results',roles('admin','teacher','parent'),wrap(async(req,res)=>{await canAccessStudent(req.user,req.params.studentId);const [rows]=await pool.query(`SELECT * FROM academic_results WHERE student_id=? AND publication_status='published' ORDER BY term_name,subject`,[req.params.studentId]);res.json(rows);}));
app.get('/api/results',teaching,wrap(async(req,res)=>{const scope=studentScope(req.user);const [rows]=await pool.query(`SELECT r.*,CONCAT(s.first_name,' ',s.last_name) student_name FROM academic_results r JOIN students s ON s.id=r.student_id WHERE ${scope.sql} ORDER BY r.id DESC`,scope.params);res.json(rows);}));
async function saveResult(body, user, db = pool, previous = null) {
  await canAccessStudent(user, body.student_id, db);
  const term = previous && body.term_id === null ? null : resolveTerm(body);
  const termName = term ? termLabel(term) : previous.term_name;
  const values = resultData({ ...body, term_name: termName }, user);
  const [[duplicate]] = await db.query(
    "SELECT id FROM academic_results WHERE id<>? AND student_id=? AND (term_id=? OR (term_id IS NULL AND term_name=?)) AND subject=? AND publication_status<>'archived'",
    [previous?.id ?? 0, body.student_id, term?.id ?? null, termName, values[1]],
  );
  if (duplicate) fail(409, 'A result already exists for this student, term and subject. Edit the existing record.');
  if (previous) {
    await db.query('UPDATE academic_results SET term_name=?,subject=?,ca1_score=?,ca2_score=?,exam_score=?,total_score=?,grade=?,teacher_remarks=?,publication_status=?,term_id=? WHERE id=?',
      [...values, term?.id ?? null, previous.id]);
    return previous.id;
  }
  const [result] = await db.query('INSERT INTO academic_results(student_id,term_name,subject,ca1_score,ca2_score,exam_score,total_score,grade,teacher_remarks,publication_status,term_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [body.student_id, ...values, term.id]);
  return result.insertId;
}
app.post('/api/results',teaching,wrap(async(req,res)=>{
  const db=await pool.getConnection();
  try{await db.beginTransaction();await db.query('SELECT id FROM students WHERE id=? FOR UPDATE',[positiveId(req.body.student_id)||0]);const id=await saveResult(req.body,req.user,db);await db.commit();res.status(201).json({id});}catch(error){await db.rollback();throw error;}finally{db.release();}
}));
app.patch('/api/results/:id',teaching,wrap(async(req,res)=>{
  const db=await pool.getConnection();
  try {
    await db.beginTransaction();
    const [[initial]]=await db.query('SELECT student_id FROM academic_results WHERE id=?',[positiveId(req.params.id)||0]);
    if(!initial)fail(404,'Result not found.');
    await db.query('SELECT id FROM students WHERE id=? FOR UPDATE',[initial.student_id]);
    const [[old]]=await db.query('SELECT * FROM academic_results WHERE id=? FOR UPDATE',[positiveId(req.params.id)]);
    if(!old)fail(404,'Result not found.');
    await canAccessStudent(req.user,old.student_id,db);
    if(req.user.role==='teacher'&&['published','archived'].includes(old.publication_status))fail(403,'An administrator must reopen this result.');
    const merged={...old,...req.body,student_id:old.student_id};
    if (req.body.term_id === null && old.term_id) fail(400, 'Choose a term from the school calendar.');
    await saveResult(merged,req.user,db,old);await db.commit();res.json({id:old.id});
  } catch(error){await db.rollback();throw error;}finally{db.release();}
}));
app.post('/api/results/import',teaching,wrap(async(req,res)=>{const rows=parseCsv(req.body.csv),db=await pool.getConnection();try{await db.beginTransaction();const ids=[...new Set(rows.map(r=>positiveId(r.student_id)))].filter(Boolean).sort((a,b)=>a-b);for(const id of ids)await db.query('SELECT id FROM students WHERE id=? FOR UPDATE',[id]);for(let i=0;i<rows.length;i++){try{await saveResult(rows[i],req.user,db);}catch(error){error.message=`Row ${i+2}: ${error.message}`;throw error;}}await db.commit();res.status(201).json({imported:rows.length,count:rows.length});}catch(error){await db.rollback();throw error;}finally{db.release();}}));
app.get('/api/students/:studentId/attendance',roles('admin','teacher','parent'),wrap(async(req,res)=>{await canAccessStudent(req.user,req.params.studentId);const [rows]=await pool.query('SELECT * FROM attendance WHERE student_id=? ORDER BY attendance_date DESC',[req.params.studentId]);res.json(rows);}));
app.get('/api/attendance',teaching,wrap(async(req,res)=>{const scope=studentScope(req.user);const [rows]=await pool.query(`SELECT a.*,CONCAT(s.first_name,' ',s.last_name) student_name FROM attendance a JOIN students s ON s.id=a.student_id WHERE ${scope.sql} ORDER BY a.attendance_date DESC,a.id DESC`,scope.params);res.json(rows);}));
app.post('/api/attendance',teaching,wrap(async(req,res)=>{const b=req.body;await canAccessStudent(req.user,b.student_id);await pool.query('INSERT INTO attendance(student_id,attendance_date,status,reason) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),reason=VALUES(reason)',[b.student_id,date(b.attendance_date,'Attendance date'),choice(b.status,['present','absent','late','excused'],'attendance status'),text(b.reason,'Reason',255,true)]);res.status(201).json({saved:true});}));
const invoiceQuery=`SELECT fi.*,CONCAT(s.first_name,' ',s.last_name) student_name,COALESCE(paid.amount_paid,0) amount_paid FROM fee_invoices fi JOIN students s ON s.id=fi.student_id LEFT JOIN (SELECT invoice_id,SUM(amount_paid) amount_paid FROM payments GROUP BY invoice_id) paid ON paid.invoice_id=fi.id`;
app.get('/api/fees',finance,wrap(async(_req,res)=>{const [rows]=await pool.query(invoiceQuery+' ORDER BY fi.id DESC');res.json(rows);}));
app.get('/api/students/:studentId/fees',roles('admin','bursar','parent'),wrap(async(req,res)=>{await canAccessStudent(req.user,req.params.studentId);const [rows]=await pool.query(invoiceQuery+' WHERE fi.student_id=? ORDER BY fi.id DESC',[req.params.studentId]);res.json(rows);}));
app.post('/api/fees',finance,wrap(async(req,res)=>{const b=req.body;await canAccessStudent(req.user,b.student_id);const [r]=await pool.query("INSERT INTO fee_invoices(student_id,invoice_number,description,amount_due,due_date,status) VALUES (?,?,?,?,?,'unpaid')",[b.student_id,text(b.invoice_number,'Invoice number',50),text(b.description,'Description',255),number(b.amount_due,'Amount due',0.01),date(b.due_date,'Due date',true)]);res.status(201).json({id:r.insertId});}));
app.get('/api/payments',roles('admin','bursar','parent'),wrap(async(req,res)=>{let filter='1=1',params=[];if(req.query.student_id){await canAccessStudent(req.user,req.query.student_id);filter='fi.student_id=?';params=[req.query.student_id];}else if(req.user.role==='parent'){const scope=studentScope(req.user);filter=scope.sql;params=scope.params;}const [rows]=await pool.query(`SELECT p.*,fi.student_id,fi.invoice_number,fi.description,CONCAT(s.first_name,' ',s.last_name) student_name FROM payments p JOIN fee_invoices fi ON fi.id=p.invoice_id JOIN students s ON s.id=fi.student_id WHERE ${filter} ORDER BY p.payment_date DESC,p.id DESC`,params);res.json(rows);}));
app.post('/api/payments',finance,wrap(async(req,res)=>{const b=req.body,amount=number(b.amount_paid,'Payment',0.01),db=await pool.getConnection();try{await db.beginTransaction();const [[invoice]]=await db.query('SELECT * FROM fee_invoices WHERE id=? FOR UPDATE',[positiveId(b.invoice_id)||0]);if(!invoice)fail(404,'Invoice not found.');const [[paid]]=await db.query('SELECT COALESCE(SUM(amount_paid),0) total FROM payments WHERE invoice_id=?',[invoice.id]);if(Math.round((Number(paid.total)+amount)*100)>Math.round(Number(invoice.amount_due)*100))fail(400,'Payment exceeds the outstanding invoice balance.');const [r]=await db.query('INSERT INTO payments(invoice_id,receipt_number,amount_paid,payment_date,payment_method,reference) VALUES (?,?,?,?,?,?)',[invoice.id,text(b.receipt_number,'Receipt number',50),amount,date(b.payment_date,'Payment date'),choice(b.payment_method,['bank_transfer','cash','pos','cheque','online'],'payment method'),text(b.reference,'Reference',100,true)]);const fullyPaid=Math.round((Number(paid.total)+amount)*100)===Math.round(Number(invoice.amount_due)*100);await db.query('UPDATE fee_invoices SET status=? WHERE id=?',[fullyPaid?'paid':'partially_paid',invoice.id]);await db.commit();res.status(201).json({id:r.insertId});}catch(error){await db.rollback();throw error;}finally{db.release();}}));
app.get('/api/admin/announcements',teaching,wrap(async(req,res)=>{let filter='1=1',params=[];if(req.user.role==='teacher'){filter="(a.audience='school' OR (a.audience='class' AND a.class_id IN (SELECT class_id FROM staff_classes WHERE account_id=?)) OR (a.audience='student' AND a.student_id IN (SELECT s.id FROM students s JOIN staff_classes sc ON sc.class_id=s.class_id WHERE sc.account_id=?)))";params=[req.user.id,req.user.id];}const [rows]=await pool.query(`SELECT a.* FROM announcements a WHERE ${filter} ORDER BY a.id DESC`,params);res.json(rows);}));
app.get('/api/announcements',all,wrap(async(req,res)=>{if(req.query.student_id){const student=await canAccessStudent(req.user,req.query.student_id);return res.json(await noticesFor(student));}if(req.user.role==='parent'){const scope=studentScope(req.user);const [students]=await pool.query(`SELECT s.* FROM students s WHERE ${scope.sql}`,scope.params);const records=(await Promise.all(students.map(noticesFor))).flat();return res.json([...new Map(records.map(x=>[x.id,x])).values()]);}const [rows]=await pool.query("SELECT * FROM announcements WHERE is_published=TRUE AND audience='school' AND (expires_at IS NULL OR expires_at>=NOW()) ORDER BY published_at DESC");res.json(rows);}));
async function announcementData(b,user) {
  const audience=choice(b.audience||'school',['school','class','student'],'audience');
  let classId=null,studentId=null;
  if(audience==='class') {
    classId=positiveId(b.class_id);
    if(!classId)fail(400,'Select the recipient class.');
    if(user.role==='teacher') {
      const [[link]]=await pool.query('SELECT 1 FROM staff_classes WHERE account_id=? AND class_id=?',[user.id,classId]);
      if(!link)fail(403,'Choose one of your assigned classes.');
    }
  }
  if(audience==='student'){studentId=positiveId(b.student_id);await canAccessStudent(user,studentId);}
  if(user.role==='teacher'&&audience==='school')fail(403,'Only an administrator can write school-wide notices.');
  const published=b.is_published===true||b.is_published===1;
  let expires=null;
  if(b.expires_at) {
    const value=String(b.expires_at);
    if(!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{3}Z)?)?$/.test(value)||!Number.isFinite(Date.parse(value)))fail(400,'Choose a valid expiry date and time.');
    // Let the MySQL driver encode local server time consistently with NOW().
    expires=new Date(value);
  }
  return[text(b.title,'Title',200),text(b.message,'Message',10000),audience,classId,studentId,published,expires];
}
app.post('/api/announcements',teaching,wrap(async(req,res)=>{const [title,message,audience,classId,studentId,published,expires]=await announcementData(req.body,req.user);const [r]=await pool.query('INSERT INTO announcements(title,message,audience,class_id,student_id,is_published,published_at,expires_at) VALUES (?,?,?,?,?,?,IF(?,NOW(),NULL),?)',[title,message,audience,classId,studentId,published,published,expires]);res.status(201).json({id:r.insertId});}));
app.patch('/api/announcements/:id',teaching,wrap(async(req,res)=>{const [[old]]=await pool.query('SELECT * FROM announcements WHERE id=?',[positiveId(req.params.id)||0]);if(!old)fail(404,'Announcement not found.');await announcementData(old,req.user);const [title,message,audience,classId,studentId,published,expires]=await announcementData({...old,...req.body},req.user);await pool.query('UPDATE announcements SET title=?,message=?,audience=?,class_id=?,student_id=?,is_published=?,published_at=IF(?,COALESCE(published_at,NOW()),NULL),expires_at=? WHERE id=?',[title,message,audience,classId,studentId,published,published,expires,old.id]);res.json({id:old.id});}));
const enquiryLimit=limit('enquiry',15);
app.post('/api/admissions',enquiryLimit,wrap(async(req,res)=>{const b=req.body,reference='MLS-APP-'+randomBytes(8).toString('hex').toUpperCase();const [r]=await pool.query('INSERT INTO admissions(reference,parent_name,parent_email,parent_phone,child_name,child_date_of_birth,selected_class,notes,preferred_tour_date) VALUES (?,?,?,?,?,?,?,?,?)',[reference,text(b.parentFullName,'Parent name',150),email(b.parentEmail),text(b.parentPhone,'Phone',40),text(b.childFullName,'Child name',150),date(b.childDateOfBirth,'Date of birth'),text(b.selectedClass,'Class',100),text(b.notes,'Notes',5000,true),date(b.preferredTourDate,'Preferred tour date',true)]);res.status(201).json({id:r.insertId,reference});}));
app.post('/api/tours',enquiryLimit,wrap(async(req,res)=>{const b=req.body,reference='MLS-TOUR-'+randomBytes(8).toString('hex').toUpperCase();const [r]=await pool.query('INSERT INTO tours(reference,full_name,email,phone,preferred_date,interested_class,message) VALUES (?,?,?,?,?,?,?)',[reference,text(b.fullName,'Name',150),email(b.email),text(b.phone,'Phone',40),date(b.preferredDate,'Preferred date'),text(b.interestedClass,'Class',100),text(b.message,'Message',5000,true)]);res.status(201).json({id:r.insertId,reference});}));
for(const [table,statuses]of [['admissions',['new','contacted','accepted','declined']],['tours',['new','confirmed','completed','cancelled']]]){
  app.get('/api/'+table,requireAdmin,wrap(async(_req,res)=>{const [rows]=await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);res.json(rows);}));
  app.patch('/api/'+table+'/:id',requireAdmin,wrap(async(req,res)=>{const [r]=await pool.query(`UPDATE ${table} SET status=? WHERE id=?`,[choice(req.body.status,statuses,'status'),positiveId(req.params.id)||0]);if(!r.affectedRows)fail(404,'Request not found.');res.json({ok:true});}));
}
app.post('/api/sync/students',requireAdmin,wrap(async(_req,res)=>{
  const records=await fetchAllAirtableRecords(),db=await pool.getConnection();let synced=0;
  try{await db.beginTransaction();for(const record of records){const f=record.fields||{},code=text(String(airtableField(f,'Student_ID','Student ID')||record.id),'Student ID',50),first=text(airtableField(f,'First_Name','First Name'),'First name',100),last=text(airtableField(f,'Last_Name','Last Name'),'Last name',100);const classValue=airtableField(f,'Class Name','Class_Name');let classId=null;if(classValue){const name=Array.isArray(classValue)?classValue[0]:classValue;if(typeof name!=='string'||name.startsWith('rec'))fail(400,'Provide a Class Name lookup in Airtable to resolve linked classes.');const [c]=await db.query('INSERT INTO classes(name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',[text(name,'Class',100)]);classId=c.insertId;}await db.query('INSERT INTO students(student_code,first_name,last_name,date_of_birth,class_id,enrollment_status) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE first_name=VALUES(first_name),last_name=VALUES(last_name),date_of_birth=VALUES(date_of_birth),class_id=COALESCE(VALUES(class_id),class_id),enrollment_status=VALUES(enrollment_status)',[code,first,last,date(airtableField(f,'Date of Birth','Date_Of_Birth'),'Date of birth',true),classId,choice(String(airtableField(f,'Enrollment_Status','Enrollment Status')||'active').toLowerCase(),['pending','active','inactive'],'enrollment status')]);synced++;}await db.commit();res.json({synced});}catch(error){await db.rollback();throw error;}finally{db.release();}
}));
app.use((_req,res)=>res.status(404).json({error:'Endpoint not found.'}));
app.use((error,_req,res,_next)=>{let status=error.status||error.statusCode||500,message=error.message;if(error.code==='ER_DUP_ENTRY'){status=409;message='This record already exists. Please edit the existing record.';}if(error.code==='ER_NO_REFERENCED_ROW_2'){status=400;message='The linked record does not exist. Choose a valid student, parent or class.';}if(status>=500){console.error('School API error:',error.code||error.name);message='The request could not be completed. Please try again.';}res.status(status).json({error:message});});
