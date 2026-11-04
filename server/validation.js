import {fail} from './auth.js';
export function text(value,label,max=255,optional=false) {if(optional&&(value===undefined||value===null||value===''))return null;if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(400,`${label} is required and must be no longer than ${max} characters.`);return value.trim();}
export function number(value,label,min=0,max=9999999999.99) {if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max)fail(400,`${label} must be between ${min} and ${max}.`);return Number(value);}
export function choice(value,allowed,label){if(!allowed.includes(value))fail(400,`Choose a valid ${label}.`);return value;}
export function date(value,label,optional=false){if(optional&&!value)return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail(400,`${label} must be a valid date.`);return value;}
export function email(value){const result=text(value,'Email',255).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))fail(400,'Enter a valid email address.');return result;}
export function resultData(body,user) {
  const ca1=number(body.ca1_score||0,'CA 1',0,100),ca2=number(body.ca2_score||0,'CA 2',0,100),exam=number(body.exam_score||0,'Exam',0,100);
  const total=Math.round((ca1+ca2+exam)*100)/100;
  if(total>100)fail(400,'Combined scores must not exceed 100.');
  const status=choice(body.publication_status||'draft',['draft','pending','published','archived'],'result status');
  if(user.role==='teacher'&&!['draft','pending'].includes(status))fail(403,'Submit results for an administrator to publish.');
  const grade=total>=70?'A':total>=60?'B':total>=50?'C':total>=45?'D':total>=40?'E':'F';
  return[text(body.term_name,'Term',50),text(body.subject,'Subject',100),ca1,ca2,exam,total,grade,text(body.teacher_remarks,'Teacher remarks',5000,true),status];
}
export function parseCsv(input){
  if(typeof input!=='string'||!input.trim())fail(400,'Choose a CSV file containing results.');
  const rows=[];let row=[],cell='',quoted=false;const source=input.replace(/^\uFEFF/,'');
  for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else if(quoted||!cell)quoted=!quoted;else fail(400,'Malformed CSV quotation.');}else if(c===','&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)fail(400,'CSV contains an unclosed quoted field.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);const headers=rows.shift()||[];
  for(const required of ['student_id','subject','ca1_score','ca2_score','exam_score'])if(!headers.includes(required))fail(400,`CSV is missing column: ${required}`);
  if (!headers.includes('term_id') && !headers.includes('term_name')) fail(400, 'CSV is missing column: term_id');
  if(new Set(headers).size!==headers.length)fail(400,'CSV column headings must be unique.');if(!rows.length||rows.length>1000)fail(400,'Import between 1 and 1000 result rows at a time.');
  return rows.map((values,i)=>{if(values.length!==headers.length)fail(400,`CSV row ${i+2} has the wrong number of columns.`);return Object.fromEntries(headers.map((h,j)=>[h,values[j]]));});
}
