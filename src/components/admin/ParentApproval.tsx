import React, { useEffect, useState } from 'react';
import { api, errorMessage, Row } from './api';
import { EntryForm, Save, Select } from './WorkspaceUI';

export function ParentApproval({ account, parents, save, cancel }: { account: Row; parents: Row[]; save: Save; cancel: () => void }) {
  const [parentId, setParentId] = useState(''), [children, setChildren] = useState<Row[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setChildren([]); setError('');
    if (!parentId) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    api<Row[]>(`/api/parents/${encodeURIComponent(parentId)}/children`, { signal: controller.signal }).then(rows => {
      if (!controller.signal.aborted) setChildren(rows);
    }).catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [parentId]);
  return <div className="max-w-xl"><EntryForm title="Review parent registration" submitLabel="Approve verified parent" onCancel={cancel} resetOnSuccess={false} onSave={async data => {
    if (loading || error || !children.length) return false;
    const ok = await save(`/api/accounts/${account.id}/approve-parent`, { parent_id: Number(parentId), guardian_verified: data.guardian_verified === 'on', verified_student_ids: children.map(child => Number(child.id)) });
    if (ok) cancel(); return ok;
  }}>
    <p className="text-sm leading-6"><strong>{account.full_name}</strong><br />{account.email}</p>
    <p className="text-sm leading-6">Verify this person privately with the school’s guardian records. A matching name or email alone is insufficient. Create or correct the guardian and child links under Parents &amp; guardians first.</p>
    <Select label="Verified guardian record" name="parent_id" required value={parentId} onChange={event => { setChildren([]); setParentId(event.target.value); }}><option value="">Choose a guardian</option>{parents.filter(parent => parent.status === 'active').map(parent => <option key={parent.id} value={parent.id}>{parent.full_name} · {parent.email}</option>)}</Select>
    {loading ? <p role="status">Loading linked children…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : parentId ? <section><h3 className="font-bold">Children this account will be able to view</h3>{children.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{children.map(child => <li key={child.id}>{child.first_name} {child.last_name} · {child.student_code} · {child.class_name || 'No class'}</li>)}</ul> : <p className="mt-3 text-sm">No active children linked. Add verified links before approving.</p>}</section> : null}
    <label key={parentId} className="flex items-start gap-3 text-sm leading-6"><input disabled={loading || !children.length || Boolean(error)} required type="checkbox" name="guardian_verified" className="mt-1 h-5 w-5 accent-[#581C87]" />I verified this guardian’s identity and permission to access every child listed above.</label>
    <p className="text-xs leading-5">Approval signs out the pending session. Ask the parent to sign in again. No child links are created automatically.</p>
  </EntryForm></div>;
}
