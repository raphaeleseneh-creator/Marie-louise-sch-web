import React from 'react';
import { Row } from './api';
import { EntryForm, Save } from './WorkspaceUI';

export function RemoveAccountAccess({ account, save, cancel }: { account: Row; save: Save; cancel: () => void }) {
  return <div className="max-w-xl"><EntryForm title="Remove account access" submitLabel="Remove access and sign out" onCancel={cancel} resetOnSuccess={false} onSave={async data => {
    if (data.confirm_removal !== 'on') return false;
    const removed = await save(`/api/accounts/${account.id}`, { active: false }, 'PATCH');
    if (removed) cancel();
    return removed;
  }}>
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"><p className="font-bold">{account.full_name}</p><p className="break-words">{account.email}</p><p className="mt-1 capitalize">{account.role}</p></div>
    <p className="text-sm leading-6">This person will be signed out of all current sessions. They will no longer be able to sign in with their password or Google account.</p>
    <p className="text-sm leading-6">Their account and school records will be kept. To restore access later, open Manage access, choose Active, and save.</p>
    <label className="flex items-start gap-3 text-sm leading-6"><input autoFocus required name="confirm_removal" type="checkbox" className="mt-1 h-5 w-5 accent-[#581C87]" />I want to remove this person’s access.</label>
  </EntryForm></div>;
}
