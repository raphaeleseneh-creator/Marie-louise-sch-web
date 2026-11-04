import React, { useState } from "react";
import { AcademicTermFields, AcademicTermFilter, matchesAcademicTerm } from "../ui/AcademicTerms";
import calendar from "../../../schema/academic-calendar.json";
import { Row, dateText, localDate, localDateTime, studentName } from "./api";
import { DataTable, EntryForm, Field, Options, Save, Select, Split, Status, StudentSelect, TextArea, inputClass, secondaryClass } from "./WorkspaceUI";

type Props = { rows: Row[]; students: Row[]; save: Save };

export function ResultsSection({ rows, students, save, canPublish }: Props & { canPublish: boolean }) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [termFilter, setTermFilter] = useState("");
  const [csv, setCsv] = useState("");
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const [publishing, setPublishing] = useState<number | null>(null);
  const publishingRef = React.useRef(false);
  const publish = async (row: Row) => {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(row.id);
    try { await save(`/api/results/${row.id}`, { publication_status: row.publication_status === "published" ? "draft" : "published" }, "PATCH"); }
    finally { setPublishing(null); publishingRef.current = false; }
  };
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><AcademicTermFilter value={termFilter} onChange={setTermFilter} className={inputClass} /><a className={secondaryClass} download="marie-louise-results-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent("student_id,term_id,subject,ca1_score,ca2_score,exam_score,teacher_remarks,publication_status\r\n")}`}>Download CSV template</a></div><Split><DataTable rows={rows.filter(row => matchesAcademicTerm(row.term_id, termFilter))} searchLabel="Search student, term or subject" columns={[
    { label: "Student", render: studentName },
    { label: "Term / subject", render: row => <><p className="font-bold text-[#29166F]">{row.subject}</p><p className="mt-1 text-xs text-[#625B69]">{row.term_name}</p></> },
    { label: "CA 1 / CA 2 / exam", render: row => `${row.ca1_score ?? "—"} / ${row.ca2_score ?? "—"} / ${row.exam_score ?? "—"}` },
    { label: "Total", render: row => row.total_score ?? "—" },
    { label: "Remarks", render: row => <p className="min-w-40 max-w-72 whitespace-pre-wrap">{row.teacher_remarks || "—"}</p> },
    { label: "Status", render: row => <Status value={row.publication_status} /> },
    { label: "Actions", render: row => <div className="flex gap-2"><button className={secondaryClass} disabled={!canPublish && ["published", "archived"].includes(String(row.publication_status))} title={!canPublish && ["published", "archived"].includes(String(row.publication_status)) ? "An administrator must reopen this result." : undefined} onClick={() => setEditing(row)}>Edit</button>{canPublish ? <button className={secondaryClass} disabled={publishing !== null} onClick={() => void publish(row)}>{publishing === row.id ? "Saving…" : row.publication_status === "published" ? "Unpublish" : "Publish"}</button> : null}</div> },
  ]} /><EntryForm key={editing?.id ?? "new"} title={editing ? `Edit result #${editing.id}` : "Add result"} resetOnSuccess={!editing} onCancel={editing ? () => setEditing(null) : undefined} onSave={async (data, form) => {
    const scores = { ca1_score: Number(data.ca1_score), ca2_score: Number(data.ca2_score), exam_score: Number(data.exam_score) };
    const exam = form.elements.namedItem("exam_score") as HTMLInputElement;
    exam.setCustomValidity(scores.ca1_score + scores.ca2_score + scores.exam_score > 100 ? "Combined scores must not exceed 100." : "");
    if (!form.reportValidity()) return false;
    const payload = { ...data, ...scores, total_score: scores.ca1_score + scores.ca2_score + scores.exam_score, ...(!editing ? { student_id: Number(data.student_id) } : {}) };
    const ok = await save(editing ? `/api/results/${editing.id}` : "/api/results", payload, editing ? "PATCH" : "POST");
    if (ok) setEditing(null);
    return ok;
  }}>{editing ? <p className="text-sm font-bold">{studentName(editing)}</p> : <StudentSelect students={students} />}<AcademicTermFields initialTerm={typeof editing?.term_id === "string" ? editing.term_id : undefined} className={inputClass} /><Field label="Subject" name="subject" required defaultValue={String(editing?.subject ?? "")} /><div className="grid grid-cols-3 gap-3"><Field label="CA 1" name="ca1_score" type="number" min="0" max="100" step="0.01" required defaultValue={String(editing?.ca1_score ?? 0)} /><Field label="CA 2" name="ca2_score" type="number" min="0" max="100" step="0.01" required defaultValue={String(editing?.ca2_score ?? 0)} /><Field label="Exam" name="exam_score" type="number" min="0" max="100" step="0.01" required defaultValue={String(editing?.exam_score ?? 0)} /></div><p className="text-xs text-[#625B69]">The three scores must total no more than 100.</p><TextArea label="Teacher remarks" name="teacher_remarks" rows={3} defaultValue={String(editing?.teacher_remarks ?? "")} /><Select label="Publication" name="publication_status" defaultValue={canPublish || editing?.publication_status !== "published" ? String(editing?.publication_status ?? "draft") : "pending"}><Options values={canPublish ? ["draft", "pending", "published"] : ["draft", "pending"]} /></Select>{!canPublish ? <p className="text-xs text-[#625B69]">Save as pending for administrator review and publication.</p> : null}</EntryForm></Split>
  <EntryForm title="Import results from CSV" submitLabel="Import all results" onSave={async () => { if (reading) return false; const ok = await save("/api/results/import", { csv }); if (ok) setCsv(""); return ok; }}><p className="text-sm leading-6 text-[#625B69]">Upload or paste a CSV with these required headers. The server validates the complete file before saving any results. Combined scores must not exceed 100.</p><code className="block overflow-x-auto rounded-lg bg-[#F8F6FA] p-3 text-xs">student_id,term_id,subject,ca1_score,ca2_score,exam_score</code><details className="text-xs text-[#625B69]"><summary className="cursor-pointer font-bold">Term IDs for CSV imports</summary><ul className="mt-2 space-y-1">{calendar.terms.map(term => <li key={term.id}>{term.name} ({term.code}): <code>{term.id}</code></li>)}</ul></details><p className="text-xs text-[#625B69]">Optional headers: teacher_remarks, publication_status. {canPublish ? "Publication may be draft, pending or published." : "Teachers may import draft or pending results only."}</p><label className="block text-xs font-bold">CSV file<input type="file" accept=".csv,text/csv" disabled={reading} className="mt-2 block w-full text-sm" onChange={async event => { const file = event.currentTarget.files?.[0]; if (!file) return; setReading(true); setFileError(""); try { setCsv(await file.text()); } catch { setFileError("Unable to read this file. Choose it again or paste the CSV below."); } finally { setReading(false); } }} /></label>{reading ? <p role="status" className="text-sm">Reading file…</p> : null}{fileError ? <p role="alert" className="text-sm text-red-700">{fileError}</p> : null}<TextArea label="CSV content" name="csv" rows={7} required value={csv} onChange={event => setCsv(event.target.value)} /><p className="text-xs text-[#625B69]">Use the numeric student ID shown in the student directory. Existing records are handled by the server’s import rules.</p></EntryForm></div>;
}

export function AttendanceSection({ rows, students, save }: Props) {
  return <Split><DataTable rows={rows} columns={[
    { label: "Student", render: studentName }, { label: "Date", render: row => dateText(row.attendance_date) },
    { label: "Status", render: row => <Status value={row.status} /> }, { label: "Reason", render: row => row.reason || "—" },
  ]} /><EntryForm title="Record attendance" onSave={data => save("/api/attendance", { ...data, student_id: Number(data.student_id) })}><StudentSelect students={students} /><Field label="Date" name="attendance_date" type="date" defaultValue={localDate()} required /><Select label="Status" name="status"><Options values={["present", "absent", "late", "excused"]} /></Select><TextArea label="Reason / note" name="reason" rows={3} /><p className="text-xs leading-5 text-[#625B69]">Saving the same student and date updates that day’s attendance.</p></EntryForm></Split>;
}

export function AnnouncementsSection({ rows, students, classes, save, canWriteSchool }: Props & { classes: Row[]; canWriteSchool: boolean }) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [audience, setAudience] = useState(canWriteSchool ? "school" : "class");
  const edit = (row: Row | null) => { setEditing(row); setAudience(String(row?.audience || (canWriteSchool ? "school" : "class"))); };
  return <Split><DataTable rows={rows} columns={[
    { label: "Announcement", render: row => <div className="min-w-52 max-w-md"><p className="font-bold text-[#29166F]">{row.title}</p><p className="mt-2 whitespace-pre-wrap text-[#625B69]">{row.message}</p></div> },
    { label: "Audience", render: row => <>{row.audience}{row.class_id ? ` · Class #${row.class_id}` : ""}{row.student_id ? ` · Student #${row.student_id}` : ""}</> },
    { label: "Publication", render: row => <Status value={row.is_published === true || Number(row.is_published) === 1 ? "published" : "draft"} /> },
    { label: "Expires", render: row => dateText(row.expires_at) },
    { label: "Actions", render: row => <button className={secondaryClass} disabled={!canWriteSchool && row.audience === "school"} title={!canWriteSchool && row.audience === "school" ? "Only administrators can edit school-wide notices." : undefined} onClick={() => edit(row)}>Edit / publish</button> },
  ]} /><EntryForm key={editing?.id ?? "new"} title={editing ? "Edit announcement" : "New announcement"} onCancel={editing ? () => edit(null) : undefined} resetOnSuccess={!editing} onSave={async data => {
    const ok = await save(editing ? `/api/announcements/${editing.id}` : "/api/announcements", { ...data, audience, class_id: audience === "class" ? Number(data.class_id) : null, student_id: audience === "student" ? Number(data.student_id) : null, is_published: data.is_published === "published", expires_at: data.expires_at ? new Date(String(data.expires_at)).toISOString() : null }, editing ? "PATCH" : "POST");
    if (ok) edit(null); return ok;
  }}><Field label="Title" name="title" required defaultValue={String(editing?.title ?? "")} /><TextArea label="Message" name="message" rows={5} required defaultValue={String(editing?.message ?? "")} /><Select label="Audience" name="audience" value={audience} onChange={event => setAudience(event.target.value)}><Options values={canWriteSchool ? ["school", "class", "student"] : ["class", "student"]} /></Select>{audience === "class" ? <Select label="Class" name="class_id" required defaultValue={String(editing?.class_id || "")}><option value="">Select class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select> : null}{audience === "student" ? <StudentSelect students={students} defaultValue={String(editing?.student_id || "")} /> : null}<Select label="Publication" name="is_published" defaultValue={editing?.is_published === true || Number(editing?.is_published) === 1 ? "published" : "draft"}><Options values={["draft", "published"]} /></Select><Field label="Expires at (optional)" name="expires_at" type="datetime-local" defaultValue={localDateTime(editing?.expires_at)} /></EntryForm></Split>;
}
