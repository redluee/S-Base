import { Trash2, Puzzle, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/lang";
import { StagedFile, formatFileSize } from "./staged-files";

interface FilesStepProps {
  stagedFiles: StagedFile[];
  fileTab: "mods" | "datapacks" | "resourcepacks";
  setFileTab: (v: "mods" | "datapacks" | "resourcepacks") => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "mods" | "datapacks" | "resourcepacks") => void;
  removeStagedFile: (filename: string, type: "mods" | "datapacks" | "resourcepacks") => void;
}

export function FilesStep({ stagedFiles, fileTab, setFileTab, handleFileUpload, removeStagedFile }: FilesStepProps) {
  return (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setFileTab("mods")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                  fileTab === "mods" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Puzzle className="size-3.5" />
                Mods (.jar)
              </button>
              <button
                type="button"
                onClick={() => setFileTab("datapacks")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                  fileTab === "datapacks" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Datapacks (.zip)
              </button>
              <button
                type="button"
                onClick={() => setFileTab("resourcepacks")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                  fileTab === "resourcepacks" ? "bg-zinc-800 text-brand shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Resourcepacks (.zip)
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative border-2 border-dashed border-white/10 hover:border-brand/50 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  multiple
                  accept={fileTab === "mods" ? ".jar" : ".zip"}
                  onChange={(e) => handleFileUpload(e, fileTab)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadIcon className="size-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-zinc-200">
                  {fileTab === "mods" ? t("Upload Mods (.jar)") : fileTab === "datapacks" ? t("Upload Datapacks (.zip)") : t("Upload Resourcepacks (.zip)")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Sleep bestanden hierheen of klik om te uploaden</p>
              </div>

              {/* Bestandenlijst van actieve fileTab */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                  {t("Files")} ({stagedFiles.filter((f) => f.type === fileTab).length})
                </div>

                {stagedFiles.filter((f) => f.type === fileTab).length === 0 ? (
                  <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-zinc-500">
                    {t("No files added to this template yet.")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stagedFiles
                      .filter((f) => f.type === fileTab)
                      .map((sf) => (
                        <div
                          key={sf.file.name}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-white/5 text-sm"
                        >
                          <div className="truncate pr-4">
                            <span className="font-mono text-xs text-zinc-200 block truncate">{sf.file.name}</span>
                            <span className="text-[10px] text-zinc-500">{formatFileSize(sf.file.size)}</span>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-red-400 hover:bg-red-500/20"
                            onClick={() => removeStagedFile(sf.file.name, sf.type)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
  );
}
