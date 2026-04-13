"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi, usersApi } from "@/lib/api";
import {
  PageHeader,
  Spinner,
  Empty,
  Modal,
  Select,
  Btn,
} from "@/components/ui/index";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import { Download, Share2, FileJson, FileText } from "lucide-react";

export default function FilesPage() {
  const { user, token } = useAuthStore();
  const qc = useQueryClient();

  const [shareModal, setShareModal] = useState<any | null>(null);
  const [shareTarget, setShareTarget] = useState("");

  const { data: files = [], isLoading, error: filesError } = useQuery({
    queryKey: ["files"],
    queryFn: () =>
      filesApi
        .list()
        .then((r) => {
          const data = r?.data;
          // Handle common API shapes: results, data, or direct array
          if (Array.isArray(data)) return data;
          if (data?.results) return data.results;
          if (data?.data) return data.data;
          return data || [];
        })
        .catch((err) => {
          console.error("Files API error:", err);
          return [];
        }),
    enabled: !!token,
  });

  // Users Query (for sharing)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      usersApi
        .list()
        .then((r) => {
          const data = r?.data;
          if (Array.isArray(data)) return data;
          if (data?.results) return data.results;
          if (data?.data) return data.data;
          return data || [];
        })
        .catch(() => []),
    enabled: !!token && user?.role === "admin",
  });

  const shareMut = useMutation({
    mutationFn: ({ fileId, userId }: { fileId: number; userId: number }) =>
      filesApi.share(fileId, userId),
    onSuccess: () => {
      toast.success("File shared!");
      setShareModal(null);
      setShareTarget("");
    },
    onError: () => toast.error("Could not share file"),
  });

  async function handleDownload(file: any) {
    try {
      const res = await filesApi.download(file.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename || "download";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  }

  // Show error if files failed to load
  if (filesError) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-red-500">
        Failed to load files. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="File Storage"
        sub={`Exported files · ${user?.role === "admin" ? "Full access" : "Own + shared"}`}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <Spinner />
        ) : (files ?? []).length === 0 ? (
          <Empty message="No exported files yet. Submit data from the Data Grid to generate files." />
        ) : (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Filename</th>
                  <th>Rows</th>
                  <th>Source</th>
                  <th>Owner</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(files ?? []).map((file: any) => (
                  <tr key={file.id}>
                    <td>
                      {file.format === "json" ? (
                        <FileJson size={14} style={{ color: "var(--orange2)" }} />
                      ) : (
                        <FileText size={14} style={{ color: "var(--green2)" }} />
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-[10px]" style={{ color: "var(--text)" }}>
                        {file.filename}
                      </span>
                    </td>
                    <td>{file.row_count ?? "—"}</td>
                    <td>
                      <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                        {file.metadata?.source_connection ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                        {file.owner_email ?? "—"}
                      </span>
                    </td>
                    <td>{new Date(file.created_at).toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Btn size="sm" variant="ghost" onClick={() => handleDownload(file)}>
                          <Download size={10} /> Download
                        </Btn>
                        {(user?.role === "admin" || file.owner_email === user?.email) && (
                          <Btn
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShareModal(file);
                              setShareTarget("");
                            }}
                          >
                            <Share2 size={10} /> Share
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Modal - Kept exactly as in your original */}
      <Modal
        open={!!shareModal}
        onClose={() => {
          setShareModal(null);
          setShareTarget("");
        }}
        title={`Share: ${shareModal?.filename || "File"}`}
      >
        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs" style={{ color: "var(--text3)" }}>
            Grant another user access to download this file.
          </p>

          {isLoadingUsers ? (
            <div className="py-4 text-center">
              <Spinner />
              <p className="text-xs text-muted mt-2">Loading users...</p>
            </div>
          ) : (
            <Select
              label="Share With"
              value={shareTarget}
              onChange={(e) => setShareTarget(e.target.value)}
            >
              <option value="">Select user…</option>
              {(users ?? [])
                .filter((u: any) => u.email !== user?.email)
                .map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name || "Unnamed"} ({u.email})
                  </option>
                ))}
            </Select>
          )}

          <div className="flex gap-2">
            <Btn
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setShareModal(null);
                setShareTarget("");
              }}
            >
              Cancel
            </Btn>
            <Btn
              variant="primary"
              className="flex-1"
              disabled={!shareTarget}
              loading={shareMut.isPending}
              onClick={() =>
                shareMut.mutate({
                  fileId: shareModal?.id,
                  userId: Number(shareTarget),
                })
              }
            >
              <Share2 size={11} /> Share File
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}