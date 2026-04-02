"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { batchApi, connectionsApi } from "@/lib/api";
import { PageHeader, Btn, Modal, Select, Input, Badge, Spinner, Empty } from "@/components/ui/index";
import toast from "react-hot-toast";
import { Plus, Trash2, RefreshCw, Database } from "lucide-react";
import Link from "next/link";

const STATUS_VARIANT: Record<string, any> = {
  done: "green", running: "orange", failed: "red", pending: "gray",
};

export default function BatchJobsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ connection: "", query: "SELECT * FROM users LIMIT 100", batch_size: 100 });

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["batch-jobs"],
    queryFn: () => batchApi.list().then((r) => r.data.results ?? r.data),
    refetchInterval: 5000, // poll for running jobs
  });

  const { data: conns } = useQuery({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list().then((r) => r.data.results ?? r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => batchApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batch-jobs"] });
      toast.success("Batch job queued!");
      setShowModal(false);
      setForm({ connection: "", query: "SELECT * FROM users LIMIT 100", batch_size: 100 });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Failed to create job"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => batchApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["batch-jobs"] }); toast.success("Deleted"); },
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Batch Jobs" sub="Extract data in configurable batches">
        <Btn variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus size={11} /> New Batch Job
        </Btn>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? <Spinner /> : (jobs ?? []).length === 0 ? (
          <Empty message="No batch jobs yet. Create one to start extracting data." />
        ) : (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Connection</th>
                  <th>DB Type</th>
                  <th>Query</th>
                  <th>Batch Size</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(jobs ?? []).map((job: any) => (
                  <tr key={job.id}>
                    <td style={{ color: "var(--orange3)" }}>#{job.id}</td>
                    <td>{job.connection_name}</td>
                    <td><span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>{job.db_type}</span></td>
                    <td>
                      <span className="font-mono text-[10px] max-w-[180px] truncate block" title={job.query} style={{ color: "var(--text2)" }}>
                        {job.query}
                      </span>
                    </td>
                    <td>{job.batch_size}</td>
                    <td>
                      <Badge variant={STATUS_VARIANT[job.status] ?? "gray"}>
                        {job.status === "running" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse mr-1" />}
                        {job.status}
                      </Badge>
                    </td>
                    <td>{job.rows_extracted ?? 0}</td>
                    <td>{new Date(job.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {job.status === "done" && (
                          <Link href={`/dashboard/data-grid?job=${job.id}`}>
                            <Btn size="sm" variant="ghost"><Database size={10} /> View</Btn>
                          </Link>
                        )}
                        <Btn size="sm" variant="danger" onClick={() => deleteMut.mutate(job.id)}>
                          <Trash2 size={10} />
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Batch Job">
        <div className="flex flex-col gap-4">
          <Select
            label="Connection"
            value={form.connection}
            onChange={(e) => setForm((f) => ({ ...f, connection: e.target.value }))}
          >
            <option value="">Select connection…</option>
            {(conns ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} ({c.db_type})</option>
            ))}
          </Select>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px]" style={{ color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Query / Collection
            </label>
            <textarea
              rows={4}
              value={form.query}
              onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
              className="px-3 py-2 rounded-md text-xs font-mono outline-none border focus:border-orange-400 resize-none"
              style={{ background: "var(--bg3)", color: "var(--text)", borderColor: "var(--border2)" }}
              placeholder="SELECT * FROM users&#10;-- or for MongoDB: events"
            />
            <p className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>
              SQL for PG/MySQL/ClickHouse · Collection name or JSON for MongoDB
            </p>
          </div>

          <Input
            label="Batch Size"
            type="number"
            value={form.batch_size}
            onChange={(e) => setForm((f) => ({ ...f, batch_size: +e.target.value }))}
          />

          <div className="flex gap-2 pt-2">
            <Btn variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              className="flex-1"
              loading={createMut.isPending}
              disabled={!form.connection || !form.query}
              onClick={() => createMut.mutate({ ...form, connection: +form.connection })}
            >
              Run Batch Job
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
