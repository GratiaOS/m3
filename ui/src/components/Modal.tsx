import React from 'react';
import clsx from 'clsx';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Modal({ open, onClose, children, title = 'Quick Action', className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid bg-black/50 backdrop-blur-sm transition-[background] supports-[backdrop-filter]:bg-black/40">
      <div
        className={clsx(
          'm-auto w-full max-w-3xl rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-2xl transition dark:border-zinc-700/60 dark:bg-zinc-900',
          'grid gap-5',
          className
        )}>
        <header className="flex items-start justify-between gap-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-full border border-transparent text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-offset-zinc-900">
            ✕
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto text-zinc-800 dark:text-zinc-200">{children}</div>
      </div>
    </div>
  );
}
