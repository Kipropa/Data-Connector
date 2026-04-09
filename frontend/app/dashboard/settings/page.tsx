"use client";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { PageHeader, Btn, Badge } from "@/components/ui/index";
import {
  User, Sun, Moon, Key, Globe, Trash2, Shield,
  Copy, Check, AlertTriangle, Server
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/* ── Reusable section card ──────────────────────────────────────────── */
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden w-full"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3 shrink-0"
        style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)" }}
      >
        <Icon size={13} style={{ color: "var(--orange2)" }} />
        <h2 className="font-display font-bold text-xs" style={{ color: "var(--text)" }}>
          {title}
        </h2>
      </div>
      <div className="p-5" style={{ background: "var(--bg)" }}>
        {children}
      </div>
    </div>
  );
}

/* ── A single settings row ──────────────────────────────────────────── */
function Row({
  label,
  sub,
  action,
}: {
  label: string;
  sub?: string;
  action: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col sm:flex-row items-start justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-xs" style={{ color: "var(--text)" }}>
          {label}
        </p>
        {sub && (
          <p
            className="font-mono text-[10px] mt-1 leading-relaxed break-words"
            style={{ color: "var(--text3)" }}
          >
            {sub}
          </p>
        )}
      </div>

      {/* Action button */}
      <div className="shrink-0 pt-0 sm:pt-0.5">
        {action}
      </div>
    </div>
  );
}

/* ── Copyable URL field ─────────────────────────────────────────────── */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-1 w-full">
      <p
        className="font-mono text-[9px] uppercase tracking-widest"
        style={{ color: "var(--text3)" }}
      >
        {label}
      </p>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md w-full"
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border2)",
          minWidth: 0,
        }}
      >
        <span
          className="font-mono text-xs flex-1 truncate"
          style={{ color: "var(--text2)" }}
        >
          {value}
        </span>
        <button
          onClick={copy}
          className="shrink-0 transition-colors"
          style={{ color: copied ? "var(--green2)" : "var(--text3)" }}
          title={copied ? "Copied!" : "Copy"}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const [name, setName] = useState(user?.name ?? "");
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex flex-col" style={{ height: "100%", minHeight: 0 }}>
      <PageHeader title="Settings" sub="Platform configuration & preferences" />

      {/* Scrollable body - with bonus mobile padding improvement */}
      <div
        style={{ flex: "1 1 0", overflowY: "auto", overflowX: "hidden" }}
        className="p-4 sm:p-6"
      >
        <div className="flex flex-col gap-5" style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* ── Account ───────────────────────── */}
          <Section title="Account" icon={User}>
            <div className="flex flex-col gap-0">
              <Row
                label="Logged in as"
                sub={user?.email}
                action={
                  <Badge variant="orange">
                    {user?.role?.toUpperCase() ?? "ADMIN"}
                  </Badge>
                }
              />
            </div>
            <div className="flex flex-wrap gap-3 items-end pt-4">
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <label
                  className="font-mono text-[9px] uppercase tracking-widest block mb-1"
                  style={{ color: "var(--text3)" }}
                >
                  Display Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 rounded-md text-xs font-mono outline-none border focus:border-orange-400"
                  style={{
                    background: "var(--bg3)",
                    color: "var(--text)",
                    borderColor: "var(--border2)",
                  }}
                />
              </div>
              <Btn
                variant="primary"
                size="sm"
                onClick={() =>
                  toast.success("Display name saved (UI only — wire to profile API to persist).")
                }
              >
                Save
              </Btn>
            </div>
          </Section>

          {/* ── Appearance ────────────────────── */}
          <Section title="Appearance" icon={Sun}>
            <Row
              label="Color Theme"
              sub={`Currently using ${theme === "dark" ? "Dark" : "Light"} mode`}
              action={
                <Btn variant="ghost" size="sm" onClick={toggle}>
                  {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
                  {`Switch to ${theme === "dark" ? "Light" : "Dark"}`}
                </Btn>
              }
            />
          </Section>

          {/* ── API & Platform ────────────────── */}
          <Section title="API & Platform" icon={Globe}>
            <div className="flex flex-col gap-3">
              <CopyField label="API Base URL" value={API_BASE} />
              <CopyField label="Login Endpoint" value={`${API_BASE}/auth/login/`} />
              <CopyField label="Connections Endpoint" value={`${API_BASE}/connections/`} />
              <CopyField label="Batch Jobs Endpoint" value={`${API_BASE}/batch-jobs/`} />
              <div className="pt-1">
                <a href="http://localhost:8000/api/docs/" target="_blank" rel="noreferrer">
                  <Btn variant="ghost" size="sm">
                    <Key size={11} /> Open API Docs (Swagger)
                  </Btn>
                </a>
              </div>
            </div>
          </Section>

          {/* ── System Info ───────────────────── */}
          <Section title="System Info" icon={Server}>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
            >
              {[
                { label: "Platform Version", value: "v2.4.1" },
                { label: "Framework", value: "Next.js 14 + Django REST" },
                { label: "Database", value: "PostgreSQL 16" },
                { label: "Queue", value: "Celery + Redis 7" },
                { label: "Analytics", value: "Recharts" },
                { label: "Auth", value: "JWT (SimpleJWT)" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-md p-3"
                  style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
                >
                  <p
                    className="font-mono text-[9px] uppercase tracking-widest mb-1"
                    style={{ color: "var(--text3)" }}
                  >
                    {label}
                  </p>
                  <p className="font-mono text-xs font-bold" style={{ color: "var(--orange2)" }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Danger Zone ───────────────────── */}
          <Section title="Danger Zone" icon={AlertTriangle}>
            <div className="flex flex-col gap-0">
              <Row
                label="Sign Out"
                sub="End your current session on this device"
                action={
                  <Btn variant="danger" size="sm" onClick={logout}>
                    <Shield size={11} /> Sign Out
                  </Btn>
                }
              />
              <Row
                label="Clear Session Data"
                sub="Remove locally cached tokens and preferences"
                action={
                  !confirmClear ? (
                    <Btn variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
                      <Trash2 size={11} /> Clear Data
                    </Btn>
                  ) : (
                    <div className="flex gap-2">
                      <Btn variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                        Cancel
                      </Btn>
                      <Btn
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          localStorage.clear();
                          toast.success("Local data cleared. Redirecting...");
                          setTimeout(() => { window.location.href = "/login"; }, 1200);
                        }}
                      >
                        Confirm
                      </Btn>
                    </div>
                  )
                }
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}