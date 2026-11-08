import { pool } from './db.js';

export async function ensureGoogleSchema(db = pool) {
  for (const [name, definition] of [
    ['google_sub', 'VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL'],
    ['registration_pending', 'BOOLEAN NOT NULL DEFAULT FALSE'],
  ]) {
    const [[column]] = await db.query("SELECT COUNT(*) present FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='accounts' AND column_name=?", [name]);
    if (!Number(column.present)) await db.query(`ALTER TABLE accounts ADD COLUMN ${name} ${definition}`);
  }
  // TiDB requires adding the column and its unique index as separate statements.
  const [[index]] = await db.query("SELECT COUNT(*) present FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='accounts' AND column_name='google_sub' AND non_unique=0");
  if (!Number(index.present)) await db.query('CREATE UNIQUE INDEX accounts_google_sub_unique ON accounts(google_sub)');
  await db.query(`CREATE TABLE IF NOT EXISTS google_login_nonces (
    nonce_hash CHAR(64) PRIMARY KEY, browser_hash CHAR(64) NOT NULL,
    portal ENUM('parent','staff') NOT NULL, expires_at DATETIME NOT NULL,
    INDEX(expires_at))`);
}
