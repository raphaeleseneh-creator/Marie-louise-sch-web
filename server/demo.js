// Parent portal demo: `npm run demo`, then `npm run dev` in a second terminal.
// Resets a SEPARATE database (default marie_louise_school_demo) to the fictional families in
// demo-data.js and starts the real API against it. Sign-in codes appear on screen instead of
// being emailed. The school's real database is never opened by this script.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoDatabase = process.env.DEMO_MYSQL_DATABASE || 'marie_louise_school_demo';

if (process.env.NODE_ENV === 'production') {
  console.error('The portal demo cannot run with NODE_ENV=production.');
  process.exit(1);
}
if (!/^[A-Za-z0-9_]+_demo$/.test(demoDatabase)) {
  console.error('DEMO_MYSQL_DATABASE must be a plain name ending in "_demo".');
  process.exit(1);
}
// Everything below, including the API, now uses only the demo database.
process.env.MYSQL_DATABASE = demoDatabase;
process.env.PORTAL_DEMO = '1';
process.env.MAIL_TRANSPORT = 'dev-outbox';

async function ensureDatabase() {
  const conn = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD });
  try {
    try {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${demoDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await conn.query(`USE \`${demoDatabase}\``);
      return true;
    } catch (error) {
      if (!['ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(error.code)) throw error;
      const [[{ who }]] = await conn.query('SELECT CURRENT_USER() AS who');
      const [user, host] = String(who).split('@');
      console.error(`\nThe app's MySQL user cannot create the demo database yet. Run these two lines once`);
      console.error(`as the MySQL root user (MySQL Workbench or the mysql command line), then run npm run demo again:\n`);
      console.error(`  CREATE DATABASE IF NOT EXISTS ${demoDatabase} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      console.error(`  GRANT ALL PRIVILEGES ON ${demoDatabase}.* TO '${user}'@'${host}';\n`);
      return false;
    }
  } finally { await conn.end(); }
}

if (!(await ensureDatabase())) process.exit(1);

const { pool } = await import('./db.js');
const { migrate } = await import('./migrate.js');
const { seedDemo } = await import('./demo-data.js');
const { SIGN_IN_EXAMPLES } = await import('../shared/portal-demo.js');

try {
  const db = await pool.getConnection();
  try {
    const [[{ name }]] = await db.query('SELECT DATABASE() AS name');
    if (!/_demo$/.test(String(name))) throw new Error('Refusing to reset a database whose name does not end in "_demo".');
    // Fresh start each run: drop the demo tables and rebuild them from the project schema.
    const [tables] = await db.query("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'");
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const { t } of tables) await db.query(`DROP TABLE IF EXISTS \`${t}\``);
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    const bootstrap = fs.readFileSync(path.resolve(__dirname, '../schema/mysql-bootstrap.sql'), 'utf8');
    for (const statement of bootstrap.split(/;\s*(?:\r?\n|$)/).map((s) => s.trim()).filter((s) => /CREATE/i.test(s))) await db.query(statement);
  } finally { db.release(); }
  await migrate();
  const db2 = await pool.getConnection();
  try {
    await db2.beginTransaction();
    const counts = await seedDemo(db2);
    await db2.commit();
    console.log(`Demo database ${demoDatabase} reset: ${counts.pupils} fictional pupils, ${counts.parents} parents, ${counts.classes} classes.`);
  } catch (error) { await db2.rollback(); throw error; } finally { db2.release(); }
} catch (error) {
  console.error('Demo setup failed:', error.message);
  await pool.end();
  process.exit(1);
}

const { app } = await import('./app.js');
const port = Number(process.env.API_PORT || 4000);
const server = app.listen(port, process.env.API_HOST || '127.0.0.1', () => {
  console.log(`\nPortal demo API ready on port ${port}. In a second terminal run: npm run dev`);
  console.log('Then open http://localhost:3000/parent-portal. Sign-in codes appear on screen (nothing is emailed).\n');
  console.log('Sample sign-ins:');
  for (const example of SIGN_IN_EXAMPLES) console.log(`  ${example.label}: ${example.email} + ${example.unique_id}`);
  console.log('\nRun npm run demo again at any time to reset the demo. Press Ctrl+C to stop.');
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Stop the normal school API (npm run server) first.` : 'Demo API failed to start.');
  void pool.end();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { void pool.end().then(() => process.exit(0)); }));
