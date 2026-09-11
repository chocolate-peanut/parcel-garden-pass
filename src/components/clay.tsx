import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ClayCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("clay p-5", className)} {...props} />;
}

export function ClayPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("clay-inset p-4", className)} {...props} />;
}

type ClayButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "accent" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
};

const variants: Record<NonNullable<ClayButtonProps["variant"]>, string> = {
  primary: "clay-soft clay-press bg-primary text-primary-foreground",
  soft: "clay-soft clay-press bg-secondary text-secondary-foreground",
  accent: "clay-soft clay-press bg-accent text-accent-foreground",
  danger: "clay-soft clay-press bg-destructive text-destructive-foreground",
  ghost: "rounded-2xl text-muted-foreground hover:bg-secondary/60",
};

const sizes: Record<NonNullable<ClayButtonProps["size"]>, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-5 py-3 text-base",
  lg: "px-6 py-4 text-lg",
};

export function ClayButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ClayButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function ClayInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "clay-inset w-full px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ClaySelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "clay-inset w-full appearance-none px-4 py-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring/60",
        className,
      )}
      {...props}
    />
  );
}
