import { cn } from "@/lib/utils";
import type { ReactNode, Ref } from "react";
import Iconx  from "./iconx";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-base font-semibold tracking-tight text-card-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-card-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25";

export function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="rounded-full p-0.5 text-accent-foreground/70 transition hover:bg-primary/10 hover:text-accent-foreground"
      >
        <Iconx name="close" className="text-[16px]" />
      </button>
    </span>
  );
}

export function GhostButton({
  icon,
  children,
  onClick,
  className,
}: {
  icon: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <Iconx name={icon} className="text-[18px]" />
      {children}
    </button>
  );
}

export function IconButton({
  name,
  label,
  onClick,
  tone = "default",
}: {
  name: string;
  label: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg transition",
        tone === "danger"
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Iconx name={name} className="text-[20px]" />
    </button>
  );
}

// A plain checkbox rather than a Switch: these are settings that only take
// effect on save, which is what a checkbox communicates (Switch reads as
// something that applies immediately).
export function CheckboxRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean | undefined;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary disabled:opacity-50"
      />
      <div className="grid gap-0.5">
        <label
          htmlFor={id}
          className="text-sm leading-none cursor-pointer select-none"
        >
          {label}
        </label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

// Optional money fields clear back to undefined, not NaN — otherwise an
// emptied field would fail `.optional()`.
export function toOptionalNumber(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw);
}

export function numberInputValue(value: number | undefined): string | number {
  return value === undefined || Number.isNaN(value) ? "" : value;
}

// Money input with a leading currency symbol, used across Pricing.
export function MoneyInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  inputRef,
  disabled,
  placeholder = "0.00",
}: {
  id: string;
  name: string;
  value: number | undefined;
  onChange: (raw: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
        $
      </span>
      <input
        id={id}
        name={name}
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        className={cn(inputClass, "pl-7")}
        placeholder={placeholder}
        disabled={disabled}
        value={numberInputValue(value)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}