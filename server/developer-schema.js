import { pool } from './db.js';

// Append the new role so the existing ENUM values keep their numeric positions.
// This changes schema only; assigning an account is an explicit maintenance step.
export async function ensureDeveloperRole(db=pool) {
  const [[column]]=await db.query("SELECT COLUMN_TYPE AS role_definition FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='accounts' AND column_name='role'");
  if(!column)throw new Error('Accounts must be created before adding the developer role.');
  if(!column.role_definition.includes("'developer'"))await db.query("ALTER TABLE accounts MODIFY COLUMN role ENUM('admin','teacher','bursar','parent','developer') NOT NULL");
}
