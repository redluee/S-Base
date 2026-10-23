"use client";

import { useRef, useState, type FormEvent } from "react";
import type {
  FinanceData,
  FinanceImportOrder,
  FinanceImportPreview,
  FinanceImportResult,
} from "@backend/types/finance";
import { financeApi } from "@/lib/api/finance";
import { t } from "@/lib/lang";
import {
  defaultImportChoice,
  importSelections,
  type ImportChoice,
} from "@/lib/finance-import";
import { Action, Notice, panel, selectClass, errorText } from "./ui";
import { ImportSource } from "./import-source";

const MAX_BYTES = 2 * 1024 * 1024;
export function FinanceImport({
  data,
  onSaved,
}: {
  data: FinanceData;
  onSaved: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [order, setOrder] = useState<FinanceImportOrder>("descending");
  const [csv, setCsv] = useState(""),
    [preview, setPreview] = useState<FinanceImportPreview | null>(null);
  const [choices, setChoices] = useState<Record<string, ImportChoice>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<FinanceImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  async function analyze(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setPreview(null);
    setCsv("");
    try {
      if (!file || !/\.csv$/i.test(file.name))
        throw new Error("finance.import.fileType");
      if (file.size > MAX_BYTES) throw new Error("finance.import.size");
      const bytes = await file.arrayBuffer();
      let content: string;
      try {
        content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        content = new TextDecoder("windows-1252").decode(bytes);
      }
      const analyzed = await financeApi.previewImport(content, order);
      const initial = Object.fromEntries(
        analyzed.sources.map((source) => [
          source.sourceKey,
          {
            ...defaultImportChoice(
              source,
              data,
              data.accounts.length ? "" : "new",
            ),
            name: t("finance.import.defaultName", { suffix: source.label }),
          },
        ]),
      );
      setChoices(initial);
      setCsv(content);
      setPreview(analyzed);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  const selections = preview
    ? importSelections(preview.sources, choices, data)
    : [];
  const selectedCount = selections.reduce(
    (sum, selection) => sum + selection.entries.length,
    0,
  );
  const missingConsent = selections.some((selection) => {
    const account = data.accounts.find(
      (account) => account.id === selection.accountId,
    );
    return (
      account &&
      !selection.extendOpening &&
      selection.entries.some((entry) => entry.date < account.openingDate)
    );
  });
  const duplicates =
    new Set(
      selections.flatMap((selection) =>
        selection.accountId === undefined ? [] : [selection.accountId],
      ),
    ).size !==
    selections.filter((selection) => selection.accountId !== undefined).length;
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const imported = await financeApi.importBalances(csv, order, selections);
      setResult(imported);
      setPreview(null);
      setCsv("");
      setChoices({});
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await onSaved();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <section className={`${panel} space-y-4`}>
        <h2 className="text-lg font-semibold">{t("finance.import.title")}</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {t("finance.import.instructions")}
        </p>
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {t("finance.import.privacy")}
        </p>
        <form onSubmit={analyze} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            {t("finance.import.file")}
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              required
              disabled={busy}
              className="min-h-11 w-full min-w-0 rounded-lg border border-input p-2 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-foreground"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setCsv("");
                setResult(null);
                setError("");
              }}
            />
          </label>
          <label className="flex max-w-sm flex-col gap-2 text-sm text-muted-foreground">
            {t("finance.import.sortOrder")}
            <select
              className={selectClass}
              value={order}
              disabled={busy}
              onChange={(event) => {
                setOrder(event.target.value as FinanceImportOrder);
                setPreview(null);
                setCsv("");
                setError("");
              }}
            >
              <option value="descending">
                {t("finance.import.descending")}
              </option>
              <option value="ascending">{t("finance.import.ascending")}</option>
            </select>
          </label>
          <Action type="submit" variant="outline" disabled={busy || !file}>
            {t(busy ? "finance.import.processing" : "finance.import.preview")}
          </Action>
        </form>
        <p className="text-xs text-muted-foreground">
          {t("finance.import.coverageHelp")}
        </p>
      </section>
      {error && <Notice error>{error}</Notice>}
      {result && (
        <Notice>
          {t("finance.import.success", {
            created: String(result.createdAccounts),
            inserted: String(result.inserted),
            updated: String(result.updated),
          })}
        </Notice>
      )}
      {preview && (
        <form onSubmit={save} className="space-y-5">
          {preview.sources.map((source) => (
            <ImportSource
              key={source.sourceKey}
              source={source}
              data={data}
              choice={choices[source.sourceKey]}
              busy={busy}
              onChange={(choice) =>
                setChoices({ ...choices, [source.sourceKey]: choice })
              }
            />
          ))}
          {duplicates && (
            <Notice error>{t("finance.import.duplicateTarget")}</Notice>
          )}
          {missingConsent && (
            <Notice>{t("finance.import.consentRequired")}</Notice>
          )}
          <p className="text-sm text-muted-foreground">
            {t("finance.import.reviewHelp")}
          </p>
          <Action
            type="submit"
            className="bg-brand text-black hover:bg-brand-hover"
            disabled={busy || !selectedCount || missingConsent || duplicates}
          >
            {t(busy ? "Saving..." : "finance.import.save", {
              count: String(selectedCount),
            })}
          </Action>
        </form>
      )}
    </div>
  );
}
