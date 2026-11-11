import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

test('parents register immediately and privately link multiple school-issued student IDs without approvals',{skip:process.env.RUN_DB_TESTS!=='1',timeout:Number(process.env.DB_TEST_TIMEOUT_MS||120000)},async t=>{
  const {pool}=await import('../db.js'),{app}=await import('../app.js'),{hashPassword,digest}=await import('../auth.js');
  const prefix='link_test_'+randomUUID().replaceAll('-','').slice(0,12),password='Fixture-password-123!';
  const accounts=[],parents=[],students=[];let server;
  t.after(async()=>{
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    try{
      for(const id of parents){await pool.query('DELETE FROM parent_link_codes WHERE parent_id=?',[id]);await pool.query('DELETE FROM parent_students WHERE parent_id=?',[id]);}
      for(const id of accounts){await pool.query('DELETE FROM sessions WHERE account_id=?',[id]);await pool.query('DELETE FROM accounts WHERE id=?',[id]);}
      for(const id of students)await pool.query('DELETE FROM students WHERE id=?',[id]);
      for(const id of parents)await pool.query('DELETE FROM parents WHERE id=?',[id]);
    }finally{await pool.end();}
  });
  const [admin]=await pool.query("INSERT INTO accounts(full_name,email,password_hash,role) VALUES (?,?,?,'admin')",[prefix,prefix+'_admin@example.invalid',await hashPassword(password)]);accounts.push(admin.insertId);
  for(let i=0;i<2;i++){const [p]=await pool.query("INSERT INTO parents(full_name,email,status) VALUES (?,?,'active')",[prefix+i,prefix+i+'@example.invalid']);parents.push(p.insertId);}
  for(let i=0;i<4;i++){const [s]=await pool.query("INSERT INTO students(student_code,first_name,last_name,enrollment_status) VALUES (?,?,?,'active')",[prefix+'_'+i,'Synthetic','Child '+i]);students.push(s.insertId);}
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  async function call(path,body,cookie,method){const response=await fetch(base+'/api'+path,{method:method||(body?'POST':'GET'),signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
  const adminCookie=(await call('/auth/login',{email:prefix+'_admin@example.invalid',password})).cookie;
  async function register(suffix){const result=await call('/auth/parent/register',{full_name:'Synthetic Parent',email:prefix+suffix+'@example.invalid',password});assert.equal(result.status,201);const me=await call('/auth/me',null,result.cookie);accounts.push(me.data.user.id);assert.equal(Number(me.data.user.registration_pending),1);return{...result,id:me.data.user.id};}
  const family=await register('_family'),outsider=await register('_outsider');
  const again=await call('/auth/login',{email:prefix+'_family@example.invalid',password});assert.equal(again.status,200,'new parent can sign in before linking');
  for(const path of ['/students','/parents/'+parents[0]+'/children','/students/'+students[0]+'/dashboard'])assert.equal((await call(path,null,family.cookie)).status,403,'unlinked account has no pupil access');
  assert.equal((await call('/parents/'+parents[0]+'/link-code',{student_ids:[students[0]]},family.cookie)).status,403,'parents cannot issue codes');
  const grant=await call('/parents/'+parents[0]+'/link-code',{student_ids:[students[0],students[1]]},adminCookie);assert.equal(grant.status,200);assert.equal(grant.data.student_codes.length,2);
  const [[saved]]=await pool.query('SELECT token_hash FROM parent_link_codes WHERE parent_id=?',[parents[0]]);assert.equal(saved.token_hash,digest(grant.data.link_code));assert.notEqual(saved.token_hash,grant.data.link_code,'only a hash is stored');
  let linked=await call('/auth/parent/link-children',{student_codes:[prefix+'_0'],link_code:'0'.repeat(32)},family.cookie);assert.equal(linked.status,400,'student IDs alone cannot grant access');
  linked=await call('/auth/parent/link-children',{student_codes:[prefix+'_0',prefix+'_2'],link_code:grant.data.link_code},family.cookie);assert.equal(linked.status,400,'a valid code cannot include another child');
  const [[none]]=await pool.query('SELECT COUNT(*) count FROM parent_students WHERE parent_id=?',[parents[0]]);assert.equal(Number(none.count),0,'invalid second child rolls back the entire submission');
  linked=await call('/auth/parent/link-children',{student_codes:[prefix+'_0',prefix+'_1'],link_code:grant.data.link_code},family.cookie);assert.equal(linked.status,200);assert.equal(linked.data.linked,2);
  const me=await call('/auth/me',null,family.cookie);assert.equal(Number(me.data.user.parent_id),Number(parents[0]));assert.equal(Number(me.data.user.registration_pending),0);
  assert.equal((await call('/parents/'+parents[0]+'/children',null,family.cookie)).data.length,2,'same parent ID includes both siblings without approval');
  assert.equal((await call('/auth/parent/link-children',{student_codes:[prefix+'_0'],link_code:grant.data.link_code},outsider.cookie)).status,400,'code cannot be reused');
  assert.equal((await call('/students/'+students[2]+'/dashboard',null,family.cookie)).status,403,'other family records remain private');
  const additional=await call('/parents/'+parents[0]+'/link-code',{student_ids:[students[3]]},adminCookie);
  assert.equal((await call('/auth/parent/link-children',{student_codes:[prefix+'_3'],link_code:additional.data.link_code},family.cookie)).status,200);
  assert.equal((await call('/parents/'+parents[0]+'/children',null,family.cookie)).data.length,3,'later child is added to the same family');
  const otherGrant=await call('/parents/'+parents[1]+'/link-code',{student_ids:[students[2]]},adminCookie);
  assert.equal((await call('/auth/parent/link-children',{student_codes:[prefix+'_2'],link_code:otherGrant.data.link_code},family.cookie)).status,400,'linked parent cannot switch to another family');
  await pool.query('UPDATE parent_link_codes SET expires_at=DATE_SUB(NOW(),INTERVAL 1 DAY) WHERE token_hash=?',[digest(otherGrant.data.link_code)]);
  assert.equal((await call('/auth/parent/link-children',{student_codes:[prefix+'_2'],link_code:otherGrant.data.link_code},outsider.cookie)).status,400,'expired code rejected');
  const replacement=await call('/parents/'+parents[1]+'/link-code',{student_ids:[students[2]]},adminCookie);
  assert.equal((await call('/auth/parent/link-children',{student_codes:[prefix+'_2'],link_code:replacement.data.link_code},outsider.cookie)).status,200);
  assert.equal((await call('/parents/'+parents[0]+'/children',null,outsider.cookie)).status,403,'second parent cannot read first family');
  assert.equal((await call('/accounts/'+family.id,{active:false},adminCookie,'PATCH')).status,200);
  assert.equal((await call('/auth/me',null,family.cookie)).status,401,'revoked parent sessions remain invalid');
  assert.equal((await call('/auth/login',{email:prefix+'_family@example.invalid',password})).status,401,'revocation cannot be bypassed');
});
