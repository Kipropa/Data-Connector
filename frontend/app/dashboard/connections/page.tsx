"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { connectionsApi } from "@/lib/api";
import { PageHeader, Btn, Modal, Input, Select, Badge, Spinner, Empty } from "@/components/ui/index";
import toast from "react-hot-toast";
import { Plug, Trash2, RefreshCw, Table, Plus } from "lucide-react";

const DB_TYPES = [
  { value: "postgresql", label: "PostgreSQL", defaultPort: 5432 },
  { value: "mysql",      label: "MySQL",      defaultPort: 3306 },
  { value: "mongodb",    label: "MongoDB",    defaultPort: 27017 },
  { value: "clickhouse", label: "ClickHouse", defaultPort: 9000 },
];

const DB_COLORS: Record<string, string> = {
  postgresql: "#4169E1", mysql: "#F07800", mongodb: "#2ECC71", clickhouse: "#FF6B1A",
};

const INIT_FORM = { name: "", db_type: "postgresql", host: "", port: 5432, database: "", username: "", password: "" };

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [tablesModal, setTablesModal] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState(INIT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: conns, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list().then((r) => r.data.results ?? r.data),
  });

  const { data: tables, isLoading: loadTables } = useQuery({
    queryKey: ["tables", tablesModal?.id],
    queryFn: () => connectionsApi.tables(tablesModal!.id).then((r) => r.data.tables),
    enabled: !!tablesModal,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => connectionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection created!");
      setShowModal(false);
      setForm(INIT_FORM);
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Failed to create connection"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => connectionsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["connections"] }); toast.success("Deleted"); },
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Required";
    if (!form.host) e.host = "Required";
    if (!form.database) e.database = "Required";
    if (!form.username) e.username = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleTest(id: number) {
    setTestingId(id);
    try {
      const res = await connectionsApi.test(id);
      if (res.data.ok) toast.success("Connection successful!");
      else toast.error(res.data.error ?? "Connection failed");
      qc.invalidateQueries({ queryKey: ["connections"] });
    } catch {
      toast.error("Test failed");
    } finally {
      setTestingId(null);
    }
  }

  function handleDbTypeChange(db_type: string) {
    const found = DB_TYPES.find((d) => d.value === db_type);
    setForm((f) => ({ ...f, db_type, port: found?.defaultPort ?? 5432 }));
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Connections" sub="Manage your database connectors">
        <Btn variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus size={11} /> New Connection
        </Btn>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <Spinner />
        ) : (conns ?? []).length === 0 ? (
          <Empty message="No connections configured yet. Add one to get started." />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(conns ?? []).map((conn: any) => (
              <div
                key={conn.id}
                className="rounded-lg border overflow-hidden transition-all hover:border-[color:var(--border2)]"
                style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
              >
                {/* Color bar */}
                <div className="h-0.5" style={{ background: DB_COLORS[conn.db_type] ?? "var(--orange)" }} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-display font-bold text-sm" style={{ color: "var(--text)" }}>{conn.name}</p>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text3)" }}>
                        {conn.db_type_display}
                      </p>
                    </div>
                    <Badge variant={conn.last_test_ok === true ? "green" : conn.last_test_ok === false ? "red" : "gray"}>
                      {conn.last_test_ok === true ? "● connected" : conn.last_test_ok === false ? "● failed" : "● untested"}
                    </Badge>
                  </div>

                  <div className="space-y-1 mb-4">
                    {[
                      ["Host", `${conn.host}:${conn.port}`],
                      ["Database", conn.database],
                      ["User", conn.username],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="font-mono text-[9px] w-14 shrink-0" style={{ color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1px" }}>{k}</span>
                        <span className="font-mono text-[10px] truncate" style={{ color: "var(--text2)" }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <Btn
                      size="sm"
                      variant="ghost"
                      loading={testingId === conn.id}
                      onClick={() => handleTest(conn.id)}
                    >
                      <RefreshCw size={10} /> Test
                    </Btn>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => setTablesModal({ id: conn.id, name: conn.name })}
                    >
                      <Table size={10} /> Tables
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      className="ml-auto"
                      onClick={() => deleteMut.mutate(conn.id)}
                    >
                      <Trash2 size={10} />
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setErrors({}); }} title="New Connection">
        <div className="flex flex-col gap-4">
          <Input label="Connection Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="e.g. Analytics DB" />
          <Select label="Database Type" value={form.db_type} onChange={(e) => handleDbTypeChange(e.target.value)}>
            {DB_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Host" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} error={errors.host} placeholder="localhost" />
            </div>
            <Input label="Port" type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: +e.target.value }))} />
          </div>
          <Input label="Database" value={form.database} onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))} error={errors.database} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} error={errors.username} />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Btn>
            <Btn variant="primary" className="flex-1" loading={createMut.isPending} onClick={() => validate() && createMut.mutate(form)}>
              Create Connection
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Tables modal */}
      <Modal open={!!tablesModal} onClose={() => setTablesModal(null)} title={`Tables — ${tablesModal?.name}`}>
        {loadTables ? <Spinner /> : (
          <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
            {(tables ?? []).map((t: string) => (
              <div key={t} className="flex items-center gap-2 px-3 py-2 rounded-md font-mono text-xs" style={{ background: "var(--bg3)", color: "var(--text2)" }}>
                <Table size={11} style={{ color: "var(--orange3)" }} /> {t}
              </div>
            ))}
            {(tables ?? []).length === 0 && <p className="font-mono text-xs text-center py-4" style={{ color: "var(--text3)" }}>No tables found</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
