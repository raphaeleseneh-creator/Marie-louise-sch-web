import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {pool} from './db.js';
import {migrate} from './migrate.js';
import {hashPassword} from './auth.js';
import {email,text} from './validation.js';
const prompt=createInterface({input:stdin,output:stdout});
try{
  await migrate();
  const [[existing]]=await pool.query("SELECT COUNT(*) count FROM accounts WHERE role='admin'");
  if(existing.count)throw new Error('An administrator already exists. Sign in to manage accounts.');
  const name=text(await prompt.question('Your name: '),'Name',150),address=email(await prompt.question('Your email: '));
  const password=randomBytes(18).toString('base64url');
  const dir=new URL('../.local/',import.meta.url);await mkdir(dir,{recursive:true});
  const file=new URL('initial-admin.txt',dir);
  await writeFile(file,`School administrator login\nEmail: ${address}\nPassword: ${password}\n\nSign in at http://localhost:3000/admin and change this password in Account settings. Delete this file after saving the details securely.\n`,{flag:'wx',mode:0o600});
  try{await pool.query("INSERT INTO accounts(full_name,email,password_hash,role) VALUES (?,?,?,'admin')",[name,address,await hashPassword(password)]);}catch(error){console.error('Account was not created. The credential file can be removed before retrying.');throw error;}
  console.log('Administrator created. Open .local/initial-admin.txt in this project to see your login details.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{prompt.close();await pool.end();}
