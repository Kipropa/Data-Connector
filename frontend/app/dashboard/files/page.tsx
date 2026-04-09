"use client";

import { useState, useEffect } from "react";
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
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [shareModal, setShareModal] = useState<any | null>(null);
  const [shareTarget, setShareTarget] = useState("");

  // ────────────────────────────── FILES QUERY ──────────────────────────────
  const {
    data: files = [],
    isLoading,
    error: filesError,
  } = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const res = await filesApi.list();
      const rawData = res?.data ?? res;

      console.log("[Files Debug] Raw API response:", rawData); // ← Helpful for debugging

      // Normalize all possible shapes
      let normalized = rawData;

      if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
        normalized =
          rawData.results ??
          rawData.rows ??
          rawData.data ??
          rawData.items ??
          rawData.files ??
          rawData;
      }

      if (Array.isArray(normalized)) {
        return normalized;
      }

      console.warn("[Files Debug] API did NOT return array. Received:", typeof normalized, normalized);
      return []; // Safe fallback
    },
    retry: 1,
  });

  // Debug log on every render (remove in production)
  useEffect(() => {
    console.log("[Files Debug] Final files value →", {
      isArray: Array.isArray(files),
      length: files?.length,
      type: typeof files,
      sample: files?.[0],
    });
  }, [files]);

  // ────────────────────────────── USERS QUERY ──────────────────────────────
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await usersApi.list();
      const raw = res?.data ?? res;
      let normalized = raw;

      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        normalized = raw.results ?? raw.rows ?? raw.data ?? raw.items ?? raw;
      }
      return Array.isArray(normalized) ? normalized : [];
    },
    enabled: user?.role === "admin",
  });

  // ────────────────────────────── MUTATION & HANDLERS ──────────────────────────────
  const shareMut = useMutation({
    mutationFn: ({ fileId, userId }: { fileId: number; userId: number }) =>
      filesApi.share(fileId, userId),
    onSuccess: () => {
      toast.success("File shared successfully!");
      setShareModal(null);
      setShareTarget("");
    },
    onError: () => toast.error("Failed to share file"),
  });

  async function handleDownload(file: any) {
    try {
      const res = await filesApi.download(file.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename || "file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Download failed");
      console.error(err);
    }
  }

  // ────────────────────────────── ERROR UI ──────────────────────────────
  if (filesError) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-red-500">
        <div className="text-center">
          <p className="font-medium">Failed to load files</p>
          <p className="text-sm mt-2">{filesError.message || "Unknown error"}</p>
        </div>
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
        ) : !Array.isArray(files) || files.length === 0 ? (
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
                {files.map((file: any) => (
                  <tr key={file?.id ?? Math.random()}>
                    <td>
                      {file?.format === "json" ? (
                        <FileJson size={14} style={{ color: "var(--orange2)" }} />
                      ) : (
                        <FileText size={14} style={{ color: "var(--green2)" }} />
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-[10px]" style={{ color: "var(--text)" }}>
                        {file?.filename ?? "—"}
                      </span>
                    </td>
                    <td>{file?.row_count ?? "—"}</td>
                    <td>
                      <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                        {file?.metadata?.source_connection ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                        {file?.owner_email ?? "—"}
                      </span>
                    </td>
                    <td>
                      {file?.created_at ? new Date(file.created_at).toLocaleString() : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Btn size="sm" variant="ghost" onClick={() => handleDownload(file)}>
                          <Download size={10} /> Download
                        </Btn>
                        {(user?.role === "admin" || file?.owner_email === user?.email) && (
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

      {/* Share Modal remains the same as before */}
      <Modal
        open={!!shareModal}
        onClose={() => {
          setShareModal(null);
          setShareTarget("");
        }}
        title={`Share: ${shareModal?.filename || "File"}`}
      >
        {/* ... same modal content as previous version ... */}
        {/* (copy the modal from the last code I gave you) */}
      </Modal>
    </div>
  );
}