import {setTimeout as delay} from 'node:timers/promises';

const transient=new Set(['ETIMEDOUT','ECONNRESET','ECONNREFUSED','PROTOCOL_CONNECTION_LOST','EPIPE']);

// Only read-only startup queries may be replayed. Never retry a mutation or a
// transaction whose commit outcome could be unknown after a lost connection.
export async function readWithReconnect(db,sql,params=[]){
  if(!/^\s*SELECT\b/i.test(sql))throw new Error('Connection recovery is limited to SELECT reads.');
  try{return await db.query(sql,params);}
  catch(error){if(!transient.has(error.code))throw error;await delay(200);return db.query(sql,params);}
}
