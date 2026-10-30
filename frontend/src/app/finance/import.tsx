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
import { dateLabel, parseMoney } from "@/lib/finance";
import {
  defaultImportChoice,
  importSelections,
  type ImportChoice,
  detectImportFormat,
  readImportFile,
} from "@/lib/finance-import";
import { Action, Field, Notice, panel, selectClass, errorText } from "./ui";
import { ImportSource } from "./import-source";

export function FinanceImport({
  data,
  onSaved,
}: {
  data: FinanceData;
  onSaved: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [order, setOrder] = useState<FinanceImportOrder>("descending");
  const [content, setContent] = useState(""),
    [preview, setPreview] = useState<FinanceImportPreview | null>(null);
  const [anchors, setAnchors] = useState<Record<string, string>>({});
  const [confirmedAnchors, setConfirmedAnchors] = useState<Record<string, number>>({});
  const [choices, setChoices] = useState<Record<string, ImportChoice>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<FinanceImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  async function analyze(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setPreview(null);
    try {
      if (!file || !content)
        throw new Error("finance.import.fileType");
      const enteredAnchors = Object.fromEntries(Object.entries(anchors).filter(([, value]) => value.trim()).map(([key, value]) => [key, parseMoney(value)]));
      const analyzed = await financeApi.previewImport(content, order, enteredAnchors);
      setConfirmedAnchors(enteredAnchors);
      const initial = Object.fromEntries(
        analyzed.sources.map((source) => [
          source.sourceKey,
          {
            ...defaultImportChoice(
              source,
              data,
              source.matchedAccountId ? String(source.matchedAccountId) : data.accounts.length ? "" : "new",
            ),
            name: source.suggestedName ?? t("finance.import.defaultName", { suffix: source.label }),
          },
        ]),
      );
      setChoices(initial);
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
      const imported = await financeApi.importBalances(content, order, selections, confirmedAnchors);
      setResult(imported);
      setPreview(null);
      setContent("");
      setChoices({});
      setFile(null);
      setAnchors({});
      setConfirmedAnchors({});
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
        <form onSubmit={analyze} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            {t("finance.import.file")}
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xml,text/csv,application/xml,text/xml"
              required
              disabled={busy}
              className="min-h-11 w-full min-w-0 rounded-lg border border-input p-2 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-foreground"
              onChange={async (event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                setAnchors({});
                setConfirmedAnchors({});
                setChoices({});
                setPreview(null);
                setContent("");
                setResult(null);
                setError("");
                if (!selected) return;
                setBusy(true);
                try {
                  setContent(await readImportFile(selected));
                } catch (error) {
                  setError(errorText(error));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {content && <p role="status" className="text-sm text-muted-foreground">{t("finance.import.detected", { format: t(`finance.import.format.${preview?.format ?? detectImportFormat(content)}`) })}</p>}
          {content && detectImportFormat(content) === "ing-csv" && <label className="flex max-w-sm flex-col gap-2 text-sm text-muted-foreground">
            {t("finance.import.sortOrder")}
            <select
              className={selectClass}
              value={order}
              disabled={busy}
              onChange={(event) => {
                setOrder(event.target.value as FinanceImportOrder);
                setPreview(null);
                setError("");
              }}
            >
              <option value="descending">
                {t("finance.import.descending")}
              </option>
              <option value="ascending">{t("finance.import.ascending")}</option>
            </select>
          </label>}
          <Action type="submit" variant="outline" disabled={busy || !file || !content}>
            {t(busy ? "finance.import.processing" : "finance.import.preview")}
          </Action>
        </form>
        <details className="border-t border-border pt-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm">{t("finance.import.details")}</summary>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {t("finance.import.privacy")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("finance.import.coverageHelp")}
          </p>
        </details>
      </section>
      {error && <Notice error>{error}</Notice>}
      {result && (
        <Notice>
          {t("finance.import.success", {
            created: String(result.createdAccounts),
            inserted: String(result.inserted),
            updated: String(result.updated),
            transactions: String(result.transactionsInserted),
            removed: String(result.transactionsRemoved),
          })}
        </Notice>
      )}
      {preview && (
        <form onSubmit={save} className="space-y-5">
          <Notice>{t("finance.import.previewSummary", {
            accounts: String(preview.sources.length),
            rows: String(preview.rowCount),
            skipped: String(preview.sources.filter((source) => source.needsBalance || !choices[source.sourceKey]?.target).length),
          })}</Notice>
          {preview.sources.map((source) => source.needsBalance ? (
            <section key={source.sourceKey} className={`${panel} space-y-4`}>
              <h3 className="font-semibold">{source.suggestedName || t("finance.import.sourceAccount", { suffix: source.label })}</h3>
              <Notice>{t("finance.import.anchorHelp", { date: dateLabel(source.lastDate ?? null), rows: String(source.rowCount) })}</Notice>
              <Field label={t("finance.import.anchorLabel", { date: dateLabel(source.lastDate ?? null) })} inputMode="decimal" value={anchors[source.sourceKey] ?? ""} disabled={busy} onChange={(event) => setAnchors({ ...anchors, [source.sourceKey]: event.target.value })} />
              <Action type="button" variant="outline" disabled={busy || !anchors[source.sourceKey]?.trim()} onClick={() => void analyze()}>{t("finance.import.recheck")}</Action>
            </section>
          ) : (
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
