import { pool } from './db.js';
import { fileURLToPath } from 'node:url';
export async function migrate() {
  for (const sql of [
    `CREATE TABLE IF NOT EXISTS accounts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(150) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, role ENUM('admin','teacher','bursar','parent') NOT NULL, parent_id BIGINT UNSIGNED NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(parent_id) REFERENCES parents(id))`,
    `CREATE TABLE IF NOT EXISTS staff_classes (account_id BIGINT UNSIGNED NOT NULL, class_id BIGINT UNSIGNED NOT NULL, PRIMARY KEY(account_id,class_id), FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE, FOREIGN KEY(class_id) REFERENCES classes(id))`,
    `CREATE TABLE IF NOT EXISTS sessions (token_hash CHAR(64) PRIMARY KEY, account_id BIGINT UNSIGNED NOT NULL, expires_at DATETIME NOT NULL, FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE, INDEX(expires_at))`,
    `CREATE TABLE IF NOT EXISTS admissions (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reference VARCHAR(50) NOT NULL UNIQUE, parent_name VARCHAR(150) NOT NULL, parent_email VARCHAR(255) NOT NULL, parent_phone VARCHAR(40) NOT NULL, child_name VARCHAR(150) NOT NULL, child_date_of_birth DATE NOT NULL, selected_class VARCHAR(100) NOT NULL, notes TEXT, preferred_tour_date DATE NULL, status ENUM('new','contacted','accepted','declined') DEFAULT 'new', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS tours (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reference VARCHAR(50) NOT NULL UNIQUE, full_name VARCHAR(150) NOT NULL, email VARCHAR(255) NOT NULL, phone VARCHAR(40) NOT NULL, preferred_date DATE NOT NULL, interested_class VARCHAR(100) NOT NULL, message TEXT, status ENUM('new','confirmed','completed','cancelled') DEFAULT 'new', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
  ]) await pool.query(sql);
  const [[column]] = await pool.query(
    "SELECT COUNT(*) AS present FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'academic_results' AND column_name = 'term_id'",
  );
  if (!Number(column.present)) {
    try {
      await pool.query('ALTER TABLE academic_results ADD COLUMN term_id VARCHAR(32) NULL');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { await migrate(); console.log('Database additions ready. Existing records preserved.'); } finally { await pool.end(); }
}
