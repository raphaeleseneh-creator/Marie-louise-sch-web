import test from 'node:test';
import assert from 'node:assert/strict';
import { portalDemoMode } from '../demo-mode.js';

// Demo mode shows sign-in codes on screen, so it must never switch on outside the demo database.
test('portal demo mode needs PORTAL_DEMO=1, a *_demo database and a non-production build', () => {
  const demo = { PORTAL_DEMO: '1', MYSQL_DATABASE: 'marie_louise_school_demo' };
  assert.equal(portalDemoMode(demo), true);
  assert.equal(portalDemoMode({ ...demo, NODE_ENV: 'production' }), false);
  assert.equal(portalDemoMode({ ...demo, MYSQL_DATABASE: 'marie_louise_school' }), false);
  assert.equal(portalDemoMode({ ...demo, MYSQL_DATABASE: 'marie_louise_school_demo_backup' }), false);
  assert.equal(portalDemoMode({ ...demo, PORTAL_DEMO: 'true' }), false);
  assert.equal(portalDemoMode({ MYSQL_DATABASE: 'marie_louise_school_demo' }), false);
  assert.equal(portalDemoMode({}), false);
});
