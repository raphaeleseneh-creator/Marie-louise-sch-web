import React, { useState } from "react";
import { Row } from "./api";
import { StatusBadge } from "../ui/StatusBadge";

export const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[#DDD5E6] bg-white px-3 py-2 text-sm font-normal text-[#27232D] outline-none transition focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 disabled:opacity-60";
export const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#581C87] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#29166F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#581C87] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#DDD5E6] bg-white px-4 py-2 text-sm font-bold text-[#29166F] transition hover:bg-[#F1ECF6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#581C87] disabled:cursor-not-allowed disabled:opacity-50";

export function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-xs font-bold text-[#4C4058]">{label}<input {...props} className={inputClass} /></label>;
}
export function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className="block text-xs font-bold text-[#4C4058]">{label}<select {...props} className={inputClass}>{children}</select></label>;
}
export function TextArea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label className="block text-xs font-bold text-[#4C4058]">{label}<textarea {...props} className={inputClass} /></label>;
}
export function Options({ values }: { values: string[] }) {
  return <>{values.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</>;
}
export function StudentSelect({ students, defaultValue }: { students: Row[]; defaultValue?: string | number }) {
  return <Select label="Student" name="student_id" required defaultValue={defaultValue ?? ""}><option value="">Select student</option>{students.map(student => <option key={student.id} value={student.id}>{student.first_name} {student.last_name} · {student.class_name || student.student_code}</option>)}</Select>;
}
export function Status({ value }: { value: unknown }) {
  return <StatusBadge value={value} />;
}

export type Save = (path: string, data: Record<string, unknown>, method?: "POST" | "PATCH") => Promise<boolean>;
export function EntryForm({ title, children, onSave, submitLabel = "Save", onCancel, resetOnSuccess = true, disabled = false }: {
  title: string; children: React.ReactNode; onSave: (data: Record<string, FormDataEntryValue>, form: HTMLFormElement) => Promise<boolean>;
  submitLabel?: string; onCancel?: () => void; resetOnSuccess?: boolean; disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const busy = React.useRef(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current || disabled) return;
    // React clears currentTarget after the handler returns; retain the form before awaiting.
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    busy.current = true;
    setPending(true);
    try { if (await onSave(data, form) && resetOnSuccess) form.reset(); }
    finally { busy.current = false; setPending(false); }
  };
  return <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 shadow-[0_1px_2px_rgba(41,22,111,0.04)] sm:p-6"><h2 className="mb-5 text-lg font-extrabold text-[#29166F]">{title}</h2><form onSubmit={submit} onInput={event => event.currentTarget.querySelectorAll("input").forEach(input => input.setCustomValidity(""))} aria-busy={pending}><fieldset disabled={pending || disabled} className="space-y-4">{children}<div className="flex flex-wrap gap-2 pt-2"><button className={buttonClass} type="submit">{pending ? "Saving…" : submitLabel}</button>{onCancel ? <button type="button" className={secondaryClass} onClick={onCancel}>Cancel</button> : null}</div></fieldset></form></section>;
}

export type Column = { label: string; render: (row: Row) => React.ReactNode };
export function DataTable({ rows, columns, searchLabel = "Search records" }: { rows: Row[]; columns: Column[]; searchLabel?: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const filtered = rows.filter(row => Object.values(row).some(value => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase())));
  const pageSize = 25;
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const first = currentPage * pageSize;
  const countText = !filtered.length ? "No records" : filtered.length <= pageSize ? `${filtered.length} ${filtered.length === 1 ? "record" : "records"}` : `Showing ${first + 1}–${Math.min(first + pageSize, filtered.length)} of ${filtered.length}`;
  return <section className="min-w-0 overflow-hidden rounded-xl border border-[#E5DFE9] bg-white shadow-[0_1px_2px_rgba(41,22,111,0.04)]"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5DFE9] p-4"><label className="w-full text-xs font-bold text-[#4C4058] sm:w-72">{searchLabel}<input type="search" className={inputClass} value={search} placeholder="Type to filter…" onChange={event => { setSearch(event.target.value); setPage(0); }} /></label><p aria-live="polite" className="text-xs font-bold text-[#625B69]">{countText}</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums"><thead className="bg-[#F8F6FA] text-xs uppercase tracking-wide text-[#625B69]"><tr>{columns.map(column => <th key={column.label} scope="col" className="whitespace-nowrap px-4 py-3 font-bold">{column.label}</th>)}</tr></thead><tbody>{filtered.slice(first, first + pageSize).map(row => <tr key={row.id} className="border-t border-[#EEE9F1] align-top transition-colors hover:bg-[#FCFAFE]">{columns.map(column => <td key={column.label} className="px-4 py-4">{column.render(row)}</td>)}</tr>)}{!filtered.length ? <tr><td colSpan={columns.length} className="px-4 py-14 text-center"><p className="font-bold text-[#29166F]">{search ? "No matching records" : "Nothing here yet"}</p><p className="mt-1 text-sm text-[#625B69]">{search ? "Try a different name, code or word." : "Records you add will appear here."}</p>{search ? <button type="button" className={`${secondaryClass} mt-4`} onClick={() => { setSearch(""); setPage(0); }}>Clear search</button> : null}</td></tr> : null}</tbody></table></div>{filtered.length > pageSize ? <nav aria-label="Table pages" className="flex items-center justify-between gap-2 border-t border-[#E5DFE9] p-4"><button type="button" className={secondaryClass} disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous</button><span className="text-xs font-bold text-[#625B69]">Page {currentPage + 1} of {lastPage + 1}</span><button type="button" className={secondaryClass} disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button></nav> : null}</section>;
}
export function Split({ children }: { children: React.ReactNode }) {
  return <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">{children}</div>;
}
