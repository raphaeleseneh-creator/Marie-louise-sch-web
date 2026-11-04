import calendar from '../schema/academic-calendar.json' with { type: 'json' };
import { fail } from './auth.js';

const terms = new Map(calendar.terms.map(term => [term.id, term]));

export function termLabel(term) {
  const session = calendar.sessions.find(entry => entry.id === term.sessionId);
  return session ? `${term.name} · ${session.name}` : `${term.name} · Session not assigned`;
}

export function resolveTerm(body) {
  const term = terms.get(body.term_id || body.term_name);
  if (!term) fail(400, 'Choose an academic term from the school calendar. CSV imports require its term_id.');
  return term;
}
