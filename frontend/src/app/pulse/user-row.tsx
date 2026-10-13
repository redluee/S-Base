"use client";

import { Check, ChevronDown, Edit2, Gamepad2, Lock, LogIn, Mail, Sparkles, Unlock, X } from "lucide-react";
import { t } from "@/lib/lang";
import type { PulseUser, PulseModuleInfo, McServer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BTN, BTN_OUTLINE, FOCUS } from "./system-panel-styles";
import { formatAbsolute, formatRelative } from "./pulse-format";

export function UserRow({
  u,
  username,
  now,
  isExpanded,
  isEditingEmail,
  isLoading,
  emailInput,
  setEmailInput,
  modulesList,
  serversList,
  toggleExpanded,
  handleSaveEmail,
  handleStartEditEmail,
  setEditingEmailUserId,
  handleToggleModule,
  handleToggleServer,
  handleImpersonate,
  handleToggleStatus,
}: {
  u: PulseUser;
  username: string;
  now: number;
  isExpanded: boolean;
  isEditingEmail: boolean;
  isLoading: boolean;
  emailInput: string;
  setEmailInput: (value: string) => void;
  modulesList: PulseModuleInfo[];
  serversList: McServer[];
  toggleExpanded: (userId: number) => void;
  handleSaveEmail: (userId: number) => void;
  handleStartEditEmail: (user: PulseUser) => void;
  setEditingEmailUserId: (userId: number | null) => void;
  handleToggleModule: (user: PulseUser, moduleName: string) => void;
  handleToggleServer: (user: PulseUser, serverSlug: string) => void;
  handleImpersonate: (user: PulseUser) => void;
  handleToggleStatus: (user: PulseUser) => void;
}) {
  const isPaused = u.isPaused === 1;
  const isSelf = u.username.toLowerCase() === username.toLowerCase();
  const panelId = `pulse-user-${u.userId}`;
  const userServers = u.mcServers || [];

  return (
    <li key={u.userId}>
      <button
        type="button"
        onClick={() => toggleExpanded(u.userId)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className={`flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.03] focus-visible:ring-inset sm:px-5 ${FOCUS}`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`truncate text-base font-medium ${isPaused ? "text-muted-foreground" : "text-foreground"}`}>
              {u.username}
            </span>
            {isPaused && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                <Lock className="size-3" aria-hidden="true" />
                {t("Paused")}
              </span>
            )}
          </span>
          <span
            className="text-[0.8rem] text-muted-foreground sm:ml-auto"
            title={u.lastLoginAt ? formatAbsolute(u.lastLoginAt) : undefined}
          >
            <span className="sr-only">{t("Laatst online")}: </span>
            <span suppressHydrationWarning>{formatRelative(u.lastLoginAt, now)}</span>
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div id={panelId} className="flex flex-col gap-6 border-t border-white/10 bg-black/30 px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-[0.8rem] font-medium tracking-[0.01em] text-muted-foreground">
              <Mail className="size-3.5" aria-hidden="true" />
              {t("Email Address")}
            </h3>
            {isEditingEmail ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEmail(u.userId);
                }}
              >
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  aria-label={t("Email Address")}
                  placeholder={t("Email Address")}
                  autoFocus
                  className="h-11 w-full max-w-xs rounded-lg"
                />
                <Button type="submit" disabled={isLoading} aria-label={t("Opslaan")} className={`${BTN} bg-brand text-[#111] hover:bg-brand-hover`}>
                  <Check aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingEmailUserId(null)}
                  aria-label={t("Sluiten")}
                  className={`${BTN} text-muted-foreground`}
                >
                  <X aria-hidden="true" />
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-1">
                <span className="break-all text-sm text-foreground">
                  {u.email || <span className="italic text-muted-foreground">{t("Geen e-mailadres")}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => handleStartEditEmail(u)}
                  title={t("Email bewerken")}
                  aria-label={t("Email bewerken")}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground ${FOCUS}`}
                >
                  <Edit2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-[0.8rem] font-medium tracking-[0.01em] text-muted-foreground">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {t("Module Access")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {modulesList.map((m) => {
                const hasAccess = u.modules.includes(m.moduleName);
                return (
                  <button
                    key={m.moduleId}
                    type="button"
                    onClick={() => handleToggleModule(u, m.moduleName)}
                    disabled={isLoading}
                    aria-pressed={hasAccess}
                    className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm transition-colors disabled:opacity-50 ${FOCUS} ${
                      hasAccess
                        ? "border-brand/50 bg-brand/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border ${
                        hasAccess ? "border-brand bg-brand text-[#111]" : "border-white/25"
                      }`}
                      aria-hidden="true"
                    >
                      {hasAccess && <Check className="size-3 stroke-[3]" />}
                    </span>
                    {m.moduleAlias || m.moduleName}
                  </button>
                );
              })}
            </div>
          </div>

          {u.modules.includes("minecraft:monitor") && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <h3 className="flex items-center gap-1.5 text-[0.8rem] font-medium tracking-[0.01em] text-muted-foreground">
                  <Gamepad2 className="size-3.5" aria-hidden="true" />
                  {t("Minecraft Server Monitor-toegang")}
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  {userServers.length} {t("servers geselecteerd")}
                </span>
              </div>
              {serversList.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">{t("Geen Minecraft servers gevonden.")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {serversList.map((srv) => {
                    const hasAccess = userServers.includes(srv.slug);
                    return (
                      <button
                        key={srv.serverId}
                        type="button"
                        onClick={() => handleToggleServer(u, srv.slug)}
                        disabled={isLoading}
                        aria-pressed={hasAccess}
                        className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm transition-colors disabled:opacity-50 ${FOCUS} ${
                          hasAccess
                            ? "border-brand/50 bg-brand/10 text-foreground"
                            : "border-border text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`flex size-4 items-center justify-center rounded border ${
                            hasAccess ? "border-brand bg-brand text-[#111]" : "border-white/25"
                          }`}
                          aria-hidden="true"
                        >
                          {hasAccess && <Check className="size-3 stroke-[3]" />}
                        </span>
                        {srv.displayName}
                        <span className="font-mono text-xs opacity-60">({srv.slug})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
            {!isSelf && (
              <Button
                variant="outline"
                onClick={() => handleImpersonate(u)}
                disabled={isLoading || isPaused}
                title={t("Impersonate user")}
                className={BTN_OUTLINE}
              >
                <LogIn aria-hidden="true" />
                {t("Login as user")}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleToggleStatus(u)}
              disabled={isLoading}
              className={
                isPaused
                  ? BTN_OUTLINE
                  : `${BTN} border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10`
              }
            >
              {isPaused ? (
                <>
                  <Unlock aria-hidden="true" />
                  {t("Unpause Account")}
                </>
              ) : (
                <>
                  <Lock aria-hidden="true" />
                  {t("Pause Account")}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
