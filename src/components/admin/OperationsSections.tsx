import { RemoveAccountAccess } from "./RemoveAccountAccess";
import React, { useState } from "react";
import { Row, dateText, localDate, money, studentName } from "./api";
import { DataTable, EntryForm, Field, Options, Save, Select, Split, Status, StudentSelect, secondaryClass } from "./WorkspaceUI";

type Props = { rows: Row[]; students: Row[]; save: Save };
export function FeesSection({ rows, students, save }: Props) {
  return <Split><DataTable rows={rows} searchLabel="Search student or invoice" columns={[
    { label: "Student", render: studentName },
    { label: "Invoice", render: row => <><p className="font-bold text-[#29166F]">{row.invoice_number}</p><p className="mt-1 text-xs">{row.description}</p></> },
    { label: "Amount due", render: row => money(row.amount_due) }, { label: "Paid", render: row => money(row.amount_paid) },
    { label: "Balance", render: row => money(Math.max(0, Number(row.amount_due || 0) - Number(row.amount_paid || 0))) },
    { label: "Due date", render: row => dateText(row.due_date) }, { label: "Status", render: row => <Status value={row.status} /> },
  ]} /><EntryForm title="Create fee invoice" onSave={data => save("/api/fees", { ...data, student_id: Number(data.student_id), amount_due: Number(data.amount_due), due_date: data.due_date || null })}><StudentSelect students={students} /><Field label="Invoice number" name="invoice_number" required /><Field label="Description" name="description" required /><Field label="Amount due (NGN)" name="amount_due" type="number" min="0.01" step="0.01" required /><Field label="Due date" name="due_date" type="date" /><p className="text-xs text-[#625B69]">Record payments separately to keep invoice balances up to date.</p></EntryForm></Split>;
}

export function PaymentsSection({ rows, invoices, save }: { rows: Row[]; invoices: Row[]; save: Save }) {
  const [invoiceId, setInvoiceId] = useState("");
  const invoice = invoices.find(item => String(item.id) === invoiceId);
  return <Split><DataTable rows={rows} columns={[
    { label: "Student", render: row => row.student_name || studentName(invoices.find(item => item.id === Number(row.invoice_id)) || row) },
    { label: "Receipt", render: row => row.receipt_number },
    { label: "Invoice", render: row => row.invoice_number || invoices.find(item => item.id === Number(row.invoice_id))?.invoice_number || `#${row.invoice_id}` },
    { label: "Amount paid", render: row => money(row.amount_paid) }, { label: "Date", render: row => dateText(row.payment_date) },
    { label: "Method", render: row => row.payment_method }, { label: "Reference", render: row => row.reference || "—" },
  ]} /><EntryForm title="Record payment" onSave={async data => { const ok = await save("/api/payments", { ...data, invoice_id: Number(data.invoice_id), amount_paid: Number(data.amount_paid) }); if (ok) setInvoiceId(""); return ok; }}><Select label="Invoice" name="invoice_id" required value={invoiceId} onChange={event => setInvoiceId(event.target.value)}><option value="">Select invoice</option>{invoices.map(item => <option key={item.id} value={item.id}>{item.invoice_number} · {studentName(item)}</option>)}</Select>{invoice ? <p className="rounded-lg bg-[#F8F6FA] p-3 text-sm">Outstanding: <strong>{money(Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_paid || 0)))}</strong></p> : null}<Field label="Receipt number" name="receipt_number" required /><Field label="Amount paid (NGN)" name="amount_paid" type="number" min="0.01" step="0.01" required /><Field label="Payment date" name="payment_date" type="date" defaultValue={localDate()} required /><Select label="Payment method" name="payment_method"><Options values={["bank_transfer", "cash", "pos", "cheque", "online"]} /></Select><Field label="Reference (optional)" name="reference" /></EntryForm></Split>;
}

export function AccountsSection({ rows, parents, classes, save, currentUserId, canManageDevelopers = false }: { rows: Row[]; parents: Row[]; classes: Row[]; save: Save; currentUserId: number; canManageDevelopers?: boolean }) {
  const [role, setRole] = useState("teacher");
  const [editing, setEditing] = useState<Row | null>(null);
  const [removingAccess, setRemovingAccess] = useState<Row | null>(null);
  if (removingAccess) return <RemoveAccountAccess account={removingAccess} save={save} cancel={() => setRemovingAccess(null)} />;
  if (editing?.registration_pending) return <div className="max-w-xl"><EntryForm title="Parent account — no children linked yet" submitLabel="Deactivate account" onCancel={() => setEditing(null)} onSave={async data => { if(data.confirm!=="on") return false;const ok=await save(`/api/accounts/${editing.id}`,{active:false},"PATCH");if(ok)setEditing(null);return ok; }}><p className="text-sm leading-6">{editing.full_name} · {editing.email}. This parent can sign in now. They link their children using school-issued student IDs and a private code. Use Family access codes to issue these details; no approval is required.</p><label className="flex items-center gap-3 text-sm"><input name="confirm" type="checkbox" required/>Deactivate this parent account and sign out its sessions.</label></EntryForm></div>;
  if (editing) return <div className="max-w-xl"><EntryForm key={editing.id} title={`Manage ${editing.full_name}`} onCancel={() => setEditing(null)} resetOnSuccess={false} onSave={async (data, form) => {
    const payload: Record<string, unknown> = { active: data.active === "true" };
    if (data.password) payload.password = data.password;
    if (editing.role === "teacher") payload.class_ids = new FormData(form).getAll("class_ids").map(Number);
    const ok = await save(`/api/accounts/${editing.id}`, payload, "PATCH");
    if (ok) setEditing(null); return ok;
  }}><p className="text-sm">{editing.email} · {editing.role}</p><Select label="Account access" name="active" defaultValue={editing.active === true || Number(editing.active) === 1 ? "true" : "false"}><option value="true">Active</option><option value="false">Deactivated</option></Select><Field label="Reset password (optional)" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} /><p className="text-xs text-[#625B69]">Leave blank to keep the current password. A new password must contain at least 12 characters.</p>{editing.role === "teacher" ? <fieldset><legend className="mb-2 text-xs font-bold">Assigned classes</legend>{classes.map(item => <label key={item.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="class_ids" value={item.id} defaultChecked={Array.isArray(editing.class_ids) && editing.class_ids.map(Number).includes(item.id)} className="h-4 w-4 accent-[#581C87]" />{item.name}</label>)}</fieldset> : null}<p className="text-sm text-[#625B69]">Saving account changes signs out this user’s current sessions.</p></EntryForm></div>;
  return <Split><DataTable rows={rows} columns={[
    { label: "Name", render: row => row.full_name }, { label: "Email", render: row => row.email },
    { label: "Access", render: row => <Status value={row.registration_pending ? "no children linked" : row.active === true || Number(row.active) === 1 ? "active" : "deactivated"} /> },
    { label: "Classes", render: row => Array.isArray(row.class_ids) ? row.class_ids.map(id => classes.find(item => item.id === id)?.name || `#${id}`).join(", ") || "—" : "—" },
    { label: "Actions", render: row => row.id === currentUserId ? <span className="text-xs text-[#625B69]">Use Account settings</span> : row.role === "developer" && !canManageDevelopers ? <span className="text-xs text-[#625B69]">Developer-managed account</span> : <div className="flex flex-wrap gap-2"><button className={secondaryClass} onClick={() => setEditing(row)}>Manage access</button>{canManageDevelopers && (row.registration_pending || row.active === true || Number(row.active) === 1) ? <button type="button" className="min-h-11 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => setRemovingAccess(row)}>Remove access</button> : null}</div> },
    { label: "Role", render: row => <Status value={row.role} /> }, { label: "Parent record", render: row => row.parent_id ? parents.find(parent => parent.id === Number(row.parent_id))?.full_name || `#${row.parent_id}` : "—" },
  ]} /><EntryForm title="Create account" onSave={async (data, form) => {
    const ok = await save("/api/accounts", { full_name: data.full_name, email: data.email, password: data.password, role, parent_id: role === "parent" ? Number(data.parent_id) : null, class_ids: role === "teacher" ? new FormData(form).getAll("class_ids").map(Number) : [] });
    if (ok) setRole("teacher"); return ok;
  }}><Field label="Full name" name="full_name" autoComplete="name" required /><Field label="Email" name="email" type="email" autoComplete="off" required /><Field label="Initial password" name="password" type="password" minLength={12} maxLength={200} autoComplete="new-password" required /><Select label="Role" name="role" value={role} onChange={event => setRole(event.target.value)}><Options values={["teacher", "bursar", "admin", "parent"]} /></Select>{role === "parent" ? <Select label="Parent record" name="parent_id" required defaultValue=""><option value="">Select parent</option>{parents.map(parent => <option key={parent.id} value={parent.id}>{parent.full_name} · {parent.email}</option>)}</Select> : null}{role === "teacher" ? <fieldset className="space-y-2"><legend className="mb-2 text-xs font-bold text-[#4C4058]">Assigned classes</legend>{classes.length ? classes.map(item => <label key={item.id} className="flex min-h-10 items-center gap-3 text-sm"><input type="checkbox" name="class_ids" value={item.id} className="h-4 w-4 accent-[#581C87]" />{item.name}</label>) : <p className="text-sm text-[#625B69]">No classes available.</p>}<p className="text-xs text-[#625B69]">Teachers see records for their assigned classes.</p></fieldset> : null}</EntryForm></Split>;
}

export function RequestsSection({ rows, kind, save }: { rows: Row[]; kind: "admissions" | "tours"; save: Save }) {
  const [selected, setSelected] = useState<Row | null>(null);
  return <div className="space-y-6"><DataTable rows={rows} columns={[
    { label: kind === "admissions" ? "Applicant" : "Visitor", render: row => row.student_name || row.child_name || row.full_name || row.parent_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || `Request #${row.id}` },
    { label: "Contact", render: row => <><p>{row.parent_name || row.guardian_name || row.full_name}</p><p>{row.email || row.parent_email}</p><p className="text-xs">{row.phone || row.parent_phone}</p></> },
    { label: "Date", render: row => dateText(row.preferred_date || row.tour_date || row.created_at) },
    { label: "Status", render: row => <Status value={row.status} /> },
    { label: "Actions", render: row => <button type="button" className="min-h-11 rounded-lg px-3 text-sm font-bold text-[#581C87] hover:bg-[#F1ECF6] focus-visible:outline-2" onClick={() => setSelected(row)}>Review request</button> },
  ]} />{selected ? <section className="grid items-start gap-6 rounded-xl border border-[#E5DFE9] bg-white p-5 lg:grid-cols-2"><div><h2 className="text-lg font-extrabold text-[#29166F]">Request #{selected.id}</h2><dl className="mt-4 divide-y divide-[#EEE9F1]">{Object.entries(selected).filter(([key]) => key !== "id").map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 py-3 text-sm"><dt className="capitalize text-[#625B69]">{key.replaceAll("_", " ")}</dt><dd className="break-words whitespace-pre-wrap">{String(value ?? "—")}</dd></div>)}</dl></div><EntryForm key={selected.id} title="Update request status" onCancel={() => setSelected(null)} resetOnSuccess={false} onSave={async data => { const ok = await save(`/api/${kind}/${selected.id}`, { status: data.status }, "PATCH"); if (ok) setSelected(null); return ok; }}><Select label="Status" name="status" defaultValue={String(selected.status || "new")}><Options values={Array.from(new Set([String(selected.status || "new"), ...(kind === "admissions" ? ["new", "contacted", "accepted", "declined"] : ["new", "confirmed", "completed", "cancelled"])]))} /></Select></EntryForm></section> : null}</div>;
}
