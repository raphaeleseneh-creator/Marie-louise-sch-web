import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseOptions, hostedDatabaseError } from '../database-config.js';
import mysql from 'mysql2/promise';
import { attachDatabasePool } from '@vercel/functions';

const hosted = { MYSQL_HOST: 'database.example.invalid', MYSQL_DATABASE: 'school', MYSQL_USER: 'app', MYSQL_PASSWORD: 'fixture-only', MYSQL_SSL: 'true', VERCEL: '1' };

test('hosted deployment rejects missing credentials and loopback databases', () => {
  for (const host of ['', 'localhost', '127.0.0.1', '127.0.0.2', '::1', '[::1]', '0.0.0.0']) {
    assert.ok(hostedDatabaseError({ ...hosted, MYSQL_HOST: host }));
  }
  for (const key of ['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD']) {
    assert.ok(hostedDatabaseError({ ...hosted, [key]: '' }));
  }
  assert.equal(hostedDatabaseError(hosted), null);
});

test('remote connections verify TLS and support provider CA certificates', () => {
  assert.ok(hostedDatabaseError({ ...hosted, MYSQL_SSL: 'false' }));
  const options = databaseOptions({ ...hosted, MYSQL_SSL_CA: 'line1\\nline2' });
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(options.ssl.ca, 'line1\nline2');
  assert.equal(options.connectionLimit, 5);
  assert.equal(options.dateStrings, true);
});

test('local development retains a normal local MySQL connection', () => {
  const options = databaseOptions({ MYSQL_HOST: '127.0.0.1' });
  assert.equal(options.host, '127.0.0.1');
  assert.equal(options.port, 3306);
  assert.equal(options.connectionLimit, 10);
  assert.equal(options.ssl, undefined);
});

test('Vercel lifecycle helper accepts the underlying MySQL2 pool', async () => {
  const pool = mysql.createPool(databaseOptions(hosted));
  try { assert.doesNotThrow(() => attachDatabasePool(pool.pool)); }
  finally { await pool.end(); }
});
