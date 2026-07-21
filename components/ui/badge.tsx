import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "green" | "amber" | "gray" | "violet";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = "gray", ...props }: BadgeProps) {
  const tones: Record<BadgeTone, string> = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-[#fff7e8] text-[#9a5a0b] ring-[#f3d39a]",
    gray: "bg-white/80 text-slate-700 ring-slate-200",
    violet: "bg-[#eef0ff] text-[#4554a6] ring-[#d7dcff]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
