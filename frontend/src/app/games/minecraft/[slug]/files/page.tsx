"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api, McServer } from "@/lib/api";
import { t } from "@/lib/lang";
import { Loader2, ArrowLeft, Upload as UploadIcon, Trash2, Folder, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialogRoot,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogActions,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";

type FileTab = "mods" | "datapacks" | "resourcepacks";
type FileInfo = { name: string; size: number; modified: string };

function formatFileSize(bytes: number): string {
  if (typeof bytes !== "number" || isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function FileManagerPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  const [tab, setTab] = useState<FileTab>("mods");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [duplicateDialogState, setDuplicateDialogState] = useState<{
    duplicates: File[];
    nonDuplicates: File[];
    allFiles: File[];
  } | null>(null);
  const [servers, setServers] = useState<McServer[]>([]);
  const [sourceSlug, setSourceSlug] = useState("");
  const [sourceFiles, setSourceFiles] = useState<FileInfo[]>([]);
  const [selectedSourceFile, setSelectedSourceFile] = useState("");
  const [copying, setCopying] = useState(false);

  const refreshFiles = (tName: FileTab) => {
    if (!slug) return;
    setLoading(true);
    api.minecraft.servers.files.list(slug, tName).then((res) => {
      setFiles(Array.isArray(res) ? res : []);
    }).catch((e) => {
      console.error(e);
      setFiles([]);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    api.minecraft.servers.list().then(setServers).catch(console.error);
  }, []);

  useEffect(() => {
    if (!slug) return;
    api.minecraft.servers.files.list(slug, tab).then((res) => {
      setFiles(Array.isArray(res) ? res : []);
    }).catch((e) => {
      console.error(e);
      setFiles([]);
    }).finally(() => {
      setLoading(false);
    });
  }, [slug, tab]);

  useEffect(() => {
    if (!sourceSlug) {
      return;
    }
    api.minecraft.servers.files.list(sourceSlug, tab).then((res) => {
      setSourceFiles(Array.isArray(res) ? res : []);
      setSelectedSourceFile("");
    }).catch(() => {
      setSourceFiles([]);
      setSelectedSourceFile("");
    });
  }, [sourceSlug, tab]);

  const handleSourceSlugChange = (val: string) => {
    setSourceSlug(val);
    if (!val) {
      setSourceFiles([]);
      setSelectedSourceFile("");
    }
  };

  const executeUpload = async (fileList: File[]) => {
    if (fileList.length === 0 || !slug) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: fileList.length });
    try {
      const res = await api.minecraft.servers.files.upload(
        slug,
        tab,
        fileList,
        (current, total) => setUploadProgress({ current, total })
      );
      if (res.errors && res.errors.length > 0) {
        alert(
          `${t("Uploaded")} ${res.count}/${fileList.length}. ${res.errors.length} ${t("failed")}:\n` +
          res.errors.map(err => `${err.file}: ${err.error}`).join("\n")
        );
      }
      refreshFiles(tab);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0 || !slug) return;
    const fileList = Array.from(selected);
    e.target.value = "";

    const existingNames = new Set(files.map((f) => f.name.toLowerCase()));
    const duplicates = fileList.filter((f) => existingNames.has(f.name.toLowerCase()));
    const nonDuplicates = fileList.filter((f) => !existingNames.has(f.name.toLowerCase()));

    if (duplicates.length > 0) {
      setDuplicateDialogState({
        duplicates,
        nonDuplicates,
        allFiles: fileList,
      });
    } else {
      executeUpload(fileList);
    }
  };

  const handleReplaceDuplicates = () => {
    if (!duplicateDialogState) return;
    const filesToUpload = duplicateDialogState.allFiles;
    setDuplicateDialogState(null);
    executeUpload(filesToUpload);
  };

  const handleSkipDuplicates = () => {
    if (!duplicateDialogState) return;
    const filesToUpload = duplicateDialogState.nonDuplicates;
    setDuplicateDialogState(null);
    if (filesToUpload.length === 0) {
      alert(t("No new files to upload."));
      return;
    }
    executeUpload(filesToUpload);
  };

  const handleDelete = async (filename: string) => {
    if (!slug || !confirm(t("Delete") + " " + filename + "?")) return;
    try {
      await api.minecraft.servers.files.delete(slug, tab, filename);
      refreshFiles(tab);
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const handleCopy = async () => {
    if (!slug || !sourceSlug || !selectedSourceFile) return;
    setCopying(true);
    try {
      await api.minecraft.servers.files.copy(slug, tab, sourceSlug, selectedSourceFile);
      setSelectedSourceFile("");
      refreshFiles(tab);
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/games/minecraft/${slug}`} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-black text-zinc-100 flex items-center gap-2">
            <Folder className="size-6 text-brand" />
            {t("File Manager")}
          </h1>
          <p className="text-sm text-zinc-400">{slug}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        {(["mods", "datapacks", "resourcepacks"] as FileTab[]).map((tName) => (
          <button
            key={tName}
            onClick={() => setTab(tName)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === tName ? "bg-brand text-zinc-950" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"}`}
          >
            {t(tName.charAt(0).toUpperCase() + tName.slice(1))}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold cursor-pointer transition-colors w-fit">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
          {uploadProgress ? `${t("Uploading files...")} (${uploadProgress.current}/${uploadProgress.total})` : t("Upload files")}
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sourceSlug} onValueChange={(v) => handleSourceSlugChange(v ?? "")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("Copy from server")} />
            </SelectTrigger>
            <SelectContent>
              {servers.filter(s => s.slug !== slug).map(s => (
                <SelectItem key={s.slug} value={s.slug}>{s.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {sourceSlug && sourceFiles.length > 0 && (
            <>
              <Select value={selectedSourceFile} onValueChange={(v) => setSelectedSourceFile(v ?? "")}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select file" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFiles.map(sf => (
                    <SelectItem key={sf.name} value={sf.name}>{sf.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleCopy} disabled={!selectedSourceFile || copying} className="bg-brand text-zinc-950 font-bold hover:bg-brand/90">
                {copying ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4 mr-1.5" />}
                {t("Copy")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500">Loading...</div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">{t("No files yet.")}</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Size</th>
                <th className="px-6 py-3 font-semibold">Modified</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {files.map((f) => (
                <tr key={f.name} className="hover:bg-zinc-800/50">
                  <td className="px-6 py-3 font-medium text-zinc-200">{f.name}</td>
                  <td className="px-6 py-3 text-zinc-400" title={typeof f.size === "number" ? `${f.size.toLocaleString()} bytes` : undefined}>{formatFileSize(f.size)}</td>
                  <td className="px-6 py-3 text-zinc-400">{f.modified ? new Date(f.modified).toLocaleString() : "-"}</td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <Button size="icon" variant="ghost" className="size-8 text-red-400 hover:bg-red-500/20" onClick={() => handleDelete(f.name)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialogRoot
        open={duplicateDialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDuplicateDialogState(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogTitle className="text-zinc-100 font-bold text-lg">
            {duplicateDialogState && duplicateDialogState.duplicates.length === 1
              ? t("Duplicate file detected")
              : t("Duplicate files detected")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-zinc-400 mt-2 space-y-3">
            <p>
              {duplicateDialogState && duplicateDialogState.duplicates.length === 1
                ? t("The following file already exists on the server. What would you like to do?")
                : t("The following files already exist on the server. What would you like to do?")}
            </p>
            <div className="max-h-36 overflow-y-auto bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-zinc-300 font-mono divide-y divide-white/5">
              {duplicateDialogState?.duplicates.map((f) => (
                <div key={f.name} className="py-1 flex items-center justify-between">
                  <span className="truncate pr-2">{f.name}</span>
                  <span className="text-zinc-500 shrink-0">{formatFileSize(f.size)}</span>
                </div>
              ))}
            </div>
          </AlertDialogDescription>
          <AlertDialogActions className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <AlertDialogClose
              render={
                <Button variant="ghost" className="text-zinc-400 hover:text-zinc-200">
                  {t("Cancel")}
                </Button>
              }
            />
            <Button
              variant="outline"
              onClick={handleSkipDuplicates}
              className="border-white/10 text-zinc-300 hover:bg-zinc-800"
            >
              {duplicateDialogState?.duplicates.length === 1
                ? t("Skip duplicate")
                : t("Skip duplicates")}
            </Button>
            <Button
              onClick={handleReplaceDuplicates}
              className="bg-brand text-zinc-950 font-bold hover:bg-brand/90"
            >
              {t("Replace existing")}
            </Button>
          </AlertDialogActions>
        </AlertDialogPopup>
      </AlertDialogRoot>
    </div>
  );
}
