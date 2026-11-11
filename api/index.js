import { app } from '../server/app.js';
import { hostedDatabaseError } from '../server/database-config.js';

// Use the existing API without opening a port or migrating on every invocation.
export default function handler(request, response) {
  if (process.env.VERCEL && hostedDatabaseError(process.env)) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.statusCode = 503;
    return response.end(JSON.stringify({
      error: 'School database setup is incomplete. Please contact the school administrator.',
      ok: false,
    }));
  }
  return app(request, response);
}
