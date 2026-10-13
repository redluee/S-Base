"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";
import {
  api,
  type PulseUser,
  type PulseModuleInfo,
  type PulseStats,
  type McServer,
  type ShutdownSchedule,
  type SystemUpdateState,
} from "@/lib/api";
import { Check, ChevronDown, Edit2, Gamepad2, Lock, LogIn, Mail, Search, Sparkles, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SystemPanel } from "./system-panel";

const BTN = "h-11 px-4 text-sm font-medium rounded-lg";
const BTN_OUTLINE = `${BTN} border-border bg-transparent text-foreground hover:bg-white/5`;
const FOCUS = "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function formatAbsolute(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatRelative(dateStr: string | null, now: number): string {
  if (!dateStr) return t("Never");
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diffSec = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("nl-NL", { numeric: "auto" });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

function lastLoginTime(u: PulseUser): number {
  if (!u.lastLoginAt) return 0;
  const n = new Date(u.lastLoginAt).getTime();
  return isNaN(n) ? 0 : n;
}

export function PulseClient({
  username,
  initialUsers,
  initialModules,
  initialStats,
  initialServers = [],
  initialShutdownSchedule,
  initialSystemUpdate,
}: {
  username: string;
  initialUsers: PulseUser[];
  initialModules: PulseModuleInfo[];
  initialStats: PulseStats;
  initialServers?: McServer[];
  initialShutdownSchedule?: ShutdownSchedule;
  initialSystemUpdate?: SystemUpdateState;
}) {
  const router = useRouter();
  const [usersList, setUsersList] = useState<PulseUser[]>(initialUsers);
  const [modulesList] = useState<PulseModuleInfo[]>(initialModules);
  const [serversList] = useState<McServer[]>(initialServers);
  const [stats, setStats] = useState<PulseStats>(initialStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [editingEmailUserId, setEditingEmailUserId] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!statusMsg) return;
    const id = setTimeout(() => setStatusMsg(null), 3000);
    return () => clearTimeout(id);
  }, [statusMsg]);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ text, type });
  };

  const refreshStats = (updatedUsers: PulseUser[]) => {
    const totalUsers = updatedUsers.length;
    const pausedUsers = updatedUsers.filter((u) => u.isPaused === 1).length;
    const activeUsers = totalUsers - pausedUsers;
    const totalPermissions = updatedUsers.reduce((acc, u) => acc + u.modules.length, 0);
    setStats({ totalUsers, activeUsers, pausedUsers, totalPermissions });
  };

  const handleStartEditEmail = (user: PulseUser) => {
    setEditingEmailUserId(user.userId);
    setEmailInput(user.email ?? "");
  };

  const handleSaveEmail = async (userId: number) => {
    setLoadingUserId(userId);
    try {
      const updated = await api.pulse.updateEmail(userId, emailInput || null);
      setUsersList((prev) => {
        const next = prev.map((u) => (u.userId === userId ? updated : u));
        refreshStats(next);
        return next;
      });
      setEditingEmailUserId(null);
      showNotification(t("E-mailadres bijgewerkt"));
    } catch {
      showNotification(t("Opslaan mislukt"), "error");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleToggleStatus = async (user: PulseUser) => {
    const newStatus = user.isPaused === 1 ? 0 : 1;
    setLoadingUserId(user.userId);
    try {
      const updated = await api.pulse.updateStatus(user.userId, newStatus === 1);
      setUsersList((prev) => {
        const next = prev.map((u) => (u.userId === user.userId ? updated : u));
        refreshStats(next);
        return next;
      });
      showNotification(newStatus === 1 ? t("Account gepauzeerd") : t("Account geactiveerd"));
    } catch {
      showNotification(t("Status wijzigen mislukt"), "error");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleToggleModule = async (user: PulseUser, moduleName: string) => {
    const hasModule = user.modules.includes(moduleName);
    const updatedModules = hasModule ? user.modules.filter((m) => m !== moduleName) : [...user.modules, moduleName];

    setLoadingUserId(user.userId);
    try {
      const updated = await api.pulse.updateModules(user.userId, updatedModules);
      setUsersList((prev) => {
        const next = prev.map((u) => (u.userId === user.userId ? updated : u));
        refreshStats(next);
        return next;
      });
      showNotification(t("Module toegang bijgewerkt"));
    } catch {
      showNotification(t("Permissies wijzigen mislukt"), "error");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleToggleServer = async (user: PulseUser, serverSlug: string) => {
    const currentServers = user.mcServers || [];
    const hasServer = currentServers.includes(serverSlug);
    const updatedServers = hasServer ? currentServers.filter((s) => s !== serverSlug) : [...currentServers, serverSlug];

    setLoadingUserId(user.userId);
    try {
      const updated = await api.pulse.updateServers(user.userId, updatedServers);
      setUsersList((prev) =>
        prev.map((u) => (u.userId === user.userId ? { ...u, mcServers: updated.mcServers ?? updatedServers } : u))
      );
      showNotification(t("Server toegang bijgewerkt"));
    } catch {
      showNotification(t("Server toegang wijzigen mislukt"), "error");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleImpersonate = async (user: PulseUser) => {
    if (user.username.toLowerCase() === username.toLowerCase()) return;
    setLoadingUserId(user.userId);
    try {
      showNotification(t("Switching user..."));
      await api.pulse.impersonate(user.userId);
      router.push("/dashboard");
      router.refresh();
    } catch {
      showNotification(t("Login failed. Please try again."), "error");
      setLoadingUserId(null);
    }
  };

  const toggleExpanded = (userId: number) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
    setEditingEmailUserId(null);
  };

  const visibleUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return usersList
      .filter((u) => u.username.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q)))
      .sort((a, b) => lastLoginTime(b) - lastLoginTime(a) || a.username.localeCompare(b.username));
  }, [usersList, searchQuery]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavHeader username={username} />

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="fixed right-4 top-4 z-50 max-w-[calc(100vw-2rem)]" role="status" aria-live="polite">
          {statusMsg && (
            <div
              className={`rounded-lg border bg-card px-4 py-2.5 text-sm font-medium ${
                statusMsg.type === "success" ? "border-brand/40 text-foreground" : "border-destructive/50 text-destructive"
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>

        <header className="mb-8">
          <h1 className="font-display text-[clamp(1.75rem,5vw,3rem)] font-normal leading-[1.1] text-foreground text-balance">
            Pulse
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("User Management & Monitoring")}</p>
        </header>

        <SystemPanel
          stats={stats}
          initialShutdownSchedule={initialShutdownSchedule}
          initialSystemUpdate={initialSystemUpdate}
          notify={showNotification}
        />

        <section aria-labelledby="pulse-users-heading">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="pulse-users-heading" className="text-lg font-semibold text-foreground">
              {t("Gebruikers")}
              <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                {t("{count} van {total} gebruikers", { count: String(visibleUsers.length), total: String(usersList.length) })}
              </span>
            </h2>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                placeholder={t("Search users...")}
                aria-label={t("Zoek gebruikers")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-lg pl-9"
              />
            </div>
          </div>

          {visibleUsers.length === 0 ? (
            <div className="rounded-xl bg-card p-10 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
              {t("No users found.")}
            </div>
          ) : (
            <ul className="divide-y divide-white/10 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {visibleUsers.map((u) => {
                const isPaused = u.isPaused === 1;
                const isExpanded = expandedUserId === u.userId;
                const isEditingEmail = editingEmailUserId === u.userId;
                const isLoading = loadingUserId === u.userId;
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
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
