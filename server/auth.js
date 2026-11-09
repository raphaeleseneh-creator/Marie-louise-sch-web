import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';
const scrypt = promisify(rawScrypt);
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) { const salt=randomBytes(16).toString('hex'); return `${salt}:${(await scrypt(password,salt,64)).toString('hex')}`; }
export async function verifyPassword(password,stored) { const [salt,hash]=stored.split(':');const actual=await scrypt(password,salt,64),expected=Buffer.from(hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected); }
export function fail(status,message) { throw Object.assign(new Error(message),{status}); }
export function positiveId(value) {const id=Number(value);return Number.isSafeInteger(id)&&id>0?id:null;}
export const sessionCookieOptions = () => ({httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/api'});
export async function issueSession(req,res,account) {
  const previous=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ml_session='))?.slice(11);
  if(previous)await pool.query('DELETE FROM sessions WHERE token_hash=?',[digest(previous)]);
  await pool.query('DELETE FROM sessions WHERE expires_at<NOW()');
  const token=randomBytes(32).toString('hex');
  await pool.query('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 8 HOUR))',[digest(token),account.id]);
  res.cookie('ml_session',token,{...sessionCookieOptions(),maxAge:8*60*60*1000});
}
export async function identify(req,_res,next) {
  try {
    const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ml_session='))?.slice(11);
    if(token && /^[a-f0-9]{64}$/.test(token)) { const [[user]]=await pool.query(`SELECT a.id,a.full_name,a.email,a.role,a.parent_id,a.registration_pending FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>NOW() AND ((a.active=TRUE AND a.registration_pending=FALSE AND (a.role<>'parent' OR EXISTS (SELECT 1 FROM parents p WHERE p.id=a.parent_id AND p.status='active'))) OR (a.active=FALSE AND a.registration_pending=TRUE AND a.role='parent' AND a.parent_id IS NULL))`,[digest(token)]);req.user=user||null; }
    next();
  } catch(error) {next(error);}
}
export function roles(...allowed) {return(req,_res,next)=>{if(!req.user)return next(Object.assign(new Error('Please sign in.'),{status:401}));const permitted=allowed.includes(req.user.role)||(req.user.role==='developer'&&allowed.includes('admin'));if(req.user.registration_pending||!permitted)return next(Object.assign(new Error('You do not have permission for this action.'),{status:403}));next();};}
export const requireAdmin=roles('admin');
export async function canAccessStudent(user,studentId,db=pool) {
  if(!user || user.registration_pending || !['admin','teacher','bursar','parent','developer'].includes(user.role))fail(403,'School approval is required.');
  if(!positiveId(studentId))fail(400,'Choose a valid student.');
  const [[student]]=await db.query('SELECT * FROM students WHERE id=?',[studentId]);if(!student)fail(404,'Student not found.');
  if(user.role==='parent') {const [[link]]=await db.query(`SELECT 1 FROM parent_students ps JOIN parents p ON p.id=ps.parent_id WHERE ps.parent_id=? AND ps.student_id=? AND p.status='active' AND ?='active'`,[user.parent_id,studentId,student.enrollment_status]);if(!link)fail(403,'This student is not linked to your account.');}
  else if(user.role==='teacher') {const [[link]]=await db.query('SELECT 1 FROM staff_classes WHERE account_id=? AND class_id=?',[user.id,student.class_id]);if(!link)fail(403,'This student is outside your assigned classes.');}
  return student;
}
export function studentScope(user,alias='s') {
  if(!user || user.registration_pending || !['admin','teacher','bursar','parent','developer'].includes(user.role))return{sql:'1=0',params:[]};
  if(user.role==='teacher')return{sql:`${alias}.class_id IN (SELECT class_id FROM staff_classes WHERE account_id=?)`,params:[user.id]};
  if(user.role==='parent')return{sql:`${alias}.enrollment_status='active' AND ${alias}.id IN (SELECT student_id FROM parent_students WHERE parent_id=?)`,params:[user.parent_id]};
  return{sql:'1=1',params:[]};
}
