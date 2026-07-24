"use client";

import { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel?: string;
  description: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
};

export function ConfirmDialog({
  cancelLabel = "Cancelar",
  children,
  confirmLabel = "Confirmar",
  description,
  destructive = false,
  onCancel,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/50 px-4">
      <section className="w-full max-w-md rounded-lg border border-blueprint-line bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span
              className={
                destructive
                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eef6fd] text-blueprint-accent"
              }
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-blueprint-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-blueprint-muted">{description}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" className="h-9 px-2" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={destructive ? "bg-red-700 hover:bg-red-800" : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
