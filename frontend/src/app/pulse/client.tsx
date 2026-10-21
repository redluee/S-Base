"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  ApiError,
} from "@/lib/api";
import { Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SystemPanel } from "./system-panel";
import { UserRow } from "./user-row";
import { lastLoginTime } from "./pulse-format";


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
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });

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

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingUser(true);
    try {
      const created = await api.pulse.createUser(newUser);
      setUsersList((prev) => {
        const next = [created, ...prev];
        refreshStats(next);
        return next;
      });
      setSearchQuery(created.username);
      setExpandedUserId(created.userId);
      setNewUser({ username: "", email: "", password: "" });
      setIsCreateUserOpen(false);
      showNotification(t("User created"));
    } catch (error) {
      const reason = error instanceof ApiError ? error.data?.error : undefined;
      const messages: Record<string, string> = {
        username_required: t("Username is required"),
        username_too_long: t("Username is too long"),
        email_invalid: t("Invalid email address"),
        password_too_short: t("Password must be at least 8 characters"),
        username_exists: t("Username already exists"),
        email_exists: t("Email address already exists"),
        invalid_input: t("Check the user details and try again"),
      };
      showNotification(typeof reason === "string" ? messages[reason] ?? t("User creation failed") : t("User creation failed"), "error");
    } finally {
      setIsCreatingUser(false);
    }
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-64">
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
              <Button
                type="button"
                onClick={() => setIsCreateUserOpen((open) => !open)}
                disabled={isCreatingUser}
                aria-expanded={isCreateUserOpen}
                aria-controls="pulse-create-user"
                className="min-h-11 bg-brand px-4 text-[#111] hover:bg-brand-hover"
              >
                {isCreateUserOpen ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {isCreateUserOpen ? t("Close form") : t("Add user")}
              </Button>
            </div>
          </div>

          {isCreateUserOpen && (
            <form id="pulse-create-user" onSubmit={handleCreateUser} className="mb-4 flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">{t("Create user")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("No invitation email is sent. Add this email to Cloudflare Zero Trust and assign module access after creation.")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label htmlFor="pulse-new-username" className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  {t("Username")}
                  <Input
                    id="pulse-new-username"
                    autoComplete="username"
                    maxLength={50}
                    required
                    disabled={isCreatingUser}
                    value={newUser.username}
                    onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
                    className="h-11"
                  />
                </label>
                <label htmlFor="pulse-new-email" className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  {t("Email Address")}
                  <Input
                    id="pulse-new-email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={isCreatingUser}
                    value={newUser.email}
                    onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                    className="h-11"
                  />
                </label>
                <label htmlFor="pulse-new-password" className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  {t("Initial password")}
                  <Input
                    id="pulse-new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={isCreatingUser}
                    value={newUser.password}
                    onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                    className="h-11"
                  />
                </label>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCreatingUser}
                  onClick={() => {
                    setIsCreateUserOpen(false);
                    setNewUser({ username: "", email: "", password: "" });
                  }}
                  className="min-h-11"
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={isCreatingUser} className="min-h-11 bg-brand px-4 text-[#111] hover:bg-brand-hover">
                  {isCreatingUser ? t("Creating...") : t("Create user")}
                </Button>
              </div>
            </form>
          )}

          {visibleUsers.length === 0 ? (
            <div className="rounded-xl bg-card p-10 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
              {t("No users found.")}
            </div>
          ) : (
            <ul className="divide-y divide-white/10 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {visibleUsers.map((u) => (
                <UserRow
                  key={u.userId}
                  u={u}
                  username={username}
                  now={now}
                  isExpanded={expandedUserId === u.userId}
                  isEditingEmail={editingEmailUserId === u.userId}
                  isLoading={loadingUserId === u.userId}
                  emailInput={emailInput}
                  setEmailInput={setEmailInput}
                  modulesList={modulesList}
                  serversList={serversList}
                  toggleExpanded={toggleExpanded}
                  handleSaveEmail={handleSaveEmail}
                  handleStartEditEmail={handleStartEditEmail}
                  setEditingEmailUserId={setEditingEmailUserId}
                  handleToggleModule={handleToggleModule}
                  handleToggleServer={handleToggleServer}
                  handleImpersonate={handleImpersonate}
                  handleToggleStatus={handleToggleStatus}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
