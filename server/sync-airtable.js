// Pulls the tables the portal uses straight from the Airtable API and applies them with the same
// validated importer used for local exports (server/import-airtable.js). New enrolments, corrected
// records and removed guardian-child links reach the portal when this run finishes.
//
//   npm run sync:airtable            apply changes
//   npm run sync:airtable -- --dry-run   report only
//
// Schedule it (Windows Task Scheduler / cron) to control how quickly Airtable changes appear.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { fetchAllAirtableRecords } from './airtable.js';
import { runAirtableImport, formatImportReport } from './import-airtable.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, '../schema/mls-airtable-schema.json');

export const SYNC_TABLES = [
  'Classes',
  'Students',
  'Parents',
  'ParentStudentLinks',
  'Academic Session',
  'Terms',
  'Academic Results',
  'Attendance',
  'Fees',
  'Payments',
];

const LOCK_NAME = 'mls_airtable_sync';

export async function runAirtableSync({ apply = true, fetchTable = fetchAllAirtableRecords } = {}) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8').replace(/^﻿/, ''));
  const tableIds = new Map((schema.tables || []).map((t) => [t.name, t.airtableTableId]));
  // The fetched records contain personal data: keep them in a private temp folder, deleted afterwards.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mls-airtable-sync-'));
  const db = await pool.getConnection();
  let locked = false;
  try {
    const [[lock]] = await db.query('SELECT GET_LOCK(?, 0) AS acquired', [LOCK_NAME]);
    if (Number(lock.acquired) !== 1) {
      throw Object.assign(new Error('An Airtable sync is already running.'), { status: 409 });
    }
    locked = true;
    for (const name of SYNC_TABLES) {
      const records = await fetchTable(tableIds.get(name) || name);
      fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(records), 'utf8');
    }
    if (!apply) return await runAirtableImport({ sourceDir: dir, apply: false, executor: db });
    await db.beginTransaction();
    try {
      const report = await runAirtableImport({ sourceDir: dir, apply: true, executor: db });
      await db.commit();
      return report;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } finally {
    if (locked) await db.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => {});
    db.release();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const report = await runAirtableSync({ apply: !dryRun });
    console.log(`${new Date().toISOString()} Airtable sync finished.`);
    console.log(formatImportReport(report));
  } catch (error) {
    console.error('Airtable sync failed:', error.status || error.statusCode || error.code || error.name);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
