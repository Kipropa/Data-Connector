"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@dataconnect.io");
  const [password, setPassword] = useState("admin1234");
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      const { access } = res.data;

      setAuth(null, access);

      const me = await authApi.me();

      setAuth(me.data, access);

      toast.success("Welcome back!");
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Background grid decoration */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "linear-gradient(var(--border2) 1px, transparent 1px), linear-gradient(90deg, var(--border2) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-300 mb-4">
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2v10M4 4l6 6M10 4l-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-2xl" style={{ color: "var(--text)" }}>
            DataConnect
          </h1>
          <p className="font-mono text-[11px] mt-1" style={{ color: "var(--text3)", letterSpacing: "2px" }}>
            SIGN IN TO YOUR WORKSPACE
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{ background: "var(--bg2)", borderColor: "var(--border2)" }}
        >
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px]" style={{ color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2.5 rounded-md text-xs font-mono outline-none border focus:border-orange-400 transition-colors"
              style={{ background: "var(--bg3)", color: "var(--text)", borderColor: "var(--border2)" }}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px]" style={{ color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2.5 rounded-md text-xs font-mono outline-none border focus:border-orange-400 transition-colors"
              style={{ background: "var(--bg3)", color: "var(--text)", borderColor: "var(--border2)" }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2.5 rounded-md font-display font-bold text-xs text-white transition-all mt-1 disabled:opacity-50"
            style={{ background: "var(--orange)" }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center font-mono text-[10px] mt-4" style={{ color: "var(--text3)" }}>
          DataConnect Platform · v2.4.1
        </p>
      </div>
    </div>
  );
}
