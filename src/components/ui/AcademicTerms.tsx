import { useState } from "react";
import calendar from "../../../schema/academic-calendar.json";

export function AcademicTermOptions({ session }: { session?: string }) {
  const groups = [...calendar.sessions, { id: "", name: "Session not assigned" }];
  return <>{groups.filter(group => session === undefined || group.id === session).map(group => (
    <optgroup key={group.id} label={group.name}>
      {calendar.terms.filter(term => (term.sessionId ?? "") === group.id).map(term => (
        <option key={term.id} value={term.id}>{term.name} ({term.code})</option>
      ))}
    </optgroup>
  ))}</>;
}

export function AcademicTermFields({ initialTerm, className }: { initialTerm?: string; className: string }) {
  const initialSession = calendar.terms.find(term => term.id === initialTerm)?.sessionId ?? "";
  const [session, setSession] = useState(initialTerm ? initialSession : calendar.sessions[0]?.id ?? "");
  return <>
    <label className="block text-xs font-bold">Academic session
      <select className={className} value={session} onChange={event => setSession(event.target.value)}>
        {calendar.sessions.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        <option value="">Session not assigned</option>
      </select>
    </label>
    <label className="block text-xs font-bold">Term
      <select key={session} name="term_id" className={className} defaultValue={session === initialSession ? initialTerm ?? "" : ""} required>
        <option value="">Choose a term</option>
        <AcademicTermOptions session={session} />
      </select>
    </label>
  </>;
}

export function matchesAcademicTerm(value: unknown, filter: string) {
  return !filter || (filter === "legacy" ? value == null : value === filter);
}

export function AcademicTermFilter({ value, onChange, className }: { value: string; onChange: (value: string) => void; className: string }) {
  return <label className="block text-xs font-bold">Filter results by term
    <select className={className} value={value} onChange={event => onChange(event.target.value)}>
      <option value="">All terms</option>
      <AcademicTermOptions />
      <option value="legacy">Older results without a linked term</option>
    </select>
  </label>;
}
