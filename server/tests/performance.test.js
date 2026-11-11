import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPortalRecords} from '../portal-records.js';
import {createWorkspaceCache} from '../../src/lib/workspace-cache.js';
import {ensurePerformanceIndexes} from '../performance-schema.js';
test('workspace catalog reads are deduplicated, account-scoped and invalidated',async()=>{
 const cache=createWorkspaceCache();let calls=0;const load=async()=>{calls++;return[{id:calls}];};
 const [a,b]=await Promise.all([cache.read(1,'/students',load),cache.read(1,'/students',load)]);assert.equal(calls,1);assert.equal(a,b);
 await cache.read(2,'/students',load);assert.equal(calls,2);cache.clear();await cache.read(1,'/students',load);assert.equal(calls,3);
 await assert.rejects(cache.read(1,'/classes',()=>Promise.reject(new Error('offline'))));await cache.read(1,'/classes',load);assert.equal(calls,4);
});
test('combined records use six scoped reads and derive precise fee and attendance totals',async()=>{
 const calls=[];const db={async query(sql,args){calls.push({sql,args});
  if(sql.includes('FROM classes'))return[[{name:'Primary 1'}]];
  if(sql.includes('academic_results'))return[[{subject:'Math',publication_status:'published'}]];
  if(sql.includes('FROM attendance'))return[[{status:'present'},{status:'absent'},{status:'late'}]];
  if(sql.includes('SELECT fi.*'))return[[{amount_due:'0.10',amount_paid:'0.10'},{amount_due:'0.20',amount_paid:'0.00'}]];
  if(sql.includes('FROM payments'))return[[]];return[[{audience:'school',is_published:1}]];
 }};
 const data=await loadPortalRecords({id:42,class_id:7,student_code:'fixture',first_name:'Test',last_name:'Pupil'},db);
 assert.equal(calls.length,6);assert.equal(data.dashboard.data.fees.total_due,0.3);assert.equal(data.dashboard.data.fees.total_paid,0.1);
 assert.deepEqual(data.dashboard.data.attendance,{total_days:3,days_present:1,days_absent:1,other_days:1});
 assert.ok(calls.find(row=>row.sql.includes('academic_results')).sql.includes("publication_status='published'"));
 assert.ok(calls.find(row=>row.sql.includes('announcements')).sql.includes('expires_at>=NOW()'));
 assert.ok(calls.every(row=>row.args.includes(42)||row.sql.includes('classes')||row.sql.includes('announcements')));
});
test('a failed records section preserves successfully loaded sections',async()=>{
 const db={async query(sql){if(sql.includes('academic_results'))throw Object.assign(new Error('simulated'),{code:'ETIMEDOUT'});return[[]];}};
 const result=await loadPortalRecords({id:1,class_id:null},db);assert.equal(result.results.data,null);assert.ok(result.results.error);assert.deepEqual(result.attendance.data,[]);assert.equal(result.dashboard.error,'');
});
test('equivalent indexes are reused rather than duplicated',async()=>{
 let writes=0;const db={async query(sql,args){if(sql.startsWith('CREATE')){writes++;return[{}];}return[[{index_columns:args[0]==='academic_results'?'student_id,publication_status,term_name,subject':'invoice_id,payment_date,id'}]];}};
 await ensurePerformanceIndexes(db);assert.equal(writes,0);
});
