import React from "react";
import Link from "next/link";

export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------- Badge ---------------------------------- */

const tones: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700 ring-gray-300",
  green: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  yellow: "bg-amber-100 text-amber-800 ring-amber-300",
  red: "bg-red-100 text-red-800 ring-red-300",
  blue: "bg-blue-100 text-blue-800 ring-blue-300",
  purple: "bg-violet-100 text-violet-800 ring-violet-300",
};

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone] ?? tones.gray
      )}
    >
      {children}
    </span>
  );
}

export const projectStatusTone: Record<string, string> = {
  LEAD: "purple",
  ACTIVE: "green",
  ON_HOLD: "yellow",
  COMPLETED: "blue",
};

export const scheduleStatusTone: Record<string, string> = {
  SCHEDULED: "gray",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
};

export const todoStatusTone: Record<string, string> = {
  OPEN: "gray",
  IN_PROGRESS: "blue",
  DONE: "green",
};

export const priorityTone: Record<string, string> = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "yellow",
  URGENT: "red",
};

export const estimateStatusTone: Record<string, string> = {
  DRAFT: "gray",
  SENT: "blue",
  APPROVED: "green",
  DECLINED: "red",
};

export const changeOrderStatusTone: Record<string, string> = {
  DRAFT: "gray",
  PENDING: "yellow",
  APPROVED: "green",
  DECLINED: "red",
};

export const selectionStatusTone: Record<string, string> = {
  PENDING: "yellow",
  APPROVED: "green",
  DECLINED: "red",
};

export function prettyEnum(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/* ---------------------------------- Card ----------------------------------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

/* --------------------------------- Buttons --------------------------------- */

const buttonStyles: Record<string, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary:
    "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-gray-600 hover:bg-gray-100",
};

export type ButtonVariant = keyof typeof buttonStyles;

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        buttonStyles[variant],
        className
      )}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition",
        buttonStyles[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}

/* ---------------------------------- Forms ---------------------------------- */

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, props.className)} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputClass, "pr-8", className)}>
      {children}
    </select>
  );
}

/* ------------------------------- Page header ------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* --------------------------------- Helpers --------------------------------- */

export function money(
  value: number | string | { toString(): string } | null | undefined
): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value.toString());
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function formatDate(
  value: Date | string | null | undefined
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(
  value: Date | string | null | undefined
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Value for <input type="date"> from a Date. */
export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
