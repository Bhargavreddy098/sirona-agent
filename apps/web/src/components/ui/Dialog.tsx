import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  dismissible?: boolean;
}

export function Dialog({ open, onClose, title, children, dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onCancel={event => {
        if (!dismissible) event.preventDefault();
      }}
      className="rounded-2xl p-6 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-lg w-full backdrop:bg-black/40 backdrop:backdrop-blur-xs outline-none"
    >
      <header className="dialog-heading flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800">
        <h2 id={id} className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        <button
          type="button"
          disabled={!dismissible}
          aria-label="Close dialog"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all cursor-pointer"
          onClick={onClose}
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </header>
      {open && children}
    </dialog>
  );
}
