import { eq, inArray } from "drizzle-orm";
import db from "../../db/client";
import { users, modules, usermodulepermissions } from "../../db/schema";

export interface PulseUser {
  userId: number;
  username: string;
  email: string | null;
  isPaused: number;
  lastLoginAt: string | null;
  createdAt: string | null;
  modules: string[];
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

export class PulseService {
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

    return allUsers.map((u) => ({
      ...u,
      modules: permsByUser.get(u.userId) ?? [],
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

  updateEmail(userId: number, email: string | null): PulseUser | null {
    const trimmedEmail = email ? email.trim() : null;
    db.update(users)
      .set({ email: trimmedEmail })
      .where(eq(users.userId, userId))
      .run();

    const user = this.listUsers().find((u) => u.userId === userId);
    return user ?? null;
  }

  updateStatus(userId: number, isPaused: number): PulseUser | null {
    db.update(users)
      .set({ isPaused: isPaused ? 1 : 0 })
      .where(eq(users.userId, userId))
      .run();

    const user = this.listUsers().find((u) => u.userId === userId);
    return user ?? null;
  }

  updateModules(userId: number, moduleNames: string[]): PulseUser | null {
    // Delete existing permissions for user
    db.delete(usermodulepermissions)
      .where(eq(usermodulepermissions.userId, userId))
      .run();

    if (moduleNames.length > 0) {
      const targetModules = db
        .select({ moduleId: modules.moduleId, moduleName: modules.moduleName })
        .from(modules)
        .where(inArray(modules.moduleName, moduleNames))
        .all();

      for (const m of targetModules) {
        db.insert(usermodulepermissions)
          .values({ userId, moduleId: m.moduleId })
          .run();
      }
    }

    const user = this.listUsers().find((u) => u.userId === userId);
    return user ?? null;
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
