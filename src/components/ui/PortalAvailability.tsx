export const unavailableMessage = "School sign-in is temporarily unavailable. Please try again.";

export type SchoolHealth = { ok: true; portalDemo?: boolean };

export async function checkSchoolService(signal: AbortSignal): Promise<SchoolHealth> {
  const response = await fetch("/api/health", {
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  const body = response.ok ? await response.json().catch(() => null) : null;
  if (!body || body.ok !== true) throw new Error(unavailableMessage);
  return body as SchoolHealth;
}

export function PortalUnavailable({ retry }: { retry: () => void }) {
  return <div className="my-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <p role="alert">{unavailableMessage}</p>
    <button type="button" onClick={retry} className="mt-2 min-h-11 font-bold underline">Try again</button>
  </div>;
}
