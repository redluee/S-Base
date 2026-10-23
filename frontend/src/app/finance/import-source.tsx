"use client";

import type { FinanceData, FinanceImportSource } from "@backend/types/finance";
import { t } from "@/lib/lang";
import { dateLabel, money } from "@/lib/finance";
import {
  defaultImportChoice,
  importRows,
  type ImportChoice,
} from "@/lib/finance-import";
import { Action, Field, Notice, panel, selectClass } from "./ui";

export function ImportSource({
  source,
  data,
  choice,
  busy,
  onChange,
}: {
  source: FinanceImportSource;
  data: FinanceData;
  choice: ImportChoice;
  busy: boolean;
  onChange: (choice: ImportChoice) => void;
}) {
  const rows = importRows(source, data, choice.target);
  const account = data.accounts.find(
    (account) => account.id === Number(choice.target),
  );
  const earlier =
    account &&
    rows.some(
      (row) =>
        choice.dates.includes(row.date) && row.date < account.openingDate,
    );
  const conflicts = rows.filter((row) => row.state === "conflict").length;
  const changeTarget = (target: string) =>
    onChange({
      ...defaultImportChoice(source, data, target),
      name:
        choice.name ||
        t("finance.import.defaultName", { suffix: source.label }),
    });
  return (
    <section className={`${panel} space-y-5`}>
      <header>
        <h3 className="font-semibold">
          {t("finance.import.sourceAccount", { suffix: source.label })}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("finance.import.sourceSummary", {
            rows: String(source.rowCount),
            days: String(rows.length),
            start: dateLabel(rows[0].date),
            end: dateLabel(rows.at(-1)!.date),
          })}
        </p>
      </header>
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        {t("finance.import.destination")}
        <select
          className={selectClass}
          value={choice.target}
          disabled={busy}
          onChange={(event) => changeTarget(event.target.value)}
        >
          <option value="">{t("finance.import.skipAccount")}</option>
          <option value="new">{t("finance.import.createAccount")}</option>
          {data.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
              {account.archived ? ` · ${t("finance.archived")}` : ""}
            </option>
          ))}
        </select>
      </label>
      {choice.target === "new" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("finance.accountName")}
            required
            maxLength={120}
            value={choice.name}
            disabled={busy}
            onChange={(event) =>
              onChange({ ...choice, name: event.target.value })
            }
          />
          <label className="flex flex-col gap-2 text-sm text-muted-foreground">
            {t("finance.accountType")}
            <select
              className={selectClass}
              value={choice.type}
              disabled={busy}
              onChange={(event) =>
                onChange({
                  ...choice,
                  type: event.target.value as ImportChoice["type"],
                })
              }
            >
              <option value="current">{t("finance.current")}</option>
              <option value="savings">{t("finance.savings")}</option>
            </select>
          </label>
        </div>
      )}
      {account?.archived && <Notice>{t("finance.import.archivedHelp")}</Notice>}
      {choice.target && (
        <>
          {earlier && (
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-brand"
                disabled={busy}
                checked={choice.extendOpening}
                onChange={(event) =>
                  onChange({ ...choice, extendOpening: event.target.checked })
                }
              />
              <span>
                {t("finance.import.extendOpening", {
                  date: dateLabel(account.openingDate),
                })}
              </span>
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            {t("finance.import.selectionSummary", {
              selected: String(choice.dates.length),
              same: String(rows.filter((row) => row.state === "same").length),
              conflicts: String(conflicts),
            })}
          </p>
          {conflicts > 0 && <Notice>{t("finance.import.conflictHelp")}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Action
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                onChange({
                  ...choice,
                  dates: rows
                    .filter((row) => row.state === "new")
                    .map((row) => row.date),
                })
              }
            >
              {t("finance.import.selectNew")}
            </Action>
            <Action
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onChange({ ...choice, dates: [] })}
            >
              {t("finance.import.selectNone")}
            </Action>
          </div>
          <fieldset
            disabled={busy}
            className="max-h-80 divide-y divide-border overflow-y-auto"
            aria-label={t("finance.import.dates")}
          >
            {rows.map((row) => (
              <label
                key={row.date}
                className={`flex min-h-11 items-center gap-3 py-3 ${row.state === "same" ? "text-muted-foreground" : ""}`}
              >
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-brand"
                  disabled={row.state === "same"}
                  checked={
                    choice.dates.includes(row.date) && row.state !== "same"
                  }
                  onChange={(event) =>
                    onChange({
                      ...choice,
                      dates: event.target.checked
                        ? [...choice.dates, row.date]
                        : choice.dates.filter((date) => date !== row.date),
                    })
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap justify-between gap-2 text-sm tabular-nums">
                    <span>{dateLabel(row.date)}</span>
                    <span>{money(row.balanceCents)}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {row.state === "conflict"
                      ? t("finance.import.replace", {
                          amount: money(row.expectedCents),
                        })
                      : t(`finance.import.row.${row.state}`)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </>
      )}
    </section>
  );
}
