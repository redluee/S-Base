import { eq, and } from "drizzle-orm";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import db from "./client";
import { users, usermodulepermissions, modules } from "./schema";

let isInteractive = false;

function handleError(msg: string) {
  console.error(msg);
  if (!isInteractive) {
    process.exit(1);
  }
}

const usage = `
Gebruik:
  bun run db:user [actie] [opties]

Als er geen actie wordt meegegeven, start het interactieve menu.

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
    isInteractive = true;
    await interactiveMenu();
    return;
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
        handleError("Fout: Gebruik: bun run db:user create <username> <password>");
        break;
      }
      const [, username, password] = args;
      await createUser(username, password);
      break;
    }
    case "delete": {
      if (args.length < 2) {
        handleError("Fout: Gebruik: bun run db:user delete <username|id>");
        break;
      }
      const [, identifier] = args;
      await deleteUser(identifier);
      break;
    }
    case "change-password": {
      if (args.length < 3) {
        handleError("Fout: Gebruik: bun run db:user change-password <username|id> <new-password>");
        break;
      }
      const [, identifier, newPassword] = args;
      await changePassword(identifier, newPassword);
      break;
    }
    case "rename": {
      if (args.length < 3) {
        handleError("Fout: Gebruik: bun run db:user rename <old-username|id> <new-username>");
        break;
      }
      const [, identifier, newUsername] = args;
      await renameUser(identifier, newUsername);
      break;
    }
    case "permissions":
    case "list-permissions": {
      if (args.length < 2) {
        handleError("Fout: Gebruik: bun run db:user permissions <username|id>");
        break;
      }
      const [, identifier] = args;
      await listPermissions(identifier);
      break;
    }
    case "grant":
    case "grant-permission": {
      if (args.length < 3) {
        handleError("Fout: Gebruik: bun run db:user grant <username|id> <module>");
        break;
      }
      const [, identifier, moduleName] = args;
      await grantPermission(identifier, moduleName);
      break;
    }
    case "revoke":
    case "revoke-permission": {
      if (args.length < 3) {
        handleError("Fout: Gebruik: bun run db:user revoke <username|id> <module>");
        break;
      }
      const [, identifier, moduleName] = args;
      await revokePermission(identifier, moduleName);
      break;
    }
    case "--help":
    case "-h":
    case "help": {
      console.log(usage);
      break;
    }
    default: {
      handleError(`Fout: Onbekende actie '${action}'\n${usage}`);
      break;
    }
  }
}

async function interactiveMenu() {
  const rl = readline.createInterface({ input, output });

  console.log("\n========================================");
  console.log("   S-Base Gebruikersbeheer (Interactief)");
  console.log("========================================");

  try {
    while (true) {
      console.log("\nWat wilt u doen?");
      console.log("  1) Bekijk alle gebruikers");
      console.log("  2) Maak een nieuwe gebruiker aan");
      console.log("  3) Wijzig gebruikersnaam");
      console.log("  4) Wijzig wachtwoord");
      console.log("  5) Verwijder een gebruiker");
      console.log("  6) Bekijk module-permissies van een gebruiker");
      console.log("  7) Koppel een module-permissie aan een gebruiker");
      console.log("  8) Trek een module-permissie in van een gebruiker");
      console.log("  9) Afsluiten");

      const choice = (await rl.question("\nKies een optie (1-9): ")).trim();

      if (choice === "9" || choice.toLowerCase() === "exit" || choice.toLowerCase() === "quit") {
        console.log("Tot ziens!");
        break;
      }

      switch (choice) {
        case "1": {
          await listUsers();
          break;
        }
        case "2": {
          const username = (await rl.question("Voer gebruikersnaam in: ")).trim();
          if (!username) {
            console.log("Geen gebruikersnaam opgegeven. Actie geannuleerd.");
            break;
          }
          const password = (await rl.question("Voer wachtwoord in: ")).trim();
          if (!password) {
            console.log("Geen wachtwoord opgegeven. Actie geannuleerd.");
            break;
          }
          await createUser(username, password);
          break;
        }
        case "3": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          const newUsername = (await rl.question("Voer nieuwe gebruikersnaam in: ")).trim();
          if (!newUsername) {
            console.log("Geen nieuwe gebruikersnaam opgegeven. Actie geannuleerd.");
            break;
          }
          await renameUser(identifier, newUsername);
          break;
        }
        case "4": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          const newPassword = (await rl.question("Voer nieuw wachtwoord in: ")).trim();
          if (!newPassword) {
            console.log("Geen nieuw wachtwoord opgegeven. Actie geannuleerd.");
            break;
          }
          await changePassword(identifier, newPassword);
          break;
        }
        case "5": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in om te verwijderen: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          const confirm = (await rl.question(`Weet u zeker dat u gebruiker '${identifier}' wilt verwijderen? (j/N): `)).trim().toLowerCase();
          if (confirm === "j" || confirm === "ja" || confirm === "y" || confirm === "yes") {
            await deleteUser(identifier);
          } else {
            console.log("Verwijderen geannuleerd.");
          }
          break;
        }
        case "6": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          await listPermissions(identifier);
          break;
        }
        case "7": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          const mod = (await rl.question("Voer modulenaam, ID of alias in: ")).trim();
          if (!mod) {
            console.log("Geen module opgegeven. Actie geannuleerd.");
            break;
          }
          await grantPermission(identifier, mod);
          break;
        }
        case "8": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          const mod = (await rl.question("Voer modulenaam, ID of alias in: ")).trim();
          if (!mod) {
            console.log("Geen module opgegeven. Actie geannuleerd.");
            break;
          }
          await revokePermission(identifier, mod);
          break;
        }
        default:
          console.log("Ongeldige keuze. Kies een getal van 1 t/m 9.");
      }
    }
  } finally {
    rl.close();
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
    console.log("\nGebruikers in database:");
    if (allUsers.length === 0) {
      console.log("  (Geen gebruikers gevonden)");
      return;
    }
    for (const u of allUsers) {
      console.log(`  ID: ${u.userId} | Gebruikersnaam: ${u.username}${u.email ? ` | Email: ${u.email}` : ""}`);
    }
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het ophalen van gebruikers: ${error}`);
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
      handleError(`Fout: Gebruiker met de naam '${username}' bestaat al.`);
      return;
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
      handleError("Fout: Kon de gebruiker niet toevoegen aan de database.");
      return;
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
    handleError(`Er is een fout opgetreden bij het aanmaken van de gebruiker: ${error}`);
  }
}

async function deleteUser(identifier: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    // SQLite CASCADE foreign keys zorgt ervoor dat permissies en actieve sessies ook verwijderd worden.
    db.delete(users).where(eq(users.userId, user.userId)).run();

    console.log(`Gebruiker '${user.username}' (ID: ${user.userId}) en al diens permissies/sessies zijn succesvol verwijderd.`);
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het verwijderen van de gebruiker: ${error}`);
  }
}

async function changePassword(identifier: string, passwordPlain: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
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
    handleError(`Er is een fout opgetreden bij het wijzigen van het wachtwoord: ${error}`);
  }
}

async function renameUser(identifier: string, newUsername: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
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
      handleError(`Fout: Een gebruiker met de naam '${newUsername}' bestaat al.`);
      return;
    }

    const oldName = user.username;

    db.update(users)
      .set({ username: newUsername })
      .where(eq(users.userId, user.userId))
      .run();

    console.log(`Gebruiker '${oldName}' (ID: ${user.userId}) is succesvol hernoemd naar '${newUsername}'. Alle gekoppelde gegevens en permissies blijven behouden.`);
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het hernoemen van de gebruiker: ${error}`);
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
      console.log(`  ${status} ID: ${mod.moduleId} | ${mod.moduleName}${mod.moduleAlias ? ` (${mod.moduleAlias})` : ""}`);
    }
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het ophalen van permissies: ${error}`);
  }
}

async function grantPermission(identifier: string, targetModule: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const { mod, allModules } = findModule(targetModule);

    if (!mod) {
      handleError(`Fout: Module '${targetModule}' bestaat niet.\nBeschikbare modules: ${allModules.map((m) => `${m.moduleName} (ID: ${m.moduleId})`).join(", ")}`);
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
    handleError(`Er is een fout opgetreden bij het toekennen van de permissie: ${error}`);
  }
}

async function revokePermission(identifier: string, targetModule: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const { mod, allModules } = findModule(targetModule);

    if (!mod) {
      handleError(`Fout: Module '${targetModule}' bestaat niet.\nBeschikbare modules: ${allModules.map((m) => `${m.moduleName} (ID: ${m.moduleId})`).join(", ")}`);
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
    handleError(`Er is een fout opgetreden bij het intrekken van de permissie: ${error}`);
  }
}

main().catch(console.error);
