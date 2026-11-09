import {randomBytes} from 'node:crypto';
import {pool} from './db.js';
import {digest,fail,hashPassword,positiveId,requireAdmin,issueSession} from './auth.js';
import {email,text} from './validation.js';
export async function ensureEnrollmentSchema(db=pool){
 const [[column]]=await db.query("SELECT COUNT(*) present FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='accounts' AND column_name='self_registered'");
 if(!Number(column.present))await db.query('ALTER TABLE accounts ADD COLUMN self_registered BOOLEAN NOT NULL DEFAULT FALSE');
 await db.query(`CREATE TABLE IF NOT EXISTS parent_link_codes (token_hash CHAR(64) PRIMARY KEY,parent_id BIGINT UNSIGNED NOT NULL,issued_by BIGINT UNSIGNED NOT NULL,expires_at DATETIME NOT NULL,claimed_by BIGINT UNSIGNED NULL,claimed_at DATETIME NULL,FOREIGN KEY(parent_id) REFERENCES parents(id),FOREIGN KEY(issued_by) REFERENCES accounts(id),FOREIGN KEY(claimed_by) REFERENCES accounts(id))`);
 await db.query(`CREATE TABLE IF NOT EXISTS parent_link_code_students (token_hash CHAR(64) NOT NULL,student_id BIGINT UNSIGNED NOT NULL,PRIMARY KEY(token_hash,student_id),FOREIGN KEY(token_hash) REFERENCES parent_link_codes(token_hash) ON DELETE CASCADE,FOREIGN KEY(student_id) REFERENCES students(id))`);
}
export function installEnrollment(app,{wrap,limit}){
 app.post('/api/parents/:id/link-code',requireAdmin,wrap(async(req,res)=>{
  const parentId=positiveId(req.params.id),ids=req.body.student_ids;
  if(!parentId||!Array.isArray(ids)||!ids.length||ids.length>20||ids.some(id=>!positiveId(id)))fail(400,'Choose a guardian and between one and twenty pupils.');
  const code=randomBytes(16).toString('hex'),hash=digest(code),db=await pool.getConnection();
  try{await db.beginTransaction();
   const [[guardian]]=await db.query("SELECT id FROM parents WHERE id=? AND status='active' FOR UPDATE",[parentId]);if(!guardian)fail(400,'Choose an active guardian record.');
   const students=[];
   for(const id of [...new Set(ids.map(Number))].sort((a,b)=>a-b)){const [[student]]=await db.query("SELECT id,student_code FROM students WHERE id=? AND enrollment_status='active' FOR UPDATE",[id]);if(!student)fail(400,'Choose active pupils from the school records.');students.push(student);}
   await db.query('UPDATE parent_link_codes SET expires_at=NOW() WHERE parent_id=? AND claimed_by IS NULL',[parentId]);
   await db.query('INSERT INTO parent_link_codes(token_hash,parent_id,issued_by,expires_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))',[hash,parentId,req.user.id]);
   for(const student of students)await db.query('INSERT INTO parent_link_code_students VALUES (?,?)',[hash,student.id]);
   await db.commit();res.json({parent_id:parentId,student_codes:students.map(row=>row.student_code),link_code:code,expires_in_days:7});
  }catch(error){await db.rollback();throw error;}finally{db.release();}
 }));
 app.post('/api/auth/parent/register',limit('parent-register',15),wrap(async(req,res)=>{
  const b=req.body,password=text(b.password,'Password',200),address=email(b.email);if(password.length<12)fail(400,'Use a password of at least 12 characters.');
  const [created]=await pool.query("INSERT INTO accounts(full_name,email,password_hash,role,active,registration_pending,self_registered) VALUES (?,?,?,'parent',FALSE,TRUE,TRUE)",[text(b.full_name,'Name',150),address,await hashPassword(password)]);
  await issueSession(req,res,{id:created.insertId});res.status(201).json({ok:true});
 }));
 app.post('/api/auth/parent/link-children',limit('parent-link',15),wrap(async(req,res)=>{
  if(!req.user)fail(401,'Please sign in.');if(req.user.role!=='parent')fail(403,'Sign in with a parent account to link children.');
  const b=req.body,code=typeof b.link_code==='string'?b.link_code.trim().toLowerCase():'',codes=b.student_codes;
  if(!/^[a-f0-9]{32}$/.test(code)||!Array.isArray(codes)||!codes.length||codes.length>20||codes.some(value=>typeof value!=='string'||!value.trim()||value.length>50))fail(400,'Enter the student IDs and private linking code supplied by the school.');
  const hash=digest(code),db=await pool.getConnection();
  try{await db.beginTransaction();
   const [[account]]=await db.query('SELECT * FROM accounts WHERE id=? FOR UPDATE',[req.user.id]);if(!account||account.role!=='parent'||(!account.active&&!account.registration_pending))fail(403,'This account is deactivated.');
   const [[grant]]=await db.query('SELECT * FROM parent_link_codes WHERE token_hash=? AND claimed_by IS NULL AND expires_at>NOW() FOR UPDATE',[hash]);if(!grant)fail(400,'The linking code or student IDs are invalid, expired or already used.');
   const [[parent]]=await db.query("SELECT id FROM parents WHERE id=? AND status='active' FOR UPDATE",[grant.parent_id]);
   const [[other]]=await db.query("SELECT id FROM accounts WHERE parent_id=? AND role='parent' AND id<>? LIMIT 1 FOR UPDATE",[grant.parent_id,account.id]);
   if(!parent||other||(account.parent_id&&Number(account.parent_id)!==Number(grant.parent_id)))fail(400,'This linking code is not available for this parent account. Contact the school for your own code.');
   const linked=[];
   for(const studentCode of [...new Set(codes.map(value=>value.trim()))]){const [[student]]=await db.query("SELECT s.id FROM parent_link_code_students allowed JOIN students s ON s.id=allowed.student_id WHERE allowed.token_hash=? AND s.student_code=? AND s.enrollment_status='active' FOR UPDATE",[hash,studentCode]);if(!student)fail(400,'The linking code or student IDs are invalid, expired or already used.');linked.push(student.id);}
   for(const id of linked)await db.query("INSERT INTO parent_students(parent_id,student_id,relationship,is_primary_guardian) VALUES (?,?,'Parent',FALSE) ON DUPLICATE KEY UPDATE parent_id=parent_id",[grant.parent_id,id]);
   await db.query('UPDATE accounts SET parent_id=?,active=TRUE,registration_pending=FALSE WHERE id=?',[grant.parent_id,account.id]);
   await db.query('UPDATE parent_link_codes SET claimed_by=?,claimed_at=NOW() WHERE token_hash=?',[account.id,hash]);
   await db.commit();res.json({ok:true,linked:linked.length});
  }catch(error){await db.rollback();throw error;}finally{db.release();}
 }));
}
