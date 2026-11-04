import { useLayoutEffect, useRef, type ReactNode } from "react";

export function SchoolDialog({ label, onClose, className, children }: {
  label: string;
  onClose: () => void;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={ref} aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border border-[#E8E2ED] bg-white text-[#27232D] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs ${className}`}>
    {children}
  </dialog>;
}
