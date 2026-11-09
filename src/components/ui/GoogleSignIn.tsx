import React, { useEffect, useRef, useState } from 'react';

type IdentityService = { initialize: (options: { client_id: string; nonce: string; callback: (value: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, unknown>) => void };
declare global { interface Window { google?: { accounts: { id: IdentityService } } } }
let script: Promise<void> | undefined;
function loadGoogle() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (!script) script = new Promise<void>((resolve, reject) => {
    const element = document.createElement('script');
    element.src = 'https://accounts.google.com/gsi/client'; element.async = true;
    element.onload = () => resolve(); element.onerror = () => { element.remove(); script = undefined; reject(new Error('Google could not load. Check your connection and try again.')); };
    document.head.appendChild(element);
  });
  return script;
}
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Google sign-in could not be completed.');
  return data;
}
export function GoogleSignIn({ portal }: { portal: 'parent' | 'staff' }) {
  const button = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError('');
    void (async () => {
      const config = await request<{ enabled: boolean; clientId: string }>('/api/auth/google/config');
      if (cancelled || !config.enabled) return;
      setEnabled(true);
      await loadGoogle();
      if (cancelled) return;
      const { nonce } = await request<{ nonce: string }>('/api/auth/google/challenge', { portal });
      if (cancelled || !button.current) return;
      window.google!.accounts.id.initialize({ client_id: config.clientId, nonce, callback: ({ credential }) => {
        if (cancelled) return;
        setBusy(true); setError('');
        void request('/api/auth/google', { credential, nonce }).then(() => { window.location.reload(); }).catch(reason => { if (!cancelled) { setError(reason.message); setBusy(false); } });
      } });
      button.current.replaceChildren();
      window.google!.accounts.id.renderButton(button.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(360, button.current.clientWidth || 280) });
    })().catch(reason => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; };
  }, [portal, retry]);
  if (!enabled) return null;
  return <section aria-label="Google sign-in" className="mt-6 border-t border-[#DCD5E1] pt-5">
    <div ref={button} className={busy ? 'pointer-events-none opacity-50' : ''} />
    {busy ? <p role="status" className="mt-3 text-sm">Signing in securely…</p> : null}
    {error ? <div className="mt-3 text-sm"><p role="alert" className="text-red-700">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-11 font-bold text-[#581C87]">Try Google again</button></div> : null}
    <p className="mt-3 text-xs leading-5 text-[#625B69]">{portal === 'parent' ? 'Create your account with Google, then link your children using school-issued student IDs and a private linking code.' : 'Use the Google account associated with your school account. Staff access is assigned by the school.'}</p>
  </section>;
}
