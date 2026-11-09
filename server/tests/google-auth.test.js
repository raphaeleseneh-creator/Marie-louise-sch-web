import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateGoogleIdentity } from '../google-auth.js';
import { roles, studentScope, canAccessStudent, digest } from '../auth.js';

test('Google claims require verified email, stable subject and matching nonce', () => {
  const claims = {sub:'google-stable-id',email:'Parent@gmail.com',email_verified:true,nonce:'expected',name:'Parent'};
  assert.equal(validateGoogleIdentity(claims,'expected').email,'parent@gmail.com');
  assert.equal(validateGoogleIdentity(claims,'expected').authoritative,true);
  assert.equal(validateGoogleIdentity({...claims,email:'parent@example.org'},'expected').authoritative,false);
  assert.equal(validateGoogleIdentity({...claims,email:'parent@school.org',hd:'school.org'},'expected').authoritative,true);
  for(const change of [{email_verified:false},{nonce:'wrong'},{sub:''},{email:'invalid'}]) assert.throws(()=>validateGoogleIdentity({...claims,...change},'expected'),e=>e.status===401);
});

test('pending registrations are denied by every role guard and student scope', async () => {
  const user={id:1,role:'parent',registration_pending:1,parent_id:null};
  for(const role of ['admin','teacher','bursar','parent']) {
    let result;
    roles(role)({user},{},error=>{result=error;});
    assert.equal(result.status,403);
  }
  assert.equal(studentScope(user).sql,'1=0');
  await assert.rejects(()=>canAccessStudent(user,1,{query(){throw Error('Must not query pupil records');}}),e=>e.status===403);
});

test('Google API registration, browser binding, replay protection and private child linking', {skip:process.env.RUN_DB_TESTS!=='1',timeout:Number(process.env.DB_TEST_TIMEOUT_MS||120000)}, async t => {
  const { OAuth2Client } = await import('google-auth-library');
  const { pool } = await import('../db.js');
  const { app } = await import('../app.js');
  const { hashPassword } = await import('../auth.js');
  const oldVerify=OAuth2Client.prototype.verifyIdToken,oldClient=process.env.GOOGLE_CLIENT_ID;
  const prefix=`google_test_${randomUUID().replaceAll('-','').slice(0,12)}`;
  const address=`${prefix}@gmail.com`,password='Fixture-password-123!';
  const nonces=[];
  let claims,server,adminId,parentId,studentId,pendingId,selfRegisteredId;
  process.env.GOOGLE_CLIENT_ID='test-only.apps.googleusercontent.com';
  OAuth2Client.prototype.verifyIdToken=async function(options){assert.equal(options.audience,process.env.GOOGLE_CLIENT_ID);if(options.idToken!=='test-only-token')throw Error('Invalid signature');return{getPayload:()=>claims};};
  t.after(async()=>{
    OAuth2Client.prototype.verifyIdToken=oldVerify;
    if(oldClient===undefined)delete process.env.GOOGLE_CLIENT_ID;else process.env.GOOGLE_CLIENT_ID=oldClient;
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    try {
      if(parentId)await pool.query('DELETE FROM parent_link_codes WHERE parent_id=?',[parentId]);
      for(const nonce of nonces)await pool.query('DELETE FROM google_login_nonces WHERE nonce_hash=?',[digest(nonce)]);
      for(const id of [adminId,pendingId,selfRegisteredId].filter(Boolean)){await pool.query('DELETE FROM sessions WHERE account_id=?',[id]);await pool.query('DELETE FROM accounts WHERE id=?',[id]);}
      if(parentId)await pool.query('DELETE FROM parent_students WHERE parent_id=?',[parentId]);
      if(studentId)await pool.query('DELETE FROM students WHERE id=?',[studentId]);
      if(parentId)await pool.query('DELETE FROM parents WHERE id=?',[parentId]);
    }finally{await pool.end();}
  });
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  async function call(path,body,cookie){const response=await fetch(base+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});const result={status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};if(result.body.nonce)nonces.push(result.body.nonce);return result;}
  const challenge=await call('/api/auth/google/challenge',{portal:'parent'});assert.equal(challenge.status,200);
  claims={sub:prefix,email:address,email_verified:true,nonce:challenge.body.nonce,name:'Synthetic Google Parent'};
  assert.equal((await call('/api/auth/google',{credential:'test-only-token',nonce:claims.nonce})).status,401,'wrong browser');
  assert.equal((await call('/api/auth/google',{credential:'invalid-token',nonce:claims.nonce},challenge.cookie)).status,401,'invalid signature');
  const registration=await call('/api/auth/google',{credential:'test-only-token',nonce:claims.nonce},challenge.cookie);assert.equal(registration.status,200);assert.equal(registration.body.pending,true);
  const [[pending]]=await pool.query('SELECT * FROM accounts WHERE email=?',[address]);pendingId=pending.id;
  assert.equal(Number(pending.active),0);assert.equal(pending.parent_id,null);assert.equal(Number(pending.registration_pending),1);
  assert.equal((await call('/api/auth/google',{credential:'test-only-token',nonce:claims.nonce},challenge.cookie)).status,401,'challenge cannot be replayed');
  const expired=await call('/api/auth/google/challenge',{portal:'parent'});
  await pool.query('UPDATE google_login_nonces SET expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE nonce_hash=?',[digest(expired.body.nonce)]);
  claims={...claims,nonce:expired.body.nonce};
  assert.equal((await call('/api/auth/google',{credential:'test-only-token',nonce:claims.nonce},expired.cookie)).status,401,'expired challenge denied');
  const self=await call('/api/auth/me',null,registration.cookie);assert.equal(Number(self.body.user.registration_pending),1);
  for(const path of ['/api/developer/parent-portal/students','/api/students','/api/payments','/api/accounts','/api/classes','/api/parents/1/children','/api/students/1/results','/api/students/1/attendance','/api/students/1/fees','/api/students/1/dashboard'])assert.equal((await call(path,null,registration.cookie)).status,403,path);
  const [admin]=await pool.query("INSERT INTO accounts(full_name,email,password_hash,role) VALUES (?,?,?,'admin')",[prefix,`${prefix}admin@gmail.com`,await hashPassword(password)]);adminId=admin.insertId;
  const adminLogin=await call('/api/auth/login',{email:`${prefix}admin@gmail.com`,password});assert.equal(adminLogin.status,200);
  const patch=await fetch(base+`/api/accounts/${pendingId}`,{method:'PATCH',headers:{'Content-Type':'application/json',Cookie:adminLogin.cookie},body:JSON.stringify({active:true})});assert.equal(patch.status,409,'generic activation cannot bypass verification');
  const [parent]=await pool.query("INSERT INTO parents(full_name,email,status) VALUES (?,?,'active')",[prefix,address]);parentId=parent.insertId;
  const [student]=await pool.query("INSERT INTO students(student_code,first_name,last_name,enrollment_status) VALUES (?,?,?,'active')",[prefix,'Synthetic','Child']);studentId=student.insertId;
  await pool.query("INSERT INTO parent_students(parent_id,student_id,relationship,is_primary_guardian) VALUES (?,?,'Parent',TRUE)",[parentId,studentId]);
  const grant=await call(`/api/parents/${parentId}/link-code`,{student_ids:[studentId]},adminLogin.cookie);assert.equal(grant.status,200);
  assert.equal((await call('/api/auth/parent/link-children',{student_codes:[prefix],link_code:grant.body.link_code},registration.cookie)).status,200);
  assert.equal(Number((await call('/api/auth/me',null,registration.cookie)).body.user.registration_pending),0,'linking activates the same session without approval');
  async function signIn(portal='parent',overrides={}){const ch=await call('/api/auth/google/challenge',{portal});claims={sub:prefix,email:address,email_verified:true,nonce:ch.body.nonce,...overrides};return call('/api/auth/google',{credential:'test-only-token',nonce:ch.body.nonce},ch.cookie);}
  const approved=await signIn();assert.equal(approved.status,200);assert.equal(approved.body.pending,false);
  assert.equal((await call(`/api/parents/${parentId}/children`,null,approved.cookie)).body[0].id,studentId);
  assert.equal((await call(`/api/parents/${Number(parentId)+1}/children`,null,approved.cookie)).status,403,'other family denied');
  await pool.query('UPDATE accounts SET active=FALSE WHERE id=?',[pendingId]);
  assert.equal((await signIn()).status,403,'deactivation cannot be bypassed');
  assert.equal((await signIn('staff',{sub:prefix+'staff',email:`${prefix}staff@gmail.com`})).status,403,'staff self-registration denied');
  assert.equal((await signIn('parent',{sub:prefix+'different'})).status,403,'same email cannot replace a linked Google subject');
  assert.equal((await signIn('parent',{email_verified:false})).status,401,'unverified Google email denied');
  const staffLogin=await signIn('staff',{sub:prefix+'admin',email:`${prefix}admin@gmail.com`});
  assert.equal(staffLogin.status,200,'existing authoritative Gmail staff account linked');
  assert.equal((await call('/api/auth/me',null,staffLogin.cookie)).body.user.role,'admin','Google preserves school-assigned role');
  const fresh=await call('/api/auth/parent/register',{full_name:'Synthetic Self-registered Parent',email:`${prefix}self@gmail.com`,password});assert.equal(fresh.status,201);
  selfRegisteredId=(await call('/api/auth/me',null,fresh.cookie)).body.user.id;
  assert.equal((await signIn('parent',{sub:prefix+'self',email:`${prefix}self@gmail.com`})).status,403,'an unverified self-entered email must not silently bind a Google identity');
});
