import React from "react";
import { StaffUser } from "./api";
import { EntryForm, Field, Save } from "./WorkspaceUI";

export function AccountSettings({ user, save }: { user: StaffUser; save: Save }) {
  return <div className="max-w-xl"><p className="mb-5 text-sm text-[#625B69]">Signed in as <strong>{user.full_name}</strong> ({user.role}).</p><EntryForm title="Change your password" submitLabel="Change password and sign out" onSave={(data, form) => {
    const confirmation = form.elements.namedItem("confirm_password") as HTMLInputElement;
    confirmation.setCustomValidity(data.new_password === data.confirm_password ? "" : "Passwords do not match.");
    if (!form.reportValidity()) return Promise.resolve(false);
    return save("/api/auth/password", { current_password: data.current_password, new_password: data.new_password });
  }}><Field label="Current password" name="current_password" type="password" autoComplete="current-password" required /><Field label="New password" name="new_password" type="password" autoComplete="new-password" minLength={12} maxLength={200} required /><Field label="Confirm new password" name="confirm_password" type="password" autoComplete="new-password" minLength={12} maxLength={200} required onChange={event => event.currentTarget.setCustomValidity("")} /><p className="text-sm leading-6 text-[#625B69]">Use at least 12 characters. Changing your password signs out all your sessions. Sign in again with your new password.</p></EntryForm></div>;
}
