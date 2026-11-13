import { AuthService } from "../auth";
import { grantModule, revokeModule } from "../auth/modules";
import { MinecraftPermissions } from "../modules/minecraft/minecraft-permissions";
import db from "../db/client";
import { mc_servers, modules } from "../db/schema";
import { findModule, findServer, findUser, handleError } from "./user-manager-shared";

const auth = new AuthService();
const serverPermissions = new MinecraftPermissions();

function missingModule(targetModule: string, allModules: { moduleName: string; moduleId: number }[]) {
  handleError(
    `Fout: Module '${targetModule}' bestaat niet.\nBeschikbare modules: ${allModules
      .map((m) => `${m.moduleName} (ID: ${m.moduleId})`)
      .join(", ")}`,
  );
}

function missingServer(targetServer: string, allServers: { slug: string; serverId: number }[]) {
  handleError(
    `Fout: Server '${targetServer}' bestaat niet.\nBeschikbare servers: ${allServers
      .map((s) => `${s.slug} (ID: ${s.serverId})`)
      .join(", ")}`,
  );
}

export async function listPermissions(identifier: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const allModules = db.select().from(modules).all();
    const granted = new Set(auth.getUserModules(user.userId));

    console.log(`\nModule-permissies voor gebruiker '${user.username}' (ID: ${user.userId}):`);
    if (allModules.length === 0) {
      console.log("  (Geen modules gevonden in de database)");
      return;
    }

    for (const mod of allModules) {
      const status = granted.has(mod.moduleName) ? "[TOEGESTAAN]" : "[GEWEIGERD] ";
      console.log(
        `  ${status} ID: ${mod.moduleId} | ${mod.moduleName}${mod.moduleAlias ? ` (${mod.moduleAlias})` : ""}`,
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
      missingModule(targetModule, allModules);
      return;
    }

    if (!grantModule(user.userId, mod.moduleId)) {
      console.log(
        `Gebruiker '${user.username}' heeft al permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}).`,
      );
      return;
    }

    console.log(
      `Permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}) succesvol toegekend aan '${user.username}'.`,
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
      missingModule(targetModule, allModules);
      return;
    }

    if (!revokeModule(user.userId, mod.moduleId)) {
      console.log(
        `Gebruiker '${user.username}' heeft geen permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}).`,
      );
      return;
    }

    console.log(
      `Permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}) succesvol ingetrokken van '${user.username}'.`,
    );
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het intrekken van de permissie: ${error}`);
  }
}

export async function listServerPermissions(identifier: string) {
  try {
    const user = findUser(identifier);
    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const allServers = db.select().from(mc_servers).all();
    const grantedServerIds = serverPermissions.serverIdsOf(user.userId);

    console.log(`\nMinecraft server monitor-permissies voor gebruiker '${user.username}' (ID: ${user.userId}):`);
    if (allServers.length === 0) {
      console.log("  (Geen servers gevonden in de database)");
      return;
    }

    for (const srv of allServers) {
      const status = grantedServerIds.has(srv.serverId) ? "[TOEGESTAAN]" : "[GEWEIGERD] ";
      console.log(`  ${status} ID: ${srv.serverId} | ${srv.displayName} (${srv.slug})`);
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
      missingServer(targetServer, allServers);
      return;
    }

    if (!serverPermissions.grant(user.userId, server.serverId)) {
      console.log(
        `Gebruiker '${user.username}' heeft al monitor-toegang tot server '${server.displayName}' (${server.slug}).`,
      );
      return;
    }

    console.log(
      `Monitor-toegang tot server '${server.displayName}' (${server.slug}) succesvol toegekend aan '${user.username}'.`,
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
      missingServer(targetServer, allServers);
      return;
    }

    if (!serverPermissions.revoke(user.userId, server.serverId)) {
      console.log(
        `Gebruiker '${user.username}' heeft geen monitor-toegang tot server '${server.displayName}' (${server.slug}).`,
      );
      return;
    }

    console.log(
      `Monitor-toegang tot server '${server.displayName}' (${server.slug}) succesvol ingetrokken van '${user.username}'.`,
    );
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het intrekken van de server-permissie: ${error}`);
  }
}
