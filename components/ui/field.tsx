import { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-blueprint-ink">
      <span className="text-xs font-semibold uppercase tracking-[0.04em] text-blueprint-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 rounded-md border border-blueprint-line bg-white/95 px-3 text-sm text-blueprint-ink shadow-[inset_0_1px_0_rgba(6,28,61,0.03)] outline-none transition placeholder:text-slate-400 hover:border-[#b7cada] focus:border-blueprint-accent focus:ring-4 focus:ring-[#dceeff]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 rounded-md border border-blueprint-line bg-white/95 px-3 text-sm text-blueprint-ink shadow-[inset_0_1px_0_rgba(6,28,61,0.03)] outline-none transition hover:border-[#b7cada] focus:border-blueprint-accent focus:ring-4 focus:ring-[#dceeff]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
