import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const variants: Record<ButtonVariant, string> = {
      primary:
        "bg-blueprint-accent text-white shadow-[0_10px_22px_rgba(11,118,189,0.22)] hover:bg-[#0867a7] hover:shadow-[0_14px_26px_rgba(11,118,189,0.26)]",
      secondary:
        "border border-blueprint-line bg-white/90 text-blueprint-ink shadow-sm hover:border-blueprint-accent hover:bg-[#eef7ff]",
      ghost: "text-blueprint-muted hover:bg-white hover:text-blueprint-ink hover:shadow-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
