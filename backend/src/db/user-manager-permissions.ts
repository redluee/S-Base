import { eq, and } from "drizzle-orm";
import db from "./client";
import { usermodulepermissions, modules, mc_servers, mc_server_permissions } from "./schema";
import { handleError, findUser, findModule } from "./user-manager-shared";

export async function listPermissions(identifier: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const allModules = db.select().from(modules).all();
    const userPerms = db
      .select()
      .from(usermodulepermissions)
      .where(eq(usermodulepermissions.userId, user.userId))
      .all();

    const grantedModuleIds = new Set(userPerms.map((p) => p.moduleId));

    console.log(`\nModule-permissies voor gebruiker '${user.username}' (ID: ${user.userId}):`);
    if (allModules.length === 0) {
      console.log("  (Geen modules gevonden in de database)");
      return;
    }

    for (const mod of allModules) {
      const hasAccess = grantedModuleIds.has(mod.moduleId);
      const status = hasAccess ? "[TOEGESTAAN]" : "[GEWEIGERD] ";
      console.log(
        `  ${status} ID: ${mod.moduleId} | ${mod.moduleName}${mod.moduleAlias ? ` (${mod.moduleAlias})` : ""}`
      );
    }
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het ophalen van permissies: ${error}`);
  }
}

export async function grantPermission(identifier: string, targetModule: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const { mod, allModules } = findModule(targetModule);

    if (!mod) {
      handleError(
        `Fout: Module '${targetModule}' bestaat niet.\nBeschikbare modules: ${allModules
          .map((m) => `${m.moduleName} (ID: ${m.moduleId})`)
          .join(", ")}`
      );
      return;
    }

    const existingPerm = db
      .select()
      .from(usermodulepermissions)
      .where(
        and(
          eq(usermodulepermissions.userId, user.userId),
          eq(usermodulepermissions.moduleId, mod.moduleId)
        )
      )
      .get();

    if (existingPerm) {
      console.log(
        `Gebruiker '${user.username}' heeft al permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}).`
      );
      return;
    }

    db.insert(usermodulepermissions)
      .values({
        userId: user.userId,
        moduleId: mod.moduleId,
      })
      .run();

    console.log(
      `Permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}) succesvol toegekend aan '${user.username}'.`
    );
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het toekennen van de permissie: ${error}`);
  }
}

export async function revokePermission(identifier: string, targetModule: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const { mod, allModules } = findModule(targetModule);

    if (!mod) {
      handleError(
        `Fout: Module '${targetModule}' bestaat niet.\nBeschikbare modules: ${allModules
          .map((m) => `${m.moduleName} (ID: ${m.moduleId})`)
          .join(", ")}`
      );
      return;
    }

    const existingPerm = db
      .select()
      .from(usermodulepermissions)
      .where(
        and(
          eq(usermodulepermissions.userId, user.userId),
          eq(usermodulepermissions.moduleId, mod.moduleId)
        )
      )
      .get();

    if (existingPerm) {
      console.log(
        `Gebruiker '${user.username}' heeft geen permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}).`
      );
      return;
    }

    db.delete(usermodulepermissions)
      .where(
        and(
          eq(usermodulepermissions.userId, user.userId),
          eq(usermodulepermissions.moduleId, mod.moduleId)
        )
      )
      .run();

    console.log(
      `Permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}) succesvol ingetrokken van '${user.username}'.`
    );
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het intrekken van de permissie: ${error}`);
  }
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

export async function listServerPermissions(identifier: string) {
  try {
    const user = findUser(identifier);
    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const allServers = db.select().from(mc_servers).all();
    const userServerPerms = db
      .select()
      .from(mc_server_permissions)
      .where(eq(mc_server_permissions.userId, user.userId))
      .all();

    const grantedServerIds = new Set(userServerPerms.map((p) => p.serverId));

    console.log(`\nMinecraft server monitor-permissies voor gebruiker '${user.username}' (ID: ${user.userId}):`);
    if (allServers.length === 0) {
      console.log("  (Geen servers gevonden in de database)");
      return;
    }

    for (const srv of allServers) {
      const hasAccess = grantedServerIds.has(srv.serverId);
      const status = hasAccess ? "[TOEGESTAAN]" : "[GEWEIGERD] ";
      console.log(
        `  ${status} ID: ${srv.serverId} | ${srv.displayName} (${srv.slug})`
      );
    }
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het ophalen van server-permissies: ${error}`);
  }
}

export async function grantServerPermission(identifier: string, targetServer: string) {
  try {
    const user = findUser(identifier);
    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const { server, allServers } = findServer(targetServer);
    if (!server) {
      handleError(
        `Fout: Server '${targetServer}' bestaat niet.\nBeschikbare servers: ${allServers
          .map((s) => `${s.slug} (ID: ${s.serverId})`)
          .join(", ")}`
      );
      return;
    }

    const existingPerm = db
      .select()
      .from(mc_server_permissions)
      .where(
        and(
          eq(mc_server_permissions.userId, user.userId),
          eq(mc_server_permissions.serverId, server.serverId)
        )
      )
      .get();

    if (existingPerm) {
      console.log(
        `Gebruiker '${user.username}' heeft al monitor-toegang tot server '${server.displayName}' (${server.slug}).`
      );
      return;
    }

    db.insert(mc_server_permissions)
      .values({
        userId: user.userId,
        serverId: server.serverId,
      })
      .run();

    console.log(
      `Monitor-toegang tot server '${server.displayName}' (${server.slug}) succesvol toegekend aan '${user.username}'.`
    );
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het toekennen van de server-permissie: ${error}`);
  }
}

export async function revokeServerPermission(identifier: string, targetServer: string) {
  try {
    const user = findUser(identifier);
    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const { server, allServers } = findServer(targetServer);
    if (!server) {
      handleError(
        `Fout: Server '${targetServer}' bestaat niet.\nBeschikbare servers: ${allServers
          .map((s) => `${s.slug} (ID: ${s.serverId})`)
          .join(", ")}`
      );
      return;
    }

    const existingPerm = db
      .select()
      .from(mc_server_permissions)
      .where(
        and(
          eq(mc_server_permissions.userId, user.userId),
          eq(mc_server_permissions.serverId, server.serverId)
        )
      )
      .get();

    if (!existingPerm) {
      console.log(
        `Gebruiker '${user.username}' heeft geen monitor-toegang tot server '${server.displayName}' (${server.slug}).`
      );
      return;
    }

    db.delete(mc_server_permissions)
      .where(
        and(
          eq(mc_server_permissions.userId, user.userId),
          eq(mc_server_permissions.serverId, server.serverId)
        )
      )
      .run();

    console.log(
      `Monitor-toegang tot server '${server.displayName}' (${server.slug}) succesvol ingetrokken van '${user.username}'.`
    );
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het intrekken van de server-permissie: ${error}`);
  }
}