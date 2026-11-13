import { hashPassword } from "../../auth";
import { and, eq, inArray, ne, type SQL, sql } from "drizzle-orm";
import db from "../../db/client";
import { ConflictError, NotFoundError, ValidationError, orNotFound } from "../../utils/errors";
import { users, modules, usermodulepermissions, mc_servers, mc_server_permissions } from "../../db/schema";

export interface PulseUser {
  userId: number;
  username: string;
  email: string | null;
  isPaused: number;
  lastLoginAt: string | null;
  createdAt: string | null;
  modules: string[];
  mcServers: string[];
}

export interface PulseModuleInfo {
  moduleId: number;
  moduleName: string;
  moduleAlias: string | null;
  description: string | null;
}

export interface PulseStats {
  totalUsers: number;
  activeUsers: number;
  pausedUsers: number;
  totalPermissions: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_USERNAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 8;

function groupBy<T>(rows: T[], key: (row: T) => number, value: (row: T) => string): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const row of rows) map.set(key(row), [...(map.get(key(row)) ?? []), value(row)]);
  return map;
}

function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) throw new ValidationError("pulse.emailInvalid");
  return email;
}

export class PulseUsers {
  private queryUsers(where?: SQL): PulseUser[] {
    const userRows = db
      .select({
        userId: users.userId,
        username: users.username,
        email: users.email,
        isPaused: users.isPaused,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .all();
    if (userRows.length === 0) return [];
    const ids = userRows.map((u) => u.userId);

    const modulesByUser = groupBy(
      db
        .select({ userId: usermodulepermissions.userId, moduleName: modules.moduleName })
        .from(usermodulepermissions)
        .innerJoin(modules, eq(usermodulepermissions.moduleId, modules.moduleId))
        .where(inArray(usermodulepermissions.userId, ids))
        .all(),
      (p) => p.userId,
      (p) => p.moduleName,
    );
    const serversByUser = groupBy(
      db
        .select({ userId: mc_server_permissions.userId, slug: mc_servers.slug })
        .from(mc_server_permissions)
        .innerJoin(mc_servers, eq(mc_server_permissions.serverId, mc_servers.serverId))
        .where(inArray(mc_server_permissions.userId, ids))
        .all(),
      (p) => p.userId,
      (p) => p.slug,
    );

    return userRows.map((u) => ({
      ...u,
      modules: modulesByUser.get(u.userId) ?? [],
      mcServers: serversByUser.get(u.userId) ?? [],
    }));
  }

  listUsers(): PulseUser[] {
    return this.queryUsers();
  }

  getUser(userId: number): PulseUser {
    return orNotFound(this.queryUsers(eq(users.userId, userId))[0], "pulse.userNotFound");
  }

  private requireFreeEmail(email: string, exceptUserId?: number) {
    const sameEmail = sql`lower(${users.email}) = ${email}`;
    const existing = db
      .select({ userId: users.userId })
      .from(users)
      .where(exceptUserId === undefined ? sameEmail : and(sameEmail, ne(users.userId, exceptUserId)))
      .get();
    if (existing) throw new ConflictError("pulse.emailExists");
  }

  listModules(): PulseModuleInfo[] {
    return db
      .select({
        moduleId: modules.moduleId,
        moduleName: modules.moduleName,
        moduleAlias: modules.moduleAlias,
        description: modules.description,
      })
      .from(modules)
      .all();
  }

  async createUser(usernameInput: string, emailInput: string, password: string): Promise<PulseUser> {
    const username = usernameInput.trim();
    if (!username) throw new ValidationError("pulse.usernameRequired");
    if (username.length > MAX_USERNAME_LENGTH) throw new ValidationError("pulse.usernameTooLong");
    const email = normalizeEmail(emailInput);
    if (password.length < MIN_PASSWORD_LENGTH) throw new ValidationError("pulse.passwordTooShort");

    const existingUsername = db.select({ userId: users.userId }).from(users).where(eq(users.username, username)).get();
    if (existingUsername) throw new ConflictError("pulse.usernameExists");
    this.requireFreeEmail(email);

    const pswdHash = await hashPassword(password);
    const created = db.insert(users).values({ username, email, pswdHash }).returning({ userId: users.userId }).get();
    if (!created) throw new NotFoundError("pulse.userNotFound");
    return this.getUser(created.userId);
  }

  updateEmail(userId: number, emailInput: string | null): PulseUser {
    this.getUser(userId);
    const email = emailInput?.trim() ? normalizeEmail(emailInput) : null;
    if (email) this.requireFreeEmail(email, userId);
    db.update(users).set({ email }).where(eq(users.userId, userId)).run();
    return this.getUser(userId);
  }

  updateStatus(userId: number, isPaused: number): PulseUser {
    db.update(users)
      .set({ isPaused: isPaused ? 1 : 0 })
      .where(eq(users.userId, userId))
      .run();

    return this.getUser(userId);
  }

  updateModules(userId: number, moduleNames: string[]): PulseUser {
    this.getUser(userId);
    db.transaction((tx) => {
      tx.delete(usermodulepermissions).where(eq(usermodulepermissions.userId, userId)).run();
      if (moduleNames.length === 0) return;
      const targets = tx
        .select({ moduleId: modules.moduleId })
        .from(modules)
        .where(inArray(modules.moduleName, moduleNames))
        .all();
      for (const m of targets) tx.insert(usermodulepermissions).values({ userId, moduleId: m.moduleId }).run();
    });

    return this.getUser(userId);
  }

  updateServerPermissions(userId: number, serverSlugs: string[]): PulseUser {
    this.getUser(userId);
    db.transaction((tx) => {
      tx.delete(mc_server_permissions).where(eq(mc_server_permissions.userId, userId)).run();
      if (serverSlugs.length === 0) return;
      const targets = tx
        .select({ serverId: mc_servers.serverId })
        .from(mc_servers)
        .where(inArray(mc_servers.slug, serverSlugs))
        .all();
      for (const t of targets) tx.insert(mc_server_permissions).values({ userId, serverId: t.serverId }).run();
    });

    return this.getUser(userId);
  }

  getStats(): PulseStats {
    const usersList = this.listUsers();
    const totalUsers = usersList.length;
    const pausedUsers = usersList.filter((u) => u.isPaused === 1).length;
    const activeUsers = totalUsers - pausedUsers;
    const totalPermissions = usersList.reduce((acc, u) => acc + u.modules.length, 0);

    return {
      totalUsers,
      activeUsers,
      pausedUsers,
      totalPermissions,
    };
  }
}
