import { cn } from "@/lib/utils";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#18446f]/20 bg-white shadow-sm">
        <svg
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="h-8 w-8 text-blueprint-accent"
          fill="none"
        >
          <path
            d="M9 7h23l7 7v27H9V7Z"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M31 7v9h8" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M16 16h15M16 24h20M16 32h15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M16 10v31M28 16v25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.72" />
        </svg>
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="text-[1.35rem] font-black leading-none tracking-[0.08em] text-blueprint-ink">
            BLUEPRINT
          </div>
          <div className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-blueprint-muted">
            Construction Management
          </div>
        </div>
      ) : null}
    </div>
  );
}
