"use client";

import { useState } from "react";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";
import { api, type PulseUser, type PulseModuleInfo, type PulseStats } from "@/lib/api";
import {
  Activity,
  Users,
  UserCheck,
  UserX,
  Shield,
  Search,
  Mail,
  Check,
  X,
  Edit2,
  Lock,
  Unlock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PulseClient({
  username,
  initialUsers,
  initialModules,
  initialStats,
}: {
  username: string;
  initialUsers: PulseUser[];
  initialModules: PulseModuleInfo[];
  initialStats: PulseStats;
}) {
  const [usersList, setUsersList] = useState<PulseUser[]>(initialUsers);
  const [modulesList] = useState<PulseModuleInfo[]>(initialModules);
  const [stats, setStats] = useState<PulseStats>(initialStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEmailUserId, setEditingEmailUserId] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
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
      showNotification(
        newStatus === 1
          ? t("Account gepauzeerd")
          : t("Account geactiveerd")
      );
    } catch {
      showNotification(t("Status wijzigen mislukt"), "error");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleToggleModule = async (user: PulseUser, moduleName: string) => {
    const hasModule = user.modules.includes(moduleName);
    const updatedModules = hasModule
      ? user.modules.filter((m) => m !== moduleName)
      : [...user.modules, moduleName];

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

  const filteredUsers = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatLastLogin = (dateStr: string | null) => {
    if (!dateStr) return t("Never");
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-foreground">
      <NavHeader username={username} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Floating Notification */}
        {statusMsg && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              statusMsg.type === "success"
                ? "bg-teal-950/90 text-teal-300 border-teal-500/40"
                : "bg-rose-950/90 text-rose-300 border-rose-500/40"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="size-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_1.5rem_-0.25rem_rgba(239,68,68,0.4)]">
                <Activity className="size-5 animate-pulse" />
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white">
                Pulse
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                Monitoring
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">
              {t("User Management & Monitoring")}
            </p>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="rounded-2xl bg-zinc-900/80 border border-white/10 p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-teal-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t("Total Users")}</span>
              <Users className="size-4 text-teal-400" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-display text-white">{stats.totalUsers}</span>
          </div>

          <div className="rounded-2xl bg-zinc-900/80 border border-white/10 p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t("Active Users")}</span>
              <UserCheck className="size-4 text-emerald-400" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-display text-emerald-400">{stats.activeUsers}</span>
          </div>

          <div className="rounded-2xl bg-zinc-900/80 border border-white/10 p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-rose-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t("Paused Accounts")}</span>
              <UserX className="size-4 text-rose-400" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-display text-rose-400">{stats.pausedUsers}</span>
          </div>

          <div className="rounded-2xl bg-zinc-900/80 border border-white/10 p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t("Total Permissions")}</span>
              <Shield className="size-4 text-amber-400" />
            </div>
            <span className="text-2xl sm:text-3xl font-black font-display text-amber-400">{stats.totalPermissions}</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              placeholder={t("Search users...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-zinc-900/90 border-white/10 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500/50 rounded-xl"
            />
          </div>
        </div>

        {/* Users List Container */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/50 border border-white/5 p-12 text-center text-zinc-500 text-sm">
              {t("No users found.")}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isPaused = u.isPaused === 1;
              const isEditingEmail = editingEmailUserId === u.userId;
              const isLoading = loadingUserId === u.userId;

              return (
                <div
                  key={u.userId}
                  className={`rounded-2xl bg-zinc-900/80 border backdrop-blur-md p-5 transition-all duration-200 ${
                    isPaused
                      ? "border-rose-900/40 bg-rose-950/10"
                      : "border-white/10 hover:border-teal-500/30"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* User Profile Summary */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`size-11 rounded-xl font-display font-black text-lg flex items-center justify-center shrink-0 border ${
                          isPaused
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : "bg-teal-500/15 border-teal-500/30 text-teal-400"
                        }`}
                      >
                        {u.username.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-base text-zinc-100 truncate">
                            {u.username}
                          </h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 border border-white/5 font-mono text-zinc-400">
                            ID: {u.userId}
                          </span>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                              isPaused
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            }`}
                          >
                            {isPaused ? t("Paused") : t("Active")}
                          </span>
                        </div>

                        {/* Email Row & Edit */}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
                          <Mail className="size-3.5 text-zinc-500 shrink-0" />
                          {isEditingEmail ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                className="h-7 text-xs bg-zinc-950 border-white/20 px-2 py-1 rounded-lg w-48 text-zinc-100"
                                placeholder={t("Email Address")}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveEmail(u.userId)}
                                disabled={isLoading}
                                className="h-7 px-2 bg-teal-500 hover:bg-teal-600 text-zinc-950 font-bold text-xs rounded-lg"
                              >
                                <Check className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingEmailUserId(null)}
                                className="h-7 px-2 text-zinc-400 hover:text-white rounded-lg"
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span>{u.email || <span className="italic text-zinc-600">Geen e-mailadres</span>}</span>
                              <button
                                onClick={() => handleStartEditEmail(u)}
                                className="p-1 rounded-md text-zinc-500 hover:text-teal-400 hover:bg-zinc-800 transition-colors"
                                title={t("Email bewerken")}
                              >
                                <Edit2 className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Last Login Info */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 font-medium">
                          <span>{t("Last Login")}:</span>
                          <span className="text-zinc-300 font-mono">{formatLastLogin(u.lastLoginAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Account Controls & Actions */}
                    <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(u)}
                        disabled={isLoading}
                        className={`h-9 px-3.5 text-xs font-bold rounded-xl transition-all border ${
                          isPaused
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                        }`}
                      >
                        {isPaused ? (
                          <>
                            <Unlock className="size-3.5 mr-1.5" />
                            {t("Unpause Account")}
                          </>
                        ) : (
                          <>
                            <Lock className="size-3.5 mr-1.5" />
                            {t("Pause Account")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Module Access Permissions Section */}
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-teal-400" />
                        {t("Module Access")}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {modulesList.map((m) => {
                        const hasAccess = u.modules.includes(m.moduleName);
                        return (
                          <button
                            key={m.moduleId}
                            onClick={() => handleToggleModule(u, m.moduleName)}
                            disabled={isLoading}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                              hasAccess
                                ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-[0_0_1rem_-0.25rem_rgba(20,184,166,0.3)]"
                                : "bg-zinc-800/40 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 hover:border-white/10"
                            }`}
                          >
                            <div
                              className={`size-3.5 rounded-md flex items-center justify-center border transition-colors ${
                                hasAccess
                                  ? "bg-teal-500 border-teal-400 text-zinc-950"
                                  : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                              }`}
                            >
                              {hasAccess && <Check className="size-2.5 stroke-[3]" />}
                            </div>
                            <span>{m.moduleAlias || m.moduleName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
