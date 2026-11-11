import test from 'node:test';
import assert from 'node:assert/strict';
import {readWithReconnect} from '../resilient-read.js';
import {fetchSignInRead} from '../../src/lib/sign-in-service.js';

test('database startup read retries a timed-out connection once',async()=>{
  let calls=0;const expected=[[{ok:1}]];
  const db={async query(sql,params){assert.equal(sql,'SELECT 1');assert.deepEqual(params,[]);if(++calls===1)throw Object.assign(new Error('connection timeout'),{code:'ETIMEDOUT'});return expected;}};
  assert.equal(await readWithReconnect(db,'SELECT 1'),expected);assert.equal(calls,2);
});
test('database recovery never retries mutations, schema errors or indefinitely failing reads',async()=>{
  let calls=0;const invalid={async query(){calls++;throw Object.assign(new Error('bad field'),{code:'ER_BAD_FIELD_ERROR'});}};
  await assert.rejects(readWithReconnect(invalid,'UPDATE accounts SET active=TRUE'));assert.equal(calls,0);
  await assert.rejects(readWithReconnect(invalid,'SELECT missing'));assert.equal(calls,1);
  calls=0;const down={async query(){calls++;throw Object.assign(new Error('offline'),{code:'ETIMEDOUT'});}};
  await assert.rejects(readWithReconnect(down,'SELECT 1'));assert.equal(calls,2);
});
test('sign-in bootstrap retries temporary HTTP and network failures, but preserves authentication failures',async()=>{
  const original=globalThis.fetch;
  try{
    for(const first of [()=>new Response('{}',{status:503}),()=>{throw new TypeError('network offline');}]){
      let calls=0;globalThis.fetch=async(_path,options)=>{assert.equal(options.cache,'no-store');return ++calls===1?first():new Response('{"ok":true}');};
      assert.equal((await fetchSignInRead('/api/health')).status,200);assert.equal(calls,2);
    }
    let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}',{status:401});};
    assert.equal((await fetchSignInRead('/api/auth/me')).status,401);assert.equal(calls,1);
    await assert.rejects(fetchSignInRead('/api/auth/login',{method:'POST'}));assert.equal(calls,1,'login is never replayed');
    const controller=new AbortController();controller.abort();await assert.rejects(fetchSignInRead('/api/health',{signal:controller.signal}));assert.equal(calls,1);
    calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}',{status:503});};
    assert.equal((await fetchSignInRead('/api/health')).status,503);assert.equal(calls,2,'outages stop after one retry');
  }finally{globalThis.fetch=original;}
});

test('real sign-in session reads and logout retain permissions after recovery changes',{skip:process.env.RUN_DB_TESTS!=='1',timeout:120000},async()=>{
  const {randomUUID}=await import('node:crypto');const {pool}=await import('../db.js');const {app}=await import('../app.js');const {hashPassword}=await import('../auth.js');
  if(!process.env.MYSQL_DATABASE.includes('_test_'))throw new Error('Dedicated test schema required');
  const address='recovery_'+randomUUID()+'@example.invalid',password='Fixture-password-123!';let id,server;
  try{
    const [account]=await pool.query("INSERT INTO accounts(full_name,email,password_hash,role) VALUES (?,?,?,'developer')",['Synthetic Recovery Test',address,await hashPassword(password)]);id=account.insertId;
    server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
    const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:address,password})});assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0];const me=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});assert.equal(me.status,200);assert.equal((await me.json()).user.role,'developer');
    const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:cookie}});assert.equal(logout.status,200);
    assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).status,401);
    assert.equal((await fetch(base+'/api/students')).status,401);
    assert.equal((await fetch(base+'/api/health')).status,200);
  }finally{
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    try{if(id){await pool.query('DELETE FROM sessions WHERE account_id=?',[id]);await pool.query('DELETE FROM accounts WHERE id=?',[id]);}}finally{await pool.end();}
  }
});
