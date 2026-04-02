"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { recordsApi, batchApi } from "@/lib/api";
import { PageHeader, Btn, Select, Badge, Spinner, Empty } from "@/components/ui/index";
import toast from "react-hot-toast";
import { Save, Send, Download, Search, CheckSquare, Square } from "lucide-react";
import Link from "next/link";

export default function DataGridPage() {
  const searchParams = useSearchParams();
  const initialJob = searchParams.get("job") ?? "";
  const [selectedJob, setSelectedJob] = useState(initialJob);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ recordId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: jobs } = useQuery({
    queryKey: ["batch-jobs"],
    queryFn: () => batchApi.list().then((r) => r.data.results ?? r.data),
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["records", selectedJob],
    queryFn: () => recordsApi.list(+selectedJob).then((r) => r.data.results ?? r.data),
    enabled: !!selectedJob,
  });

  const patchMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      recordsApi.patch(id, { edited_data: data, is_edited: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["records", selectedJob] }),
  });

  const submitMut = useMutation({
    mutationFn: ({ ids, format }: { ids: number[]; format: "json" | "csv" }) =>
      recordsApi.submit(ids, format),
    onSuccess: (res) => {
      toast.success(`Submitted ${res.data.submitted} rows — file saved!`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["records", selectedJob] });
      qc.invalidateQueries({ queryKey: ["files"] });
    },
    onError: () => toast.error("Submit failed"),
  });

  const doneJobs = (jobs ?? []).filter((j: any) => j.status === "done");
  const activeJob = (jobs ?? []).find((j: any) => j.id === +selectedJob);

  // Columns: union of all keys across records
  const allRows: any[] = (records ?? []).map((r: any) => r.effective_data ?? r.data ?? {});
  const columns = allRows.length > 0
    ? Array.from(new Set(allRows.flatMap(Object.keys))).slice(0, 10)
    : [];

  // Filter rows by search
  const filteredRecords: any[] = (records ?? []).filter((r: any) => {
    if (!search) return true;
    const row = r.effective_data ?? r.data ?? {};
    return Object.values(row).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
  });

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r: any) => r.id)));
    }
  }

  function startEdit(recordId: number, field: string, currentVal: any) {
    setEditingCell({ recordId, field });
    setEditValue(String(currentVal ?? ""));
  }

  function commitEdit(record: any) {
    if (!editingCell) return;
    const updatedData = { ...(record.effective_data ?? record.data ?? {}), [editingCell.field]: editValue };
    patchMut.mutate({ id: record.id, data: updatedData });
    setEditingCell(null);
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Data Grid" sub="View, edit and submit extracted data">
        <Select
          value={selectedJob}
          onChange={(e) => { setSelectedJob(e.target.value); setSelectedIds(new Set()); }}
        >
          <option value="">Select batch job…</option>
          {doneJobs.map((j: any) => (
            <option key={j.id} value={j.id}>
              #{j.id} · {j.connection_name} · {j.rows_extracted} rows
            </option>
          ))}
        </Select>
      </PageHeader>

      {/* Toolbar */}
      {selectedJob && (
        <div
          className="flex items-center gap-3 px-6 py-3"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}
        >
          {activeJob && (
            <Badge variant="green">
              {activeJob.connection_name} · {activeJob.db_type}
            </Badge>
          )}
          <div
            className="flex items-center gap-2 flex-1 max-w-xs px-3 py-1.5 rounded-md border"
            style={{ background: "var(--bg3)", borderColor: "var(--border2)" }}
          >
            <Search size={11} style={{ color: "var(--text3)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rows…"
              className="bg-transparent outline-none text-xs font-mono flex-1"
              style={{ color: "var(--text)" }}
            />
          </div>
          <p className="font-mono text-[10px] ml-auto" style={{ color: "var(--text3)" }}>
            {selectedIds.size > 0 ? `${selectedIds.size} selected · ` : ""}
            {filteredRecords.length} rows
          </p>
          {selectedIds.size > 0 && (
            <>
              <Btn
                size="sm"
                variant="ghost"
                loading={submitMut.isPending}
                onClick={() => submitMut.mutate({ ids: Array.from(selectedIds), format: "csv" })}
              >
                <Download size={11} /> CSV
              </Btn>
              <Btn
                size="sm"
                variant="green"
                loading={submitMut.isPending}
                onClick={() => submitMut.mutate({ ids: Array.from(selectedIds), format: "json" })}
              >
                <Send size={11} /> Submit &amp; Save JSON
              </Btn>
            </>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {!selectedJob ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--bg3)" }}>
              <Search size={20} style={{ color: "var(--text3)" }} />
            </div>
            <p className="font-mono text-xs" style={{ color: "var(--text3)" }}>
              Select a completed batch job to view data
            </p>
            {doneJobs.length === 0 && (
              <Link href="/dashboard/batch-jobs">
                <Btn variant="primary" size="sm">Go to Batch Jobs</Btn>
              </Link>
            )}
          </div>
        ) : isLoading ? (
          <Spinner />
        ) : filteredRecords.length === 0 ? (
          <Empty message="No records found." />
        ) : (
          <table className="data-table" style={{ minWidth: "max-content" }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <button onClick={toggleAll} style={{ color: "var(--text3)" }}>
                    {selectedIds.size === filteredRecords.length
                      ? <CheckSquare size={13} style={{ color: "var(--orange2)" }} />
                      : <Square size={13} />}
                  </button>
                </th>
                <th>#</th>
                {columns.map((col) => <th key={col}>{col}</th>)}
                <th>Edited</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record: any) => {
                const row = record.effective_data ?? record.data ?? {};
                const isSelected = selectedIds.has(record.id);
                return (
                  <tr key={record.id} className={isSelected ? "selected" : ""}>
                    <td>
                      <button onClick={() => toggleSelect(record.id)} style={{ color: isSelected ? "var(--orange2)" : "var(--text3)" }}>
                        {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                      </button>
                    </td>
                    <td style={{ color: "var(--orange3)" }}>{record.row_index + 1}</td>
                    {columns.map((col) => {
                      const isEditing = editingCell?.recordId === record.id && editingCell?.field === col;
                      return (
                        <td key={col}>
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(record)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(record);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="cell-editing w-full min-w-[80px] px-1.5 py-0.5"
                              style={{ fontFamily: "DM Mono, monospace", fontSize: 11 }}
                            />
                          ) : (
                            <span
                              className="cursor-text block hover:bg-[rgba(255,107,26,0.06)] rounded px-1 -mx-1"
                              onDoubleClick={() => startEdit(record.id, col, row[col])}
                              title="Double-click to edit"
                            >
                              {String(row[col] ?? "")}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      {record.is_edited && (
                        <Badge variant="orange">edited</Badge>
                      )}
                      {record.submitted && (
                        <Badge variant="green">submitted</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {selectedJob && filteredRecords.length > 0 && (
        <div
          className="flex items-center gap-4 px-6 py-2.5 font-mono text-[10px]"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text3)" }}
        >
          <span><b style={{ color: "var(--orange3)" }}>{filteredRecords.length}</b> rows shown</span>
          <span><b style={{ color: "var(--green2)" }}>{(records ?? []).filter((r: any) => r.is_edited).length}</b> edited</span>
          <span><b style={{ color: "var(--text2)" }}>{(records ?? []).filter((r: any) => r.submitted).length}</b> submitted</span>
          <span className="ml-auto">Double-click any cell to edit · Enter to save · Esc to cancel</span>
        </div>
      )}
    </div>
  );
}
