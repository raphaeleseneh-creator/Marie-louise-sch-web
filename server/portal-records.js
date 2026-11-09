import {pool} from './db.js';
import {roles,canAccessStudent} from './auth.js';
import {readWithReconnect} from './resilient-read.js';

const unavailable='School records could not be loaded. Please refresh and try again.';
const sumMoney=(rows,key)=>rows.reduce((sum,row)=>sum+Math.round(Number(row[key])*100),0)/100;
function resource(result){
  if(result.status==='fulfilled')return{data:result.value,error:''};
  console.error('Portal records read failed:',result.reason.code||result.reason.name);
  return{data:null,error:unavailable};
}
export async function loadPortalRecords(student,db=pool){
  const rows=async(sql,args)=>{const [values]=await readWithReconnect(db,sql,args);return values;};
  const queries=await Promise.allSettled([
    rows('SELECT name FROM classes WHERE id=?',[student.class_id]),
    rows("SELECT * FROM academic_results WHERE student_id=? AND publication_status='published' ORDER BY term_name,subject",[student.id]),
    rows('SELECT * FROM attendance WHERE student_id=? ORDER BY attendance_date DESC',[student.id]),
    rows('SELECT fi.*,COALESCE((SELECT SUM(p.amount_paid) FROM payments p WHERE p.invoice_id=fi.id),0) amount_paid FROM fee_invoices fi WHERE fi.student_id=? ORDER BY fi.id DESC',[student.id]),
    rows('SELECT p.*,fi.student_id,fi.invoice_number,fi.description FROM payments p JOIN fee_invoices fi ON fi.id=p.invoice_id WHERE fi.student_id=? ORDER BY p.payment_date DESC,p.id DESC',[student.id]),
    rows("SELECT * FROM announcements WHERE is_published=TRUE AND (expires_at IS NULL OR expires_at>=NOW()) AND (audience='school' OR (audience='class' AND class_id=?) OR (audience='student' AND student_id=?)) ORDER BY published_at DESC",[student.class_id,student.id]),
  ]);
  const [classes,results,attendance,fees,payments,notices]=queries.map(resource);
  const summaryReady=classes.data&&attendance.data&&fees.data&&notices.data;
  const dashboard=summaryReady?{data:{
    student:{id:student.id,student_code:student.student_code,first_name:student.first_name,last_name:student.last_name,class_name:classes.data[0]?.name||null},
    attendance:{total_days:attendance.data.length,days_present:attendance.data.filter(row=>row.status==='present').length,days_absent:attendance.data.filter(row=>row.status==='absent').length,other_days:attendance.data.filter(row=>['late','excused'].includes(row.status)).length},
    fees:{total_due:sumMoney(fees.data,'amount_due'),total_paid:sumMoney(fees.data,'amount_paid')},
    announcements:notices.data,
  },error:''}:{data:null,error:unavailable};
  return{dashboard,results,attendance,fees,payments};
}
export function installPortalRecords(app,wrap){
  app.get('/api/students/:studentId/portal-records',roles('parent','developer'),wrap(async(req,res)=>{
    const student=await canAccessStudent(req.user,req.params.studentId);
    res.json(await loadPortalRecords(student));
  }));
}
