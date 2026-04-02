"use client";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { PageHeader, Badge, Spinner, Empty } from "@/components/ui/index";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list().then((r) => r.data.results ?? r.data),
    enabled: user?.role === "admin",
  });

  if (user?.role !== "admin") return null;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Users & Roles" sub="Manage platform access and permissions" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* RBAC Info card */}
        <div className="rounded-lg border p-4 mb-6" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
          <p className="font-display font-bold text-xs mb-3" style={{ color: "var(--text2)" }}>Access Control Model</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                role: "Admin",
                color: "var(--orange2)",
                perms: [
                  "Full access to all connections",
                  "View all users' batch jobs",
                  "Download any stored file",
                  "Share any file",
                  "Manage users",
                ],
              },
              {
                role: "User",
                color: "var(--green2)",
                perms: [
                  "Own connections only",
                  "Own batch jobs only",
                  "Own files + shared files",
                  "Share own files",
                  "Update own profile",
                ],
              },
            ].map(({ role, color, perms }) => (
              <div key={role} className="rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--bg3)" }}>
                <p className="font-display font-bold text-xs mb-2" style={{ color }}>{role}</p>
                <ul className="space-y-1">
                  {perms.map((p) => (
                    <li key={p} className="flex items-center gap-2 font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                      <span style={{ color }}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? <Spinner /> : (users ?? []).length === 0 ? (
          <Empty message="No users found." />
        ) : (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold font-display"
                          style={{
                            background: "linear-gradient(135deg, var(--orange), var(--green))",
                            fontSize: 9,
                          }}
                        >
                          {u.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td><span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>{u.email}</span></td>
                    <td>
                      <Badge variant={u.role === "admin" ? "orange" : "green"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={u.is_active ? "green" : "gray"}>
                        {u.is_active ? "active" : "inactive"}
                      </Badge>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
