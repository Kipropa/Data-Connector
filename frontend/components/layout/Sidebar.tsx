"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import clsx from "clsx";
import {
  LayoutDashboard, Plug, Database, FileText, Users, Settings,
  Activity, Layers, Sun, Moon, LogOut, ChevronRight
} from "lucide-react";

const navGroups = [
  {
    label: "overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/analytics", label: "Analytics", icon: Activity },
    ],
  },
  {
    label: "connectors",
    items: [
      { href: "/dashboard/connections", label: "Connections", icon: Plug },
      { href: "/dashboard/batch-jobs", label: "Batch Jobs", icon: Layers },
    ],
  },
  {
    label: "data",
    items: [
      { href: "/dashboard/data-grid", label: "Data Grid", icon: Database },
      { href: "/dashboard/files", label: "File Storage", icon: FileText },
    ],
  },
  {
    label: "admin",
    items: [
      { href: "/dashboard/users", label: "Users & Roles", icon: Users },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  return (
    <aside
      style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)" }}
      className="w-56 flex flex-col flex-shrink-0 h-screen"
    >
      {/* Logo */}
      <div
        style={{ borderBottom: "1px solid var(--border)" }}
        className="px-4 py-4 flex items-center gap-3"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-300 shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M7 2v10M4 4l6 6M10 4l-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="font-display font-bold text-sm leading-none" style={{ color: "var(--text)" }}>
            DataConnect
          </p>
          <p className="font-mono text-[9px] mt-0.5" style={{ color: "var(--text3)", letterSpacing: "2px" }}>
            v2.4.1
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <p
              className="font-mono text-[9px] px-4 py-2"
              style={{ color: "var(--text3)", letterSpacing: "2px", textTransform: "uppercase" }}
            >
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-2.5 px-4 py-2 text-xs font-semibold font-body transition-all border-l-2",
                    active
                      ? "border-orange-400 text-orange-300"
                      : "border-transparent hover:border-transparent"
                  )}
                  style={{
                    color: active ? "var(--orange2)" : "var(--text2)",
                    background: active ? "rgba(255,107,26,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg3)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Icon size={13} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User area */}
      <div style={{ borderTop: "1px solid var(--border)" }} className="p-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-green-400 flex items-center justify-center text-white text-[10px] font-bold font-display shrink-0">
          {user?.name?.slice(0, 2).toUpperCase() || "DC"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-xs truncate" style={{ color: "var(--text)" }}>
            {user?.name || "User"}
          </p>
          <p className="font-mono text-[9px]" style={{ color: "var(--orange3)", letterSpacing: "1px" }}>
            {user?.role?.toUpperCase()}
          </p>
        </div>
        <button
          onClick={toggle}
          className="p-1.5 rounded-md transition-colors"
          style={{ border: "1px solid var(--border2)", color: "var(--text3)" }}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={11} /> : <Moon size={11} />}
        </button>
        <button
          onClick={logout}
          className="p-1.5 rounded-md transition-colors"
          style={{ border: "1px solid var(--border2)", color: "var(--text3)" }}
          title="Logout"
        >
          <LogOut size={11} />
        </button>
      </div>
    </aside>
  );
}
