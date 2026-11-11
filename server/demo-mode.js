/**
 * Parent portal demo mode (`npm run demo`). It shows sign-in codes on screen instead of
 * emailing them, so it is only ever on when ALL of these hold:
 * - not a production build,
 * - PORTAL_DEMO=1,
 * - the connected database name ends in "_demo" (the real school database never does).
 */
export function portalDemoMode(env = process.env) {
  return env.NODE_ENV !== 'production'
    && env.PORTAL_DEMO === '1'
    && /_demo$/.test(String(env.MYSQL_DATABASE || ''));
}
