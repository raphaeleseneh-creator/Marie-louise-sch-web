// Parent sign-in with Email + Unique ID (the pupil's Student ID code from the Airtable
// enrolment record, StudentIDCode -> students.student_code), confirmed by an emailed one-time code.
//
// The Student ID code is sequential (ML-YYYY-NNN) and appears on school documents, so it is
// treated as an identifier, not a secret. Possession of the parent's mailbox is the second factor.
// Access to pupils always comes from recorded guardian-child links (parent_students), never from
// name/email similarity.
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { digest, hashPassword } from './auth.js';

export const CODE_TTL_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;
export const GENERIC_SIGN_IN_ERROR =
  "We couldn't sign you in with those details. Check your email address, Student ID and code, then try again.";

/** Upper-case, trim, collapse whitespace and normalise dash variants. Returns '' when not ID-shaped. */
export function normalizeUniqueId(value) {
  if (typeof value !== 'string') return '';
  const id = value.normalize('NFKC').trim().toUpperCase().replace(/[‐-―−]/g, '-').replace(/\s+/g, '');
  return /^[A-Z0-9][A-Z0-9-/]{2,49}$/.test(id) ? id : '';
}

/**
 * Returns { status: 'match', parentId, studentId, accountId } only when the email and ID point to
 * exactly one active parent, exactly one active pupil, and a recorded link between them, and the
 * email does not belong to a different account. Every other outcome is a denial; callers must not
 * reveal which one occurred.
 */
export async function resolveSignInMatch(db, email, uniqueId) {
  const [students] = await db.query(
    "SELECT id, enrollment_status FROM students WHERE UPPER(TRIM(student_code)) = ?",
    [uniqueId],
  );
  if (students.length === 0) return { status: 'no_match' };
  if (students.length > 1) return { status: 'ambiguous' };
  const [student] = students;
  if (student.enrollment_status !== 'active') return { status: 'ineligible' };

  const [parents] = await db.query('SELECT id, status FROM parents WHERE LOWER(TRIM(email)) = ?', [email]);
  if (parents.length === 0) return { status: 'no_match' };
  if (parents.length > 1) return { status: 'ambiguous' };
  const [parent] = parents;
  if (parent.status !== 'active') return { status: 'ineligible' };

  const [[link]] = await db.query('SELECT 1 AS linked FROM parent_students WHERE parent_id = ? AND student_id = ?', [
    parent.id,
    student.id,
  ]);
  if (!link) return { status: 'no_match' };

  const account = await existingAccountFor(db, parent.id, email);
  if (account.status !== 'ok') return { status: account.status };
  return { status: 'match', parentId: parent.id, studentId: student.id, accountId: account.accountId };
}

/**
 * Finds the portal account to reuse for this parent record without staff action.
 * - An account with this email must be an active parent account for the same parent record.
 * - Otherwise at most one parent account may already point at this parent record (reused, e.g.
 *   after the guardian's email was corrected in Airtable).
 */
async function existingAccountFor(db, parentId, email) {
  const [byEmail] = await db.query('SELECT id, role, parent_id, active FROM accounts WHERE LOWER(TRIM(email)) = ?', [
    email,
  ]);
  if (byEmail.length > 1) return { status: 'ambiguous' };
  if (byEmail.length === 1) {
    const [account] = byEmail;
    if (account.role !== 'parent' || Number(account.parent_id) !== Number(parentId)) return { status: 'ambiguous' };
    if (!account.active) return { status: 'ineligible' };
    return { status: 'ok', accountId: account.id };
  }
  const [byParent] = await db.query("SELECT id, active FROM accounts WHERE role = 'parent' AND parent_id = ?", [parentId]);
  if (byParent.length > 1) return { status: 'ambiguous' };
  if (byParent.length === 1) {
    if (!byParent[0].active) return { status: 'ineligible' };
    return { status: 'ok', accountId: byParent[0].id, emailChanged: true };
  }
  return { status: 'ok', accountId: null };
}

function codeDigest(token, code) {
  return digest(`${token}:${code}`);
}

/**
 * Creates a challenge for every well-formed request so matching and non-matching requests look the
 * same to the caller. Non-matching challenges have no parent and can never be redeemed.
 * Returns { token, code, match }.
 */
export async function createChallenge(db, match) {
  const token = randomBytes(32).toString('hex');
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const isMatch = match?.status === 'match';
  if (isMatch) await db.query('DELETE FROM parent_sign_in_challenges WHERE parent_id = ?', [match.parentId]);
  await db.query('DELETE FROM parent_sign_in_challenges WHERE expires_at < NOW()');
  await db.query(
    `INSERT INTO parent_sign_in_challenges (token_hash, parent_id, student_id, code_hash, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ${CODE_TTL_MINUTES} MINUTE))`,
    [digest(token), isMatch ? match.parentId : null, isMatch ? match.studentId : null, codeDigest(token, code)],
  );
  return { token, code };
}

/**
 * Redeems a challenge inside the caller's transaction. Returns the account id to sign in, or null.
 * Re-checks eligibility at redemption time so a link removed after the code was sent is honoured.
 */
export async function redeemChallenge(db, token, code) {
  if (!/^[a-f0-9]{64}$/.test(token) || !/^\d{6}$/.test(code)) return null;
  const tokenHash = digest(token);
  const [[challenge]] = await db.query(
    'SELECT * FROM parent_sign_in_challenges WHERE token_hash = ? AND expires_at > NOW() FOR UPDATE',
    [tokenHash],
  );
  if (!challenge) return null;
  const expected = Buffer.from(challenge.code_hash, 'hex');
  const actual = Buffer.from(codeDigest(token, code), 'hex');
  const correct = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!correct || !challenge.parent_id) {
    if (challenge.attempts + 1 >= MAX_CODE_ATTEMPTS) {
      await db.query('DELETE FROM parent_sign_in_challenges WHERE token_hash = ?', [tokenHash]);
    } else {
      await db.query('UPDATE parent_sign_in_challenges SET attempts = attempts + 1 WHERE token_hash = ?', [tokenHash]);
    }
    return null;
  }
  await db.query('DELETE FROM parent_sign_in_challenges WHERE token_hash = ?', [tokenHash]);

  const [[parent]] = await db.query("SELECT id, full_name, email FROM parents WHERE id = ? AND status = 'active'", [
    challenge.parent_id,
  ]);
  if (!parent) return null;
  const [[stillLinked]] = await db.query(
    `SELECT 1 AS linked FROM parent_students ps JOIN students s ON s.id = ps.student_id
      WHERE ps.parent_id = ? AND ps.student_id = ? AND s.enrollment_status = 'active'`,
    [parent.id, challenge.student_id],
  );
  if (!stillLinked) return null;

  const email = String(parent.email).trim().toLowerCase();
  const account = await existingAccountFor(db, parent.id, email);
  if (account.status !== 'ok') return null;
  if (account.accountId) {
    if (account.emailChanged) await db.query('UPDATE accounts SET email = ? WHERE id = ?', [email, account.accountId]);
    return account.accountId;
  }
  // First sign-in: provision the parent's portal account automatically. The random password is
  // never shown to anyone, so this account can only be entered through Email + Student ID + code.
  const unusablePassword = await hashPassword(randomBytes(32).toString('hex'));
  const [created] = await db.query(
    "INSERT INTO accounts (full_name, email, password_hash, role, parent_id) VALUES (?, ?, ?, 'parent', ?)",
    [parent.full_name, email, unusablePassword, parent.id],
  );
  return created.insertId;
}

export function signInEmail(code) {
  return {
    subject: 'Your Marie Louise School parent portal code',
    text: [
      'Hello,',
      '',
      `Your parent portal sign-in code is: ${code}`,
      '',
      `It expires in ${CODE_TTL_MINUTES} minutes and can only be used once.`,
      'If you did not try to sign in, you can ignore this email. Nobody can sign in without this code.',
      '',
      'Marie Louise School',
    ].join('\n'),
  };
}
