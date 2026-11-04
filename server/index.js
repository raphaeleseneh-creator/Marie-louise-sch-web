import 'dotenv/config';
import {app} from './app.js';
import {pool} from './db.js';
import {migrate} from './migrate.js';
const port=Number(process.env.API_PORT||4000);
try {
  await migrate();
  const server=app.listen(port,process.env.API_HOST||'127.0.0.1',()=>console.log(`School API ready on port ${port}`));
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. Stop the previous school API before restarting.`:'API startup failed.');process.exitCode=1;void pool.end();});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{void pool.end().then(()=>process.exit(0));}));
} catch(error) {console.error('Database setup failed:',error.code||error.name);await pool.end();process.exitCode=1;}
