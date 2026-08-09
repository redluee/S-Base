import { eq, and } from "drizzle-orm";
import db from "./client";
import { users, usermodulepermissions, modules } from "./schema";

const usage = `
Gebruik:
  bun run db:user <actie> [opties]

Acties:
  list                                         Bekijk alle gebruikers
  create <username> <password>                 Maak een nieuwe gebruiker aan
  delete <username|id>                         Verwijder een gebruiker en diens permissies/sessies
  change-password <username|id> <new-password> Wijzig het wachtwoord van een gebruiker
  rename <old-username|id> <new-username>      Wijzig de gebruikersnaam van een gebruiker
  permissions <username|id>                    Bekijk de module-permissies van een gebruiker
  grant <username|id> <module>                 Koppel een module-permissie aan een gebruiker
  revoke <username|id> <module>                Trek een module-permissie in van een gebruiker
`;

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(usage);
    process.exit(1);
  }

  const action = args[0];

  switch (action) {
    case "list":
    case "users": {
      await listUsers();
      break;
    }
    case "create": {
      if (args.length < 3) {
        console.error("Fout: Gebruik: bun run db:user create <username> <password>");
        process.exit(1);
      }
      const [, username, password] = args;
      await createUser(username, password);
      break;
    }
    case "delete": {
      if (args.length < 2) {
        console.error("Fout: Gebruik: bun run db:user delete <username|id>");
        process.exit(1);
      }
      const [, identifier] = args;
      await deleteUser(identifier);
      break;
    }
    case "change-password": {
      if (args.length < 3) {
        console.error("Fout: Gebruik: bun run db:user change-password <username|id> <new-password>");
        process.exit(1);
      }
      const [, identifier, newPassword] = args;
      await changePassword(identifier, newPassword);
      break;
    }
    case "rename": {
      if (args.length < 3) {
        console.error("Fout: Gebruik: bun run db:user rename <old-username|id> <new-username>");
        process.exit(1);
      }
      const [, identifier, newUsername] = args;
      await renameUser(identifier, newUsername);
      break;
    }
    case "permissions":
    case "list-permissions": {
      if (args.length < 2) {
        console.error("Fout: Gebruik: bun run db:user permissions <username|id>");
        process.exit(1);
      }
      const [, identifier] = args;
      await listPermissions(identifier);
      break;
    }
    case "grant":
    case "grant-permission": {
      if (args.length < 3) {
        console.error("Fout: Gebruik: bun run db:user grant <username|id> <module>");
        process.exit(1);
      }
      const [, identifier, moduleName] = args;
      await grantPermission(identifier, moduleName);
      break;
    }
    case "revoke":
    case "revoke-permission": {
      if (args.length < 3) {
        console.error("Fout: Gebruik: bun run db:user revoke <username|id> <module>");
        process.exit(1);
      }
      const [, identifier, moduleName] = args;
      await revokePermission(identifier, moduleName);
      break;
    }
    default: {
      console.error(`Fout: Onbekende actie '${action}'`);
      console.log(usage);
      process.exit(1);
    }
  }
}

function findUser(identifier: string) {
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

async function listUsers() {
  try {
    const allUsers = db.select({ userId: users.userId, username: users.username, email: users.email }).from(users).all();
    console.log("Gebruikers in database:");
    if (allUsers.length === 0) {
      console.log("  (Geen gebruikers gevonden)");
      return;
    }
    for (const u of allUsers) {
      console.log(`  ID: ${u.userId} | Gebruikersnaam: ${u.username}${u.email ? ` | Email: ${u.email}` : ""}`);
    }
  } catch (error) {
    console.error("Er is een fout opgetreden bij het ophalen van gebruikers:", error);
    process.exit(1);
  }
}

async function createUser(username: string, passwordPlain: string) {
  try {
    const existingUser = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (existingUser) {
      console.error(`Fout: Gebruiker met de naam '${username}' bestaat al.`);
      process.exit(1);
    }

    const passwordHash = await Bun.password.hash(passwordPlain, {
      algorithm: "argon2id",
    });

    const result = db
      .insert(users)
      .values({
        username,
        pswdHash: passwordHash,
      })
      .returning({ insertedId: users.userId })
      .get();

    if (!result) {
      console.error("Fout: Kon de gebruiker niet toevoegen aan de database.");
      process.exit(1);
    }

    const userId = result.insertedId;
    console.log(`Gebruiker '${username}' succesvol aangemaakt met ID: ${userId}`);

    const allModules = db.select().from(modules).all();

    if (allModules.length > 0) {
      db.insert(usermodulepermissions)
        .values(
          allModules.map((m) => ({
            userId,
            moduleId: m.moduleId,
          }))
        )
        .run();
      console.log(`Rechten voor modules (${allModules.map(m => m.moduleName).join(", ")}) toegekend.`);
    }
  } catch (error) {
    console.error("Er is een fout opgetreden bij het aanmaken van de gebruiker:", error);
    process.exit(1);
  }
}

async function deleteUser(identifier: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      console.error(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      process.exit(1);
    }

    // SQLite CASCADE foreign keys zorgt ervoor dat permissies en actieve sessies ook verwijderd worden.
    db.delete(users).where(eq(users.userId, user.userId)).run();

    console.log(`Gebruiker '${user.username}' (ID: ${user.userId}) en al diens permissies/sessies zijn succesvol verwijderd.`);
  } catch (error) {
    console.error("Er is een fout opgetreden bij het verwijderen van de gebruiker:", error);
    process.exit(1);
  }
}

async function changePassword(identifier: string, passwordPlain: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      console.error(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      process.exit(1);
    }

    const passwordHash = await Bun.password.hash(passwordPlain, {
      algorithm: "argon2id",
    });

    db.update(users)
      .set({ pswdHash: passwordHash })
      .where(eq(users.userId, user.userId))
      .run();

    console.log(`Wachtwoord voor gebruiker '${user.username}' (ID: ${user.userId}) is succesvol gewijzigd.`);
  } catch (error) {
    console.error("Er is een fout opgetreden bij het wijzigen van het wachtwoord:", error);
    process.exit(1);
  }
}

async function renameUser(identifier: string, newUsername: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      console.error(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      process.exit(1);
    }

    if (user.username === newUsername) {
      console.log(`Gebruiker '${user.username}' (ID: ${user.userId}) heeft al de gebruikersnaam '${newUsername}'.`);
      return;
    }

    const existingNewUser = db
      .select()
      .from(users)
      .where(eq(users.username, newUsername))
      .get();

    if (existingNewUser && existingNewUser.userId !== user.userId) {
      console.error(`Fout: Een gebruiker met de naam '${newUsername}' bestaat al.`);
      process.exit(1);
    }

    const oldName = user.username;

    db.update(users)
      .set({ username: newUsername })
      .where(eq(users.userId, user.userId))
      .run();

    console.log(`Gebruiker '${oldName}' (ID: ${user.userId}) is succesvol hernoemd naar '${newUsername}'. Alle gekoppelde gegevens en permissies blijven behouden.`);
  } catch (error) {
    console.error("Er is een fout opgetreden bij het hernoemen van de gebruiker:", error);
    process.exit(1);
  }
}

function findModule(targetModule: string) {
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

async function listPermissions(identifier: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      console.error(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      process.exit(1);
    }

    const allModules = db.select().from(modules).all();
    const userPerms = db
      .select()
      .from(usermodulepermissions)
      .where(eq(usermodulepermissions.userId, user.userId))
      .all();

    const grantedModuleIds = new Set(userPerms.map((p) => p.moduleId));

    console.log(`Module-permissies voor gebruiker '${user.username}' (ID: ${user.userId}):`);
    if (allModules.length === 0) {
      console.log("  (Geen modules gevonden in de database)");
      return;
    }

    for (const mod of allModules) {
      const hasAccess = grantedModuleIds.has(mod.moduleId);
      const status = hasAccess ? "[TOEGESTAAN]" : "[GEWEIGERD] ";
      console.log(`  ${status} ID: ${mod.moduleId} | ${mod.moduleName}${mod.moduleAlias ? ` (${mod.moduleAlias})` : ""}`);
    }
  } catch (error) {
    console.error("Er is een fout opgetreden bij het ophalen van permissies:", error);
    process.exit(1);
  }
}

async function grantPermission(identifier: string, targetModule: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      console.error(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      process.exit(1);
    }

    const { mod, allModules } = findModule(targetModule);

    if (!mod) {
      console.error(`Fout: Module '${targetModule}' bestaat niet.`);
      console.log(`Beschikbare modules: ${allModules.map((m) => `${m.moduleName} (ID: ${m.moduleId})`).join(", ")}`);
      process.exit(1);
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
      console.log(`Gebruiker '${user.username}' heeft al permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}).`);
      return;
    }

    db.insert(usermodulepermissions)
      .values({
        userId: user.userId,
        moduleId: mod.moduleId,
      })
      .run();

    console.log(`Permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}) succesvol toegekend aan '${user.username}'.`);
  } catch (error) {
    console.error("Er is een fout opgetreden bij het toekennen van de permissie:", error);
    process.exit(1);
  }
}

async function revokePermission(identifier: string, targetModule: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      console.error(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      process.exit(1);
    }

    const { mod, allModules } = findModule(targetModule);

    if (!mod) {
      console.error(`Fout: Module '${targetModule}' bestaat niet.`);
      console.log(`Beschikbare modules: ${allModules.map((m) => `${m.moduleName} (ID: ${m.moduleId})`).join(", ")}`);
      process.exit(1);
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

    if (!existingPerm) {
      console.log(`Gebruiker '${user.username}' heeft geen permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}).`);
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

    console.log(`Permissie voor module '${mod.moduleName}' (ID: ${mod.moduleId}) succesvol ingetrokken van '${user.username}'.`);
  } catch (error) {
    console.error("Er is een fout opgetreden bij het intrekken van de permissie:", error);
    process.exit(1);
  }
}

main().catch(console.error);

