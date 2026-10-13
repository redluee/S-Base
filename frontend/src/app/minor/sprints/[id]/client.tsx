"use client";

import { useState, useEffect, useRef } from "react";
import { Layers, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { api, type MinorStory, type MinorSprintFull, type MinorStoryType } from "@/lib/api";
import { SprintPresentation } from "@/components/minor-presentation/sprint-presentation";
import { PresentationStoryEditor } from "@/components/minor-presentation/presentation-story-editor";
import type { Tab } from "./sprint-detail-types";
import { useSprintData } from "./use-sprint-data";
import { useStoryEditor } from "./use-story-editor";
import { useStoryLinking } from "./use-story-linking";
import { useStoryImport } from "./use-story-import";
import { useSprintExport } from "./use-sprint-export";
import { SprintHeader } from "./sprint-header";
import { SprintBanners } from "./sprint-banners";
import { PlanningTab } from "./planning-tab";
import { FeedbackTab } from "./feedback-tab";
import { SelfEvalTab } from "./self-eval-tab";
import { ReflectionTab } from "./reflection-tab";
import { StoryViewModal } from "./story-view-modal";
import { StoryEditModal } from "./story-edit-modal";
import { StoryImportModal } from "./story-import-modal";
import { LinkStoryModal } from "./link-story-modal";
import { UnlinkStoryModal } from "./unlink-story-modal";
import { ExportWarningModal } from "./export-warning-modal";

interface MinorSprintDetailClientProps {
  initialSprint: MinorSprintFull;
  initialStoryTypes: MinorStoryType[];
}

export function MinorSprintDetailClient({ initialSprint, initialStoryTypes }: MinorSprintDetailClientProps) {
  const data = useSprintData(initialSprint);
  const { sprint, setSprint, reloadSprint, getCurrentFullSprint, selfEvals, handleSaveEvalsAndAssessments, handleSaveReflection } = data;
  const [activeTab, setActiveTab] = useState<Tab>("planning");
  const [storyTypes, setStoryTypes] = useState<MinorStoryType[]>(initialStoryTypes || []);
  const [viewingStoryId, setViewingStoryId] = useState<number | null>(null);

  const editor = useStoryEditor(sprint, setSprint, storyTypes, reloadSprint, setViewingStoryId);
  const linking = useStoryLinking(sprint, setSprint, reloadSprint, setViewingStoryId);
  const importer = useStoryImport(sprint, reloadSprint, setViewingStoryId);
  const exporter = useSprintExport(sprint, selfEvals, getCurrentFullSprint);

  // Presentation State
  const [isPresentationOpen, setIsPresentationOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("present") === "1";
    }
    return false;
  });
  const [editingPresentationStory, setEditingPresentationStory] = useState<MinorStory | null>(null);

  const viewingStory = sprint.stories.find((s) => s.id === viewingStoryId) || null;

  useEffect(() => {
    api.minor.storyTypes.list().then(setStoryTypes).catch(() => {});
  }, []);

  // Keyboard shortcut Ctrl+S / Cmd+S
  const saveActionRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (activeTab === "self_eval") {
      saveActionRef.current = () => { handleSaveEvalsAndAssessments(); };
    } else if (activeTab === "reflection") {
      saveActionRef.current = () => { handleSaveReflection(); };
    } else {
      saveActionRef.current = () => {};
    }
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveActionRef.current();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Calculate unique LUs in sprint for warnings
  const uniqueLUsInSprint = new Set<number>();
  sprint.stories.forEach((st) => {
    st.learningOutcomes.forEach((lu) => uniqueLUsInSprint.add(lu));
  });
  const hasFewLUs = uniqueLUsInSprint.size < 3;
  const missingLU5 = !uniqueLUsInSprint.has(5);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SprintHeader setIsPresentationOpen={setIsPresentationOpen} data={data} exporter={exporter} />

      <SprintBanners hasFewLUs={hasFewLUs} missingLU5={missingLU5} uniqueLUsInSprint={uniqueLUsInSprint} data={data} />

      {/* Section Tabs (1. PLANNING, 2. FEEDBACK, 3. ZELFEVALUATIE & BEOORDELING, 4. REFLECTIE) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: "planning", label: "1. Planning", icon: Layers },
          { id: "feedback", label: "2. Feedback", icon: Clock },
          { id: "self_eval", label: "3. Zelfevaluatie & Beoordeling", icon: CheckCircle2 },
          { id: "reflection", label: "4. Reflectie", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "planning" | "feedback" | "self_eval" | "reflection")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                active
                  ? "bg-brand/15 text-brand border border-brand/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "planning" && (
        <PlanningTab
          storyTypes={storyTypes}
          setViewingStoryId={setViewingStoryId}
          setEditingPresentationStory={setEditingPresentationStory}
          data={data}
          editor={editor}
          linking={linking}
          importer={importer}
        />
      )}

      {activeTab === "feedback" && <FeedbackTab data={data} />}

      {activeTab === "self_eval" && <SelfEvalTab data={data} />}

      {activeTab === "reflection" && <ReflectionTab data={data} />}

      {viewingStory && (
        <StoryViewModal
          storyTypes={storyTypes}
          viewingStory={viewingStory}
          setViewingStoryId={setViewingStoryId}
          setEditingPresentationStory={setEditingPresentationStory}
          data={data}
          editor={editor}
        />
      )}

      {editor.isStoryModalOpen && <StoryEditModal storyTypes={storyTypes} editor={editor} linking={linking} />}

      {importer.isImportStoryModalOpen && <StoryImportModal importer={importer} />}

      {linking.isLinkStoryModalOpen && (
        <LinkStoryModal storyTypes={storyTypes} data={data} editor={editor} linking={linking} />
      )}

      {linking.isUnlinkModalOpen && linking.storyToUnlink && <UnlinkStoryModal data={data} linking={linking} />}

      {exporter.pendingExportType && <ExportWarningModal setActiveTab={setActiveTab} exporter={exporter} />}

      {/* Presentation Fullscreen Mode */}
      {isPresentationOpen && (
        <SprintPresentation
          sprint={sprint}
          storyTypes={storyTypes}
          onClose={() => setIsPresentationOpen(false)}
          onStoryUpdated={(updatedStory) => {
            setSprint((prev) => ({
              ...prev,
              stories: prev.stories.map((s) => (s.id === updatedStory.id ? updatedStory : s)),
            }));
          }}
        />
      )}

      {/* Story Presentation Editor Modal */}
      {editingPresentationStory && (
        <PresentationStoryEditor
          story={editingPresentationStory}
          onSave={async (data) => {
            const updated = await api.minor.sprints.stories.update(editingPresentationStory.id, {
              presentationData: data,
            });
            if (updated) {
              setSprint((prev) => ({
                ...prev,
                stories: prev.stories.map((s) => (s.id === updated.id ? updated : s)),
              }));
            }
          }}
          onClose={() => setEditingPresentationStory(null)}
        />
      )}
    </div>
  );
}
