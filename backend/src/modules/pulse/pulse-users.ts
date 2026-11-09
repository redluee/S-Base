import { eq, inArray, sql } from "drizzle-orm";
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

export class PulseUsers {
  listUsers(): PulseUser[] {
    const allUsers = db
      .select({
        userId: users.userId,
        username: users.username,
        email: users.email,
        isPaused: users.isPaused,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .all();

    const allPerms = db
      .select({
        userId: usermodulepermissions.userId,
        moduleName: modules.moduleName,
      })
      .from(usermodulepermissions)
      .innerJoin(modules, eq(usermodulepermissions.moduleId, modules.moduleId))
      .all();

    const permsByUser = new Map<number, string[]>();
    for (const p of allPerms) {
      const list = permsByUser.get(p.userId) ?? [];
      list.push(p.moduleName);
      permsByUser.set(p.userId, list);
    }

    const allServerPerms = db
      .select({
        userId: mc_server_permissions.userId,
        slug: mc_servers.slug,
      })
      .from(mc_server_permissions)
      .innerJoin(mc_servers, eq(mc_server_permissions.serverId, mc_servers.serverId))
      .all();

    const mcServersByUser = new Map<number, string[]>();
    for (const p of allServerPerms) {
      const list = mcServersByUser.get(p.userId) ?? [];
      list.push(p.slug);
      mcServersByUser.set(p.userId, list);
    }

    return allUsers.map((u) => ({
      ...u,
      modules: permsByUser.get(u.userId) ?? [],
      mcServers: mcServersByUser.get(u.userId) ?? [],
    }));
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
    const email = emailInput.trim().toLowerCase();

    if (!username) throw new ValidationError("pulse.usernameRequired");
    if (username.length > 50) throw new ValidationError("pulse.usernameTooLong");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError("pulse.emailInvalid");
    }
    if (password.length < 8) throw new ValidationError("pulse.passwordTooShort");

    const existingUsername = db.select({ userId: users.userId }).from(users).where(eq(users.username, username)).get();
    if (existingUsername) throw new ConflictError("pulse.usernameExists");

    const existingEmail = db
      .select({ userId: users.userId })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .get();
    if (existingEmail) throw new ConflictError("pulse.emailExists");

    const pswdHash = await Bun.password.hash(password, { algorithm: "argon2id" });
    const created = db.insert(users).values({ username, email, pswdHash }).returning({ userId: users.userId }).get();
    if (!created) throw new NotFoundError("pulse.userNotFound");
    return this.getUser(created.userId);
  }

  getUser(userId: number): PulseUser {
    return orNotFound(
      this.listUsers().find((u) => u.userId === userId),
      "pulse.userNotFound",
    );
  }

  updateEmail(userId: number, email: string | null): PulseUser {
    const trimmedEmail = email ? email.trim().toLowerCase() : null;
    db.update(users).set({ email: trimmedEmail }).where(eq(users.userId, userId)).run();

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
    db.delete(usermodulepermissions).where(eq(usermodulepermissions.userId, userId)).run();

    if (moduleNames.length > 0) {
      const targetModules = db
        .select({ moduleId: modules.moduleId, moduleName: modules.moduleName })
        .from(modules)
        .where(inArray(modules.moduleName, moduleNames))
        .all();

      for (const m of targetModules) {
        db.insert(usermodulepermissions).values({ userId, moduleId: m.moduleId }).run();
      }
    }

    return this.getUser(userId);
  }

  updateServerPermissions(userId: number, serverSlugs: string[]): PulseUser {
    this.getUser(userId);
    db.delete(mc_server_permissions).where(eq(mc_server_permissions.userId, userId)).run();

    if (serverSlugs.length > 0) {
      const targetServers = db
        .select({ serverId: mc_servers.serverId, slug: mc_servers.slug })
        .from(mc_servers)
        .where(inArray(mc_servers.slug, serverSlugs))
        .all();

      for (const s of targetServers) {
        db.insert(mc_server_permissions).values({ userId, serverId: s.serverId }).run();
      }
    }

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
