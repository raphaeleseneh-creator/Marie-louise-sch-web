import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';

test('Vercel entry serves health and keeps anonymous school records protected', {
  skip: process.env.RUN_DB_TESTS !== '1', timeout: 20000,
}, async () => {
  const { default: handler } = await import('../../api/index.js');
  const { pool } = await import('../db.js');
  const server = createServer(handler);
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);
    for (const path of ['/api/auth/me', '/api/students', '/api/accounts']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 401, path);
    }
    const prior = { VERCEL: process.env.VERCEL, MYSQL_HOST: process.env.MYSQL_HOST };
    try {
      process.env.VERCEL = '1';
      process.env.MYSQL_HOST = '127.0.0.1';
      const response = await fetch(base + '/api/health');
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.ok, false);
      assert.ok(!JSON.stringify(body).includes(process.env.MYSQL_PASSWORD));
    } finally {
      for (const [key, value] of Object.entries(prior)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
