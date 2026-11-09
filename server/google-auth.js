import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { pool } from './db.js';
import { digest, fail, hashPassword, issueSession, sessionCookieOptions } from './auth.js';

const google = new OAuth2Client();
const cookie = 'ml_google_browser';
const cookieValue = req => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${cookie}=`))?.slice(cookie.length + 1);
export function validateGoogleIdentity(payload, nonce) {
  if (!payload || payload.email_verified !== true || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
      typeof payload.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 255 || payload.nonce !== nonce) {
    fail(401, 'Google sign-in could not be verified. Please try again.');
  }
  return { sub: payload.sub, email: payload.email.toLowerCase(), name: String(payload.name || payload.email).slice(0, 150),
    authoritative: payload.email.toLowerCase().endsWith('@gmail.com') || Boolean(payload.hd) };
}

// The verifier is injectable only by server-side tests, never by a request.
export function installGoogleAuth(app, { wrap, limit, verify = async credential => {
  const ticket = await google.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  return ticket.getPayload();
} }) {
  const configured = () => Boolean(process.env.GOOGLE_CLIENT_ID);
  app.get('/api/auth/google/config', (_req, res) => res.json({ enabled: configured(), clientId: process.env.GOOGLE_CLIENT_ID || null }));
  app.post('/api/auth/google/challenge', limit('google-challenge', 30), wrap(async (req, res) => {
    if (!configured()) fail(503, 'Google sign-in is not configured yet. Please use your school login.');
    if (!['parent', 'staff'].includes(req.body.portal)) fail(400, 'Choose the parent or staff portal.');
    let browser = cookieValue(req);
    if (!browser || !/^[a-f0-9]{64}$/.test(browser)) browser = randomBytes(32).toString('hex');
    const nonce = randomBytes(32).toString('hex');
    await pool.query('DELETE FROM google_login_nonces WHERE expires_at<NOW()');
    await pool.query('INSERT INTO google_login_nonces VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 5 MINUTE))', [digest(nonce), digest(browser), req.body.portal]);
    res.cookie(cookie, browser, { ...sessionCookieOptions(), maxAge: 10 * 60 * 1000 });
    res.json({ nonce });
  }));
  app.post('/api/auth/google', limit('google-login', 20), wrap(async (req, res) => {
    if (!configured()) fail(503, 'Google sign-in is not configured yet.');
    const { credential, nonce } = req.body;
    const browser = cookieValue(req);
    if (typeof credential !== 'string' || credential.length > 10000 || typeof nonce !== 'string' || !/^[a-f0-9]{64}$/.test(nonce) || !browser || !/^[a-f0-9]{64}$/.test(browser)) fail(401, 'Start Google sign-in again.');
    let identity;
    try { identity = validateGoogleIdentity(await verify(credential), nonce); }
    catch { fail(401, 'Google sign-in could not be verified. Please try again.'); }
    const db = await pool.getConnection();
    let account;
    try {
      await db.beginTransaction();
      const [[challenge]] = await db.query('SELECT portal FROM google_login_nonces WHERE nonce_hash=? AND browser_hash=? AND expires_at>NOW() FOR UPDATE', [digest(nonce), digest(browser)]);
      if (!challenge) fail(401, 'This Google sign-in has expired or was already used. Start again.');
      await db.query('DELETE FROM google_login_nonces WHERE nonce_hash=?', [digest(nonce)]);
      const [[linked]] = await db.query('SELECT * FROM accounts WHERE google_sub=? FOR UPDATE', [identity.sub]);
      account = linked;
      if (!account) {
        const [[existing]] = await db.query('SELECT * FROM accounts WHERE email=? FOR UPDATE', [identity.email]);
        account = existing;
        if (account) {
          // A self-entered email is not proof that a password account belongs to
          // the Google email owner. Require its existing authenticated session.
          if(account.self_registered&&Number(req.user?.id)!==Number(account.id))fail(403,'Use the password you chose when creating this account.');
          if (account.google_sub || !identity.authoritative) fail(403, 'Use your existing school password and contact the office to link this Google account.');
          if (!account.active || account.registration_pending) fail(403, 'Contact the school office about your account access.');
          await db.query('UPDATE accounts SET google_sub=? WHERE id=?', [identity.sub, account.id]);
        } else {
          if (challenge.portal !== 'parent') fail(403, 'Staff accounts must be created by the school. Contact the office.');
          const [result] = await db.query('INSERT INTO accounts(full_name,email,password_hash,role,parent_id,active,registration_pending,google_sub) VALUES (?,?,?,\'parent\',NULL,FALSE,TRUE,?)',
            [identity.name, identity.email, await hashPassword(randomBytes(48).toString('hex')), identity.sub]);
          account = { id: result.insertId, full_name: identity.name, role: 'parent', parent_id: null, registration_pending: 1, active: 0 };
        }
      }
      if (!account.active && !account.registration_pending) fail(403, 'This account is deactivated. Contact the school office.');
      if (challenge.portal === 'staff' && account.role === 'parent') fail(403, 'Please use the parent portal for this account.');
      if (account.role === 'parent' && !account.registration_pending) {
        const [[guardian]] = await db.query("SELECT id FROM parents WHERE id=? AND status='active'", [account.parent_id]);
        if (!guardian) fail(403, 'Contact the school office to activate your parent record.');
      }
      await db.commit();
    } catch (error) { await db.rollback(); throw error; }
    finally { db.release(); }
    await issueSession(req, res, account);
    res.json({ ok: true, pending: Boolean(account.registration_pending) });
  }));
}
