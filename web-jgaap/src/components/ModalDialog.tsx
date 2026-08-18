"use client";

import { useEffect, type ReactNode } from "react";

type ModalDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
};

const SIZE_CLASS = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl"
};

export function ModalDialog({
  open,
  title,
  onClose,
  children,
  footer,
  size = "lg"
}: ModalDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 cursor-default"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex w-full flex-col ${SIZE_CLASS[size]} max-h-[min(90vh,900px)] rounded-lg border border-slate-200 bg-white shadow-xl`}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h3 id="modal-dialog-title" className="section-title mb-0">
            {title}
          </h3>
          <button
            type="button"
            className="secondary-button text-xs px-2 py-1 min-w-[2rem]"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="shrink-0 flex justify-end gap-2 border-t px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
