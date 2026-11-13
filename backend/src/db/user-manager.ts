import { ensureDefaultModules } from "../auth/modules";
import { handleError, cliState } from "./user-manager-shared";
import { listUsers, createUser, deleteUser, changePassword, renameUser, setEmail } from "./user-manager-users";
import {
  listPermissions,
  grantPermission,
  revokePermission,
  listServerPermissions,
  grantServerPermission,
  revokeServerPermission,
} from "./user-manager-permissions";
import { interactiveMenu } from "./user-manager-menu";

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
  servers <username|id>                          Bekijk de Minecraft server-permissies van een gebruiker
  grant-server <username|id> <server-slug>       Koppel server monitor-toegang aan een gebruiker
  revoke-server <username|id> <server-slug>      Trek server monitor-toegang in van een gebruiker
`;

async function main() {
  ensureDefaultModules();
  const args = process.argv.slice(2);
  if (args.length === 0) {
    cliState.isInteractive = true;
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
    case "servers":
    case "server-permissions": {
      if (args.length < 2) {
        handleError("Fout: Gebruik: bun run db:user servers <username|id>");
        break;
      }
      const [, identifier] = args;
      await listServerPermissions(identifier);
      break;
    }
    case "grant-server": {
      if (args.length < 3) {
        handleError("Fout: Gebruik: bun run db:user grant-server <username|id> <server-slug>");
        break;
      }
      const [, identifier, serverSlug] = args;
      await grantServerPermission(identifier, serverSlug);
      break;
    }
    case "revoke-server": {
      if (args.length < 3) {
        handleError("Fout: Gebruik: bun run db:user revoke-server <username|id> <server-slug>");
        break;
      }
      const [, identifier, serverSlug] = args;
      await revokeServerPermission(identifier, serverSlug);
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

if (import.meta.main) {
  main().catch(console.error);
}
