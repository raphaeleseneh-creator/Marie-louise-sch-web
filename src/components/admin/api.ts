export type Role = "admin" | "teacher" | "bursar" | "parent";
export type StaffUser = { id: number; full_name: string; role: Role; parent_id?: number | null };
export type Row = { id: number; [key: string]: string | number | boolean | number[] | null | undefined };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body || (options.method && !["GET", "HEAD"].includes(options.method.toUpperCase()))) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...options, headers, credentials: "same-origin", cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details = Array.isArray(payload?.errors)
      ? payload.errors.map((item: unknown) => typeof item === "string" ? item : JSON.stringify(item)).join("; ")
      : "";
    throw new ApiError([payload?.error || payload?.message || `Request failed (${response.status})`, details].filter(Boolean).join(": "), response.status);
  }
  return payload as T;
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Unable to complete this request. Please try again.";
export const studentName = (row: Row) => String(row.student_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || `Student #${row.student_id || row.id}`);
export const money = (value: unknown) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(value || 0));
export function dateText(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
}
export function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function localDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
