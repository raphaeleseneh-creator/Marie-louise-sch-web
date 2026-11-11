import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { portalDemoMode } from './demo-mode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_OUTBOX = path.resolve(__dirname, '../.local/outbox');

let override = null;
let smtpTransport = null;

/** Tests (and only tests) replace delivery with an in-memory capture. Pass null to restore. */
export function setMailTransportForTesting(transport) {
  override = transport;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

/**
 * Which delivery path is active:
 * - "smtp": SMTP_HOST + MAIL_FROM are set (required for production rollout).
 * - "dev-outbox": MAIL_TRANSPORT=dev-outbox outside production writes messages to .local/outbox (Git-ignored).
 * - null: email sign-in is unavailable.
 */
export function mailMode() {
  if (override) return 'test';
  if (portalDemoMode()) return 'dev-outbox'; // demo families must never reach a real mail server
  if (smtpConfigured()) return 'smtp';
  if (process.env.NODE_ENV !== 'production' && process.env.MAIL_TRANSPORT === 'dev-outbox') return 'dev-outbox';
  return null;
}

export async function sendMail({ to, subject, text }) {
  const mode = mailMode();
  if (mode === 'test') return override({ to, subject, text });
  if (mode === 'smtp') {
    smtpTransport ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
    await smtpTransport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
    return;
  }
  if (mode === 'dev-outbox') {
    fs.mkdirSync(DEV_OUTBOX, { recursive: true });
    const file = path.join(DEV_OUTBOX, `${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
    fs.writeFileSync(file, `To: ${to}\nSubject: ${subject}\n\n${text}\n`, 'utf8');
    return;
  }
  throw Object.assign(new Error('Email delivery is not configured'), { code: 'MAIL_NOT_CONFIGURED' });
}
