import { eq } from "drizzle-orm";
import db from "./client";
import { users, modules, mc_servers } from "./schema";

export const cliState = { isInteractive: false };

export function handleError(msg: string) {
  console.error(msg);
  if (!cliState.isInteractive) {
    process.exit(1);
  }
}

export function findUser(identifier: string) {
  const isNumeric = /^\d+$/.test(identifier);
  if (isNumeric) {
    const userIdNum = parseInt(identifier, 10);
    const userById = db
      .select()
      .from(users)
      .where(eq(users.userId, userIdNum))
      .get();
    if (userById) return userById;
  }

  return db
    .select()
    .from(users)
    .where(eq(users.username, identifier))
    .get();
}

export function findModule(targetModule: string) {
  const allModules = db.select().from(modules).all();
  const isNumeric = /^\d+$/.test(targetModule);
  if (isNumeric) {
    const modIdNum = parseInt(targetModule, 10);
    const modById = allModules.find((m) => m.moduleId === modIdNum);
    if (modById) return { mod: modById, allModules };
  }

  const mod = allModules.find(
    (m) =>
      m.moduleName.toLowerCase() === targetModule.toLowerCase() ||
      (m.moduleAlias && m.moduleAlias.toLowerCase() === targetModule.toLowerCase())
  );
  return { mod, allModules };
}

export function findServer(targetServer: string) {
  const allServers = db.select().from(mc_servers).all();
  const isNumeric = /^\d+$/.test(targetServer);
  if (isNumeric) {
    const srvIdNum = parseInt(targetServer, 10);
    const srvById = allServers.find((s) => s.serverId === srvIdNum);
    if (srvById) return { server: srvById, allServers };
  }

  const srv = allServers.find(
    (s) =>
      s.slug.toLowerCase() === targetServer.toLowerCase() ||
      s.displayName.toLowerCase() === targetServer.toLowerCase()
  );
  return { server: srv, allServers };
}