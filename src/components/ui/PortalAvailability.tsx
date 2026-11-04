export const unavailableMessage = "School sign-in is temporarily unavailable. Please try again.";

export async function checkSchoolService(signal: AbortSignal) {
  const response = await fetch("/api/health", {
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (!response.ok || (await response.json()).ok !== true) throw new Error(unavailableMessage);
}

export function PortalUnavailable({ retry }: { retry: () => void }) {
  return <div className="my-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <p role="alert">{unavailableMessage}</p>
    <button type="button" onClick={retry} className="mt-2 min-h-11 font-bold underline">Try again</button>
  </div>;
}
