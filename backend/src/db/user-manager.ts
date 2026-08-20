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
  list                                           Bekijk alle gebruikers
  create <username> <password> [email] [modules] Maak een nieuwe gebruiker aan met optioneel e-mailadres en module-selectie (komma-gescheiden, 'all' of 'none')
  delete <username|id>                           Verwijder een gebruiker en diens permissies/sessies
  change-password <username|id> <new-password>   Wijzig het wachtwoord van een gebruiker
  rename <old-username|id> <new-username>        Wijzig de gebruikersnaam van een gebruiker
  set-email <username|id> <email>                Wijzig het e-mailadres van een gebruiker
  permissions <username|id>                      Bekijk de module-permissies van een gebruiker
  grant <username|id> <module>                   Koppel een module-permissie aan een gebruiker
  revoke <username|id> <module>                  Trek een module-permissie in van een gebruiker
`;

export const DEFAULT_MODULES = [
  { name: "recipes", alias: "Smaak Tracker", description: "Module voor het beheren van recepten en wijnen" },
  { name: "workout", alias: "Workout Studio", description: "Module voor het beheren van workouts, trainingssessies en lichaamsmetingen" },
  { name: "cashflow", alias: "Cashflow", description: "Module voor facturatie en financieel beheer" },
  { name: "you", alias: "Voor Jou", description: "Toegang tot stevenheijn.nl/you" },
  { name: "lyric_quotes", alias: "Lyric Quotes", description: "Toegang tot stevenheijn.nl/lyric_quotes" },
  { name: "pulse", alias: "Pulse", description: "Monitoring & admin paneel" },
  { name: "minecraft", alias: "Lobby Control", description: "Beheer van Minecraft server instances" },
];

export async function ensureDefaultModules() {
  const oldMeasurements = db.select().from(modules).where(eq(modules.moduleName, "measurements")).get();
  if (oldMeasurements) {
    db.delete(usermodulepermissions).where(eq(usermodulepermissions.moduleId, oldMeasurements.moduleId)).run();
    db.delete(modules).where(eq(modules.moduleId, oldMeasurements.moduleId)).run();
  }

  for (const mod of DEFAULT_MODULES) {
    const existing = db.select().from(modules).where(eq(modules.moduleName, mod.name)).get();
    if (!existing) {
      db.insert(modules).values({
        moduleName: mod.name,
        moduleAlias: mod.alias,
        description: mod.description,
      }).run();
    } else if (existing.moduleAlias !== mod.alias || existing.description !== mod.description) {
      db.update(modules)
        .set({ moduleAlias: mod.alias, description: mod.description })
        .where(eq(modules.moduleId, existing.moduleId))
        .run();
    }
  }
}

async function main() {
  await ensureDefaultModules();
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
        handleError("Fout: Gebruik: bun run db:user create <username> <password> [email] [modules]");
        break;
      }
      const [, username, password, emailArg, modulesArg] = args;
      const email = emailArg && emailArg !== "-" && emailArg !== "null" ? emailArg : undefined;
      const moduleSelection = modulesArg ? modulesArg.split(",").map((s) => s.trim()) : undefined;
      await createUser(username, password, email, moduleSelection);
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
    case "set-email":
    case "email": {
      if (args.length < 3) {
        handleError("Fout: Gebruik: bun run db:user set-email <username|id> <email>");
        break;
      }
      const [, identifier, email] = args;
      await setEmail(identifier, email);
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
      console.log("  5) Wijzig e-mailadres");
      console.log("  6) Verwijder een gebruiker");
      console.log("  7) Bekijk module-permissies van een gebruiker");
      console.log("  8) Koppel een module-permissie aan een gebruiker");
      console.log("  9) Trek een module-permissie in van een gebruiker");
      console.log("  10) Afsluiten");

      const choice = (await rl.question("\nKies een optie (1-10): ")).trim();

      if (choice === "10" || choice.toLowerCase() === "exit" || choice.toLowerCase() === "quit") {
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
          const emailInput = (await rl.question("Voer e-mailadres in (optioneel): ")).trim();
          const email = emailInput.length > 0 ? emailInput : undefined;

          const allModules = db.select().from(modules).all();
          let selectedModules: string[] | undefined;

          if (allModules.length > 0) {
            console.log("\nBeschikbare modules:");
            allModules.forEach((m, idx) => {
              console.log(`  ${idx + 1}) ${m.moduleName}${m.moduleAlias ? ` (${m.moduleAlias})` : ""}`);
            });
            const modInput = (
              await rl.question(
                "\nSelecteer module-toegang (komma-gescheiden nummers/namen, 'alle' [standaard], of 'geen'): "
              )
            ).trim();

            if (modInput.toLowerCase() === "geen" || modInput.toLowerCase() === "none") {
              selectedModules = [];
            } else if (modInput.length > 0 && modInput.toLowerCase() !== "alle" && modInput.toLowerCase() !== "all") {
              selectedModules = modInput.split(",").map((s) => s.trim());
            }
          }

          await createUser(username, password, email, selectedModules);
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
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          const email = (await rl.question("Voer nieuw e-mailadres in: ")).trim();
          await setEmail(identifier, email);
          break;
        }
        case "6": {
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
        case "7": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          await listPermissions(identifier);
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
          await grantPermission(identifier, mod);
          break;
        }
        case "9": {
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
          console.log("Ongeldige keuze. Kies een getal van 1 t/m 10.");
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

async function createUser(
  username: string,
  passwordPlain: string,
  email?: string,
  moduleSelection?: string[]
) {
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

    if (email) {
      const existingEmail = db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .get();

      if (existingEmail) {
        handleError(`Fout: Gebruiker met e-mailadres '${email}' bestaat al.`);
        return;
      }
    }

    const passwordHash = await Bun.password.hash(passwordPlain, {
      algorithm: "argon2id",
    });

    const result = db
      .insert(users)
      .values({
        username,
        pswdHash: passwordHash,
        email: email || null,
      })
      .returning({ insertedId: users.userId })
      .get();

    if (!result) {
      handleError("Fout: Kon de gebruiker niet toevoegen aan de database.");
      return;
    }

    const userId = result.insertedId;
    console.log(
      `Gebruiker '${username}'${email ? ` (${email})` : ""} succesvol aangemaakt met ID: ${userId}`
    );

    const allModules = db.select().from(modules).all();

    if (allModules.length > 0) {
      let targetModules = allModules;

      if (moduleSelection) {
        if (moduleSelection.length === 0) {
          targetModules = [];
        } else {
          targetModules = allModules.filter((m, idx) => {
            const indexStr = (idx + 1).toString();
            const idStr = m.moduleId.toString();
            return moduleSelection.some(
              (sel) =>
                sel.toLowerCase() === m.moduleName.toLowerCase() ||
                (m.moduleAlias && sel.toLowerCase() === m.moduleAlias.toLowerCase()) ||
                sel === idStr ||
                sel === indexStr
            );
          });
        }
      }

      if (targetModules.length > 0) {
        db.insert(usermodulepermissions)
          .values(
            targetModules.map((m) => ({
              userId,
              moduleId: m.moduleId,
            }))
          )
          .run();
        console.log(
          `Rechten voor modules (${targetModules.map((m) => m.moduleName).join(", ")}) toegekend.`
        );
      } else {
        console.log("Geen module-rechten toegekend.");
      }
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

    console.log(
      `Gebruiker '${user.username}' (ID: ${user.userId}) en al diens permissies/sessies zijn succesvol verwijderd.`
    );
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

    console.log(
      `Gebruiker '${oldName}' (ID: ${user.userId}) is succesvol hernoemd naar '${newUsername}'. Alle gekoppelde gegevens en permissies blijven behouden.`
    );
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het hernoemen van de gebruiker: ${error}`);
  }
}

async function setEmail(identifier: string, email: string) {
  try {
    const user = findUser(identifier);

    if (!user) {
      handleError(`Fout: Gebruiker '${identifier}' bestaat niet.`);
      return;
    }

    const trimmedEmail = email ? email.trim() : "";

    if (trimmedEmail) {
      const existingEmail = db
        .select()
        .from(users)
        .where(eq(users.email, trimmedEmail))
        .get();

      if (existingEmail && existingEmail.userId !== user.userId) {
        handleError(`Fout: Een gebruiker met e-mailadres '${trimmedEmail}' bestaat al.`);
        return;
      }
    }

    db.update(users)
      .set({ email: trimmedEmail.length > 0 ? trimmedEmail : null })
      .where(eq(users.userId, user.userId))
      .run();

    console.log(
      `E-mailadres voor gebruiker '${user.username}' (ID: ${user.userId}) is succesvol gewijzigd naar '${trimmedEmail || "(geen)"}'.`
    );
  } catch (error) {
    handleError(`Er is een fout opgetreden bij het instellen van het e-mailadres: ${error}`);
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
      console.log(
        `  ${status} ID: ${mod.moduleId} | ${mod.moduleName}${mod.moduleAlias ? ` (${mod.moduleAlias})` : ""}`
      );
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

async function revokePermission(identifier: string, targetModule: string) {
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

if (import.meta.main) {
  main().catch(console.error);
}
