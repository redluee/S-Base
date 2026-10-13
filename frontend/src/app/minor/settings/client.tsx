"use client";

import { useState, useEffect } from "react";
import { t } from "@/lib/lang";
import { api, type MinorVacation, type MinorStoryType, type MinorSettings } from "@/lib/api";
import { ExportSettingsSection } from "./export-settings-section";
import { VacationSection } from "./vacation-section";
import { StoryTypeSection } from "./story-type-section";
import { VacationModal } from "./vacation-modal";
import { StoryTypeModal } from "./story-type-modal";

interface MinorSettingsClientProps {
  initialVacations: MinorVacation[];
  initialStoryTypes: MinorStoryType[];
  initialSettings: MinorSettings | null;
}

export function MinorSettingsClient({ initialVacations, initialStoryTypes, initialSettings }: MinorSettingsClientProps) {
  const [vacations, setVacations] = useState<MinorVacation[]>(initialVacations);
  const [storyTypes, setStoryTypes] = useState<MinorStoryType[]>(initialStoryTypes || []);

  // Export Settings (Portfolio link & last name)
  const [portfolioUrl, setPortfolioUrl] = useState(initialSettings?.portfolioUrl || "");
  const [lastName, setLastName] = useState(initialSettings?.lastName || "");
  const [savingPortfolioUrl, setSavingPortfolioUrl] = useState(false);
  const [portfolioUrlSaved, setPortfolioUrlSaved] = useState(false);

  // Vacation Modal
  const [isVacModalOpen, setIsVacModalOpen] = useState(false);
  const [editingVac, setEditingVac] = useState<MinorVacation | null>(null);
  const [vacName, setVacName] = useState("");
  const [vacStart, setVacStart] = useState("");
  const [vacEnd, setVacEnd] = useState("");
  const [savingVac, setSavingVac] = useState(false);

  // Story Type Modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<MinorStoryType | null>(null);
  const [typeCode, setTypeCode] = useState("");
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");
  const [typeColor, setTypeColor] = useState("#00e3a4");
  const [typeQualityCriteria, setTypeQualityCriteria] = useState<{ text: string; indent: number }[]>([]);
  const [typeFocusTarget, setTypeFocusTarget] = useState<number | null>(null);
  const [savingType, setSavingType] = useState(false);

  useEffect(() => {
    api.minor.storyTypes.list().then(setStoryTypes).catch(() => {});
  }, []);

  // Export Settings Handlers
  async function handleSaveExportSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingPortfolioUrl(true);
    setPortfolioUrlSaved(false);
    try {
      const updated = await api.minor.settings.update({
        portfolioUrl: portfolioUrl.trim() || null,
        lastName: lastName.trim() || null,
      });
      setPortfolioUrl(updated.portfolioUrl || "");
      setLastName(updated.lastName || "");
      setPortfolioUrlSaved(true);
      setTimeout(() => setPortfolioUrlSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save export settings:", err);
    } finally {
      setSavingPortfolioUrl(false);
    }
  }

  // Vacation Handlers
  function openCreateVacModal() {
    setEditingVac(null);
    setVacName("");
    setVacStart("");
    setVacEnd("");
    setIsVacModalOpen(true);
  }

  function openEditVacModal(v: MinorVacation) {
    setEditingVac(v);
    setVacName(v.name);
    setVacStart(v.startDate);
    setVacEnd(v.endDate);
    setIsVacModalOpen(true);
  }

  async function handleSaveVacation(e: React.FormEvent) {
    e.preventDefault();
    if (!vacName.trim() || !vacStart || !vacEnd) return;
    setSavingVac(true);
    try {
      if (editingVac) {
        const updated = await api.minor.vacations.update(editingVac.id, {
          name: vacName.trim(),
          startDate: vacStart,
          endDate: vacEnd,
        });
        setVacations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        const created = await api.minor.vacations.create({
          name: vacName.trim(),
          startDate: vacStart,
          endDate: vacEnd,
        });
        setVacations((prev) => [...prev, created]);
      }
      setIsVacModalOpen(false);
    } catch (err) {
      console.error("Failed to save vacation:", err);
    } finally {
      setSavingVac(false);
    }
  }

  async function handleDeleteVacation(id: number) {
    if (!confirm(t("Weet je zeker dat je deze vakantieperiode wilt verwijderen?"))) return;
    try {
      await api.minor.vacations.delete(id);
      setVacations((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error("Failed to delete vacation:", err);
    }
  }

  // Story Type Handlers
  function openCreateTypeModal() {
    setEditingType(null);
    setTypeCode("");
    setTypeName("");
    setTypeDesc("");
    setTypeColor("#00e3a4");
    setTypeQualityCriteria([{ text: "", indent: 0 }]);
    setIsTypeModalOpen(true);
  }

  function openEditTypeModal(st: MinorStoryType) {
    setEditingType(st);
    setTypeCode(st.code);
    setTypeName(st.name);
    setTypeDesc(st.description || "");
    setTypeColor(st.color || "#00e3a4");
    setTypeQualityCriteria(
      st.defaultQualityCriteria && st.defaultQualityCriteria.length > 0
        ? st.defaultQualityCriteria.map((c) => ({ text: c.text, indent: c.indent || 0 }))
        : [{ text: "", indent: 0 }]
    );
    setIsTypeModalOpen(true);
  }

  function addTypeQualityCriterion(indent: number = 0) {
    setTypeQualityCriteria((prev) => {
      const next = [...prev, { text: "", indent }];
      setTypeFocusTarget(next.length - 1);
      return next;
    });
  }

  async function handleSaveStoryType(e: React.FormEvent) {
    e.preventDefault();
    if (!typeCode.trim() || !typeName.trim()) return;
    setSavingType(true);
    try {
      const filteredCriteria = typeQualityCriteria
        .filter((c) => c.text.trim())
        .map((c) => ({ text: c.text.trim(), indent: c.indent || 0 }));

      if (editingType) {
        await api.minor.storyTypes.update(editingType.id, {
          code: typeCode.trim().toUpperCase(),
          name: typeName.trim(),
          description: typeDesc.trim() || undefined,
          color: typeColor || undefined,
          defaultQualityCriteria: filteredCriteria,
        });
      } else {
        await api.minor.storyTypes.create({
          code: typeCode.trim().toUpperCase(),
          name: typeName.trim(),
          description: typeDesc.trim() || undefined,
          color: typeColor || undefined,
          defaultQualityCriteria: filteredCriteria,
        });
      }
      const updatedList = await api.minor.storyTypes.list();
      setStoryTypes(updatedList);
      setIsTypeModalOpen(false);
    } catch (err) {
      console.error("Failed to save story type:", err);
    } finally {
      setSavingType(false);
    }
  }

  async function handleDeleteStoryType(id: number) {
    if (!confirm(t("Weet je zeker dat je dit story type wilt verwijderen?"))) return;
    try {
      await api.minor.storyTypes.delete(id);
      setStoryTypes((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete story type:", err);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
          {t("Minor Instellingen")}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {t("Configureer vakantieperiodes voor automatische sprintverlenging en beheer kwaliteitscriteria per story type.")}
        </p>
      </div>
      <ExportSettingsSection
        lastName={lastName}
        setLastName={setLastName}
        portfolioUrl={portfolioUrl}
        setPortfolioUrl={setPortfolioUrl}
        savingPortfolioUrl={savingPortfolioUrl}
        portfolioUrlSaved={portfolioUrlSaved}
        onSubmit={handleSaveExportSettings}
      />

      <VacationSection
        vacations={vacations}
        onCreate={openCreateVacModal}
        onEdit={openEditVacModal}
        onDelete={handleDeleteVacation}
      />

      <StoryTypeSection
        storyTypes={storyTypes}
        onCreate={openCreateTypeModal}
        onEdit={openEditTypeModal}
        onDelete={handleDeleteStoryType}
      />

      {isVacModalOpen && (
        <VacationModal
          editingVac={editingVac}
          vacName={vacName}
          setVacName={setVacName}
          vacStart={vacStart}
          setVacStart={setVacStart}
          vacEnd={vacEnd}
          setVacEnd={setVacEnd}
          savingVac={savingVac}
          onClose={() => setIsVacModalOpen(false)}
          onSubmit={handleSaveVacation}
          onDelete={handleDeleteVacation}
        />
      )}

      {isTypeModalOpen && (
        <StoryTypeModal
          editingType={editingType}
          typeCode={typeCode}
          setTypeCode={setTypeCode}
          typeName={typeName}
          setTypeName={setTypeName}
          typeDesc={typeDesc}
          setTypeDesc={setTypeDesc}
          typeColor={typeColor}
          setTypeColor={setTypeColor}
          typeQualityCriteria={typeQualityCriteria}
          setTypeQualityCriteria={setTypeQualityCriteria}
          typeFocusTarget={typeFocusTarget}
          setTypeFocusTarget={setTypeFocusTarget}
          savingType={savingType}
          addTypeQualityCriterion={addTypeQualityCriterion}
          onClose={() => setIsTypeModalOpen(false)}
          onSubmit={handleSaveStoryType}
        />
      )}
    </div>
  );
}
