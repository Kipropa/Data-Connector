"use client";

import { useQuery } from "@tanstack/react-query";
import { batchApi, connectionsApi, filesApi } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Layers, FileText, Plug, Database, Loader2 } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["#f97316", "#4ade80", "#f87171", "#60a5fa", "#fbbf24"];

export default function AnalyticsClient() {
  const { data: jobsObj, isLoading: loadingJobs } = useQuery({ queryKey: ["jobs"], queryFn: batchApi.list });
  const { data: connsObj, isLoading: loadingConns } = useQuery({ queryKey: ["conns"], queryFn: connectionsApi.list });
  const { data: filesObj, isLoading: loadingFiles } = useQuery({ queryKey: ["files"], queryFn: filesApi.list });

  if (loadingJobs || loadingConns || loadingFiles) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[var(--text3)] flex-col gap-3">
        <Loader2 size={24} className="animate-spin text-orange-400" />
        <p className="text-xs uppercase tracking-wider font-mono">Loading telemetry...</p>
      </div>
    );
  }

  const jobs = Array.isArray(jobsObj?.data?.results) ? jobsObj.data.results : (Array.isArray(jobsObj?.data) ? jobsObj.data : []);
  const connections = Array.isArray(connsObj?.data?.results) ? connsObj.data.results : (Array.isArray(connsObj?.data) ? connsObj.data : []);
  const files = Array.isArray(filesObj?.data?.results) ? filesObj.data.results : (Array.isArray(filesObj?.data) ? filesObj.data : []);

  console.log("[Analytics Debug]", { 
    jobsType: typeof jobs, 
    isJobsArray: Array.isArray(jobs),
    jobsCount: jobs?.length,
    jobsData: jobs 
  });

  // Derived stats
  const totalJobs = jobs.length;
  const totalFiles = files.length;
  const totalRowsExtracted = jobs.reduce((sum: number, j: any) => sum + (j.rows_extracted || 0), 0);
  const totalConnections = connections.length;

  // Chart data: Jobs by connection
  const connMap: Record<string, number> = {};
  jobs.forEach((j: any) => {
    const cname = connections.find((c: any) => c.id === j.connection)?.name || `Conn #${j.connection}`;
    connMap[cname] = (connMap[cname] || 0) + 1;
  });
  const pieData = Object.entries(connMap).map(([name, value]) => ({ name, value }));

  // Chart data: Rows extracted over time (by job id / date)
  const barData = jobs
    .map((j: any) => ({
      name: j.started_at ? format(new Date(j.started_at), "MMM dd HH:mm") : `Job ${j.id}`,
      rows: j.rows_extracted || 0,
    }))
    .slice(-10); // Last 10 jobs

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold" style={{ color: "var(--text)" }}>Platform Analytics</h1>
        <p className="text-xs mt-1" style={{ color: "var(--text3)" }}>Overview of data extractions, exports, and connectivity.</p>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Jobs" value={totalJobs} icon={Layers} iconClass="text-orange-500 bg-orange-500/10" />
        <StatCard title="Rows Extracted" value={totalRowsExtracted} icon={Database} iconClass="text-green-500 bg-green-500/10" />
        <StatCard title="Stored Exports" value={totalFiles} icon={FileText} iconClass="text-blue-500 bg-blue-500/10" />
        <StatCard title="Active Connections" value={totalConnections} icon={Plug} iconClass="text-purple-500 bg-purple-500/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="p-5 rounded-xl shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--bg2)" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text2)" }}>Recent Extractions (Rows)</h2>
          <div className="h-64">
            {jobs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text3)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text3)" }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: "var(--bg3)" }} 
                    contentStyle={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8 }} 
                  />
                  <Bar dataKey="rows" fill="var(--orange)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs" style={{ color: "var(--text3)" }}>
                No extraction data
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="p-5 rounded-xl shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--bg2)" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text2)" }}>Jobs by Connection</h2>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} 
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs" style={{ color: "var(--text3)" }}>
                No connection data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, iconClass }: any) {
  return (
    <div 
      className="p-5 rounded-xl shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1"
      style={{ border: "1px solid var(--border)", background: "var(--bg2)" }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--text3)" }}>
          {title}
        </p>
        <p className="text-2xl font-display font-bold leading-none" style={{ color: "var(--text)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
