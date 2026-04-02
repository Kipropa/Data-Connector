"use client";
import { useQuery } from "@tanstack/react-query";
import { connectionsApi, batchApi, filesApi } from "@/lib/api";
import { StatCard, Badge, Spinner, PageHeader, Btn } from "@/components/ui/index";
import { useAuthStore } from "@/store/auth";
import { Activity, Plug, Layers, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

const DB_COLORS: Record<string, string> = {
  postgresql: "#4169E1",
  mysql: "#F07800",
  mongodb: "#2ECC71",
  clickhouse: "#FF6B1A",
};

const DB_SHORT: Record<string, string> = {
  postgresql: "PG",
  mysql: "MY",
  mongodb: "MG",
  clickhouse: "CH",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: conns, isLoading: loadConn } = useQuery({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list().then((r) => r.data.results ?? r.data),
  });
  const { data: jobs, isLoading: loadJobs } = useQuery({
    queryKey: ["batch-jobs"],
    queryFn: () => batchApi.list().then((r) => r.data.results ?? r.data),
  });
  const { data: files } = useQuery({
    queryKey: ["files"],
    queryFn: () => filesApi.list().then((r) => r.data.results ?? r.data),
  });

  const activeConns = (conns ?? []).filter((c: any) => c.is_active && c.last_test_ok);
  const doneJobs = (jobs ?? []).filter((j: any) => j.status === "done");
  const totalRows = doneJobs.reduce((acc: number, j: any) => acc + (j.rows_extracted ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Dashboard"
        sub={`Welcome back, ${user?.name ?? "User"} · ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
      >
        <Link href="/dashboard/connections">
          <Btn variant="ghost" size="sm"><Plug size={11} /> New Connector</Btn>
        </Link>
        <Link href="/dashboard/batch-jobs">
          <Btn variant="primary" size="sm"><Layers size={11} /> Run Batch Job</Btn>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total Connections" value={loadConn ? "—" : (conns?.length ?? 0)} sub={`${activeConns.length} active`} accent="orange" />
          <StatCard label="Records Extracted" value={totalRows > 999 ? `${(totalRows / 1000).toFixed(1)}K` : totalRows} sub="all time" accent="green" />
          <StatCard label="Batch Jobs Run" value={loadJobs ? "—" : (jobs?.length ?? 0)} sub={`${doneJobs.length} successful`} accent="orange" />
          <StatCard label="Files Stored" value={files?.length ?? 0} sub="exports" accent="green" />
        </div>

        {/* Connectors grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest" style={{ color: "var(--text2)" }}>
              Active Connectors
            </h2>
            <Link href="/dashboard/connections">
              <Btn variant="ghost" size="sm">Manage All <ChevronRight size={10} /></Btn>
            </Link>
          </div>
          {loadConn ? (
            <Spinner />
          ) : (conns ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center" style={{ borderColor: "var(--border2)" }}>
              <p className="font-mono text-xs" style={{ color: "var(--text3)" }}>No connections yet.</p>
              <Link href="/dashboard/connections">
                <Btn variant="primary" size="sm" className="mt-3">Add Connection</Btn>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {(conns ?? []).slice(0, 8).map((conn: any) => (
                <div
                  key={conn.id}
                  className="rounded-lg border p-3 relative overflow-hidden transition-transform hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
                >
                  {/* Top accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: DB_COLORS[conn.db_type] ?? "var(--orange)" }}
                  />
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs mb-2"
                    style={{
                      background: `${DB_COLORS[conn.db_type]}20`,
                      color: DB_COLORS[conn.db_type] ?? "var(--orange2)",
                    }}
                  >
                    {DB_SHORT[conn.db_type] ?? "DB"}
                  </div>
                  <p className="font-display font-bold text-xs mb-0.5 truncate" style={{ color: "var(--text)" }}>
                    {conn.name}
                  </p>
                  <p className="font-mono text-[10px] mb-2 truncate" style={{ color: "var(--text3)" }}>
                    {conn.host}:{conn.port}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="status-dot"
                      style={{
                        background: conn.last_test_ok ? "var(--green)" : "var(--text3)",
                        boxShadow: conn.last_test_ok ? "0 0 5px var(--green)" : "none",
                        width: 5, height: 5, borderRadius: "50%", display: "inline-block"
                      }}
                    />
                    <span className="font-mono text-[9px]" style={{ color: conn.last_test_ok ? "var(--green2)" : "var(--text3)" }}>
                      {conn.last_test_ok ? "Connected" : "Untested"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent batch jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-xs uppercase tracking-widest" style={{ color: "var(--text2)" }}>
              Recent Batch Jobs
            </h2>
            <Link href="/dashboard/batch-jobs">
              <Btn variant="ghost" size="sm">View All <ChevronRight size={10} /></Btn>
            </Link>
          </div>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {loadJobs ? (
              <Spinner />
            ) : (jobs ?? []).length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-mono text-xs" style={{ color: "var(--text3)" }}>No batch jobs yet.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Connection</th>
                    <th>Status</th>
                    <th>Rows</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(jobs ?? []).slice(0, 5).map((job: any) => (
                    <tr key={job.id}>
                      <td style={{ color: "var(--orange3)" }}>#{job.id}</td>
                      <td>{job.connection_name}</td>
                      <td>
                        <Badge variant={
                          job.status === "done" ? "green" :
                          job.status === "running" ? "orange" :
                          job.status === "failed" ? "red" : "gray"
                        }>
                          {job.status}
                        </Badge>
                      </td>
                      <td>{job.rows_extracted ?? 0}</td>
                      <td>{new Date(job.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
