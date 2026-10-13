import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import db from "./client";
import { users, modules } from "./schema";
import { listUsers, createUser, deleteUser, changePassword, renameUser, setEmail } from "./user-manager-users";
import { listPermissions, grantPermission, revokePermission, listServerPermissions, grantServerPermission, revokeServerPermission } from "./user-manager-permissions";

export async function interactiveMenu() {
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
      console.log("  10) Bekijk Minecraft server-permissies van een gebruiker");
      console.log("  11) Koppel server monitor-toegang aan een gebruiker");
      console.log("  12) Trek server monitor-toegang in van een gebruiker");
      console.log("  13) Afsluiten");

      const choice = (await rl.question("\nKies een optie (1-13): ")).trim();

      if (choice === "13" || choice.toLowerCase() === "exit" || choice.toLowerCase() === "quit") {
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
        case "10": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          await listServerPermissions(identifier);
          break;
        }
        case "11": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          const serverSlug = (await rl.question("Voer server slug, naam of ID in: ")).trim();
          if (!serverSlug) {
            console.log("Geen server opgegeven. Actie geannuleerd.");
            break;
          }
          await grantServerPermission(identifier, serverSlug);
          break;
        }
        case "12": {
          const identifier = (await rl.question("Voer gebruikersnaam of ID in: ")).trim();
          if (!identifier) {
            console.log("Geen gebruiker opgegeven. Actie geannuleerd.");
            break;
          }
          const serverSlug = (await rl.question("Voer server slug, naam of ID in: ")).trim();
          if (!serverSlug) {
            console.log("Geen server opgegeven. Actie geannuleerd.");
            break;
          }
          await revokeServerPermission(identifier, serverSlug);
          break;
        }
        default:
          console.log("Ongeldige keuze. Kies een getal van 1 t/m 13.");
      }
    }
  } finally {
    rl.close();
  }
}