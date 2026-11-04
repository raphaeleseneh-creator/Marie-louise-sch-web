import { readFile } from 'node:fs/promises';
import { pool } from './db.js';

const identifier = /^[a-z][a-z0-9_]{0,63}$/;
const types = new Set(['TEXT', 'BOOLEAN', 'BIGINT', 'DECIMAL(30,10)', 'DATE', 'DATETIME(3)', 'JSON']);
const mysqlTypes = { BOOLEAN: 'tinyint(1)', 'DECIMAL(30,10)': 'decimal(30,10)', 'DATETIME(3)': 'datetime(3)' };
const schemaUrl = new URL('../schema/mls-airtable-schema.json', import.meta.url);

function quote(name) {
  if (!identifier.test(name)) throw new Error('Invalid MySQL identifier in schema.');
  return '\x60' + name + '\x60';
}

function columnsFor(table) {
  if (!table.mysqlTable.startsWith('mls_airtable_')) throw new Error('Expected a dedicated Airtable mirror table.');
  quote(table.mysqlTable);
  const columns = [
    ['airtable_record_id', 'varchar(32)', 'NOT NULL PRIMARY KEY'],
    ['airtable_created_time', 'datetime(3)', 'NULL'],
  ];
  for (const field of table.fields) {
    quote(field.mysqlColumn);
    if (!types.has(field.mysqlType)) throw new Error('Unknown MySQL type in schema.');
    columns.push([field.mysqlColumn, field.mysqlType, 'NULL']);
  }
  if (new Set(columns.map(([name]) => name)).size !== columns.length) {
    throw new Error(`Duplicate MySQL column in ${table.mysqlTable}.`);
  }
  return columns;
}

async function existingColumns(db, name) {
  const [rows] = await db.execute(
    'SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [name],
  );
  return new Map(rows.map(row => [row.name, row.type]));
}

function verifyColumns(name, expected, actual) {
  if (actual.size !== expected.length || expected.some(([column, type]) => actual.get(column) !== (mysqlTypes[type] ?? type.toLowerCase()))) {
    throw new Error(`Schema mismatch in ${name}. Existing data was left untouched.`);
  }
}

async function main() {
  const schema = JSON.parse(await readFile(schemaUrl, 'utf8'));
  const tables = schema.tables.map(table => ({ name: table.mysqlTable, columns: columnsFor(table) }));
  if (tables.length !== schema.tableCount || new Set(tables.map(table => table.name)).size !== tables.length) {
    throw new Error('Invalid table catalog.');
  }
  const db = await pool.getConnection();
  try {
    for (const { name, columns } of tables) {
      const actual = await existingColumns(db, name);
      if (actual.size) verifyColumns(name, columns, actual);
    }
    for (const { name, columns } of tables) {
      const definitions = columns.map(([column, type, modifier]) => `${quote(column)} ${type} ${modifier}`);
      await db.query(`CREATE TABLE IF NOT EXISTS ${quote(name)} (${definitions.join(', ')}) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4`);
      verifyColumns(name, columns, await existingColumns(db, name));
    }
    console.log(`Verified ${tables.length} MySQL mirror tables with ${schema.fieldCount} Airtable fields.`);
  } finally {
    db.release();
  }
}

try {
  await main();
} catch (error) {
  console.error(error.code || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
