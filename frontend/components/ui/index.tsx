"use client";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import React from "react";

// ── Button ─────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "green";
  size?: "sm" | "md";
  loading?: boolean;
}
export function Btn({ variant = "ghost", size = "md", loading, children, className, ...props }: BtnProps) {
  const base = "inline-flex items-center gap-1.5 font-display font-bold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-[10px]", md: "px-4 py-2 text-xs" };
  const variants = {
    primary: "bg-orange-400 text-white hover:bg-orange-300",
    ghost: "bg-transparent text-[color:var(--text2)] hover:bg-[color:var(--bg3)] border border-[color:var(--border2)]",
    danger: "bg-transparent text-red-400 border border-red-800 hover:bg-red-950",
    green: "bg-green-400 text-white hover:bg-green-300",
  };
  return (
    <button className={clsx(base, sizes[size], variants[variant], className)} {...props}>
      {loading && <Loader2 size={12} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────
interface BadgeProps { children: React.ReactNode; variant?: "green" | "orange" | "gray" | "red"; }
export function Badge({ children, variant = "gray" }: BadgeProps) {
  const variants = {
    green:  "bg-[rgba(46,204,113,0.15)] text-green-300 border border-[rgba(46,204,113,0.4)]",
    orange: "bg-[rgba(255,107,26,0.15)] text-orange-300 border border-[rgba(255,107,26,0.4)]",
    gray:   "bg-[color:var(--bg4)] text-[color:var(--text3)] border border-[color:var(--border2)]",
    red:    "bg-[rgba(255,60,60,0.15)] text-red-400 border border-[rgba(255,60,60,0.3)]",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-medium", variants[variant])}>
      {children}
    </span>
  );
}

// ── Card ───────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx("rounded-lg p-4 border", className)}
      style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = "orange" }: {
  label: string; value: string | number; sub?: string; accent?: "orange" | "green";
}) {
  return (
    <div className="rounded-lg p-4 border" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
      <p className="font-mono text-[9px] mb-2" style={{ color: "var(--text3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
        {label}
      </p>
      <p
        className="font-display font-extrabold text-2xl leading-none"
        style={{ color: accent === "orange" ? "var(--orange2)" : "var(--green2)" }}
      >
        {value}
      </p>
      {sub && <p className="font-mono text-[10px] mt-1.5" style={{ color: "var(--text3)" }}>{sub}</p>}
    </div>
  );
}

// ── Input ──────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }
export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="font-mono text-[10px]" style={{ color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      <input
        className={clsx(
          "px-3 py-2 rounded-md text-xs font-mono outline-none transition-all",
          "border focus:border-orange-400",
          error ? "border-red-700" : "",
          className
        )}
        style={{
          background: "var(--bg3)",
          color: "var(--text)",
          borderColor: error ? undefined : "var(--border2)",
        }}
        {...props}
      />
      {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; }
export function Select({ label, children, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="font-mono text-[10px]" style={{ color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      <select
        className={clsx("px-3 py-2 rounded-md text-xs font-mono outline-none border focus:border-orange-400", className)}
        style={{ background: "var(--bg3)", color: "var(--text)", borderColor: "var(--border2)" }}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="rounded-xl border w-full max-w-lg mx-4 animate-slide-up"
        style={{ background: "var(--bg2)", borderColor: "var(--border2)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="font-display font-bold text-sm" style={{ color: "var(--text)" }}>{title}</h2>
          <button onClick={onClose} className="font-mono text-lg leading-none" style={{ color: "var(--text3)" }}>×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── PageHeader ─────────────────────────────────────────────────────────
export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 px-6 py-4"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}
    >
      <div className="flex-1">
        <h1 className="font-display font-bold text-base leading-none" style={{ color: "var(--text)" }}>{title}</h1>
        {sub && <p className="font-mono text-[10px] mt-1" style={{ color: "var(--text3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>{sub}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin" style={{ color: "var(--orange2)" }} />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────
export function Empty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--bg3)" }}>
        <span className="font-mono text-lg" style={{ color: "var(--text3)" }}>∅</span>
      </div>
      <p className="font-mono text-xs" style={{ color: "var(--text3)" }}>{message}</p>
    </div>
  );
}
