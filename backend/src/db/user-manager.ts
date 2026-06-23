import { eq } from "drizzle-orm";
import db from "./client";
import { users, usermodulepermissions, modules } from "./schema";

const usage = `
Gebruik:
  bun run db:user <actie> [opties]

Acties:
  create <username> <password>                 Maak een nieuwe gebruiker aan
  delete <username>                            Verwijder een gebruiker en diens permissies/sessies
  change-password <username> <new-password>    Wijzig het wachtwoord van een gebruiker
  rename <old-username> <new-username>         Wijzig de gebruikersnaam van een gebruiker
`;

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(usage);
    process.exit(1);
  }

  const action = args[0];

  switch (action) {
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
        console.error("Fout: Gebruik: bun run db:user delete <username>");
        process.exit(1);
      }
      const [, username] = args;
      await deleteUser(username);
      break;
    }
    case "change-password": {
      if (args.length < 3) {
        console.error("Fout: Gebruik: bun run db:user change-password <username> <new-password>");
        process.exit(1);
      }
      const [, username, newPassword] = args;
      await changePassword(username, newPassword);
      break;
    }
    case "rename": {
      if (args.length < 3) {
        console.error("Fout: Gebruik: bun run db:user rename <old-username> <new-username>");
        process.exit(1);
      }
      const [, oldUsername, newUsername] = args;
      await renameUser(oldUsername, newUsername);
      break;
    }
    default: {
      console.error(`Fout: Onbekende actie '${action}'`);
      console.log(usage);
      process.exit(1);
    }
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

async function deleteUser(username: string) {
  try {
    const user = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user) {
      console.error(`Fout: Gebruiker '${username}' bestaat niet.`);
      process.exit(1);
    }

    // SQLite CASCADE foreign keys zorgt ervoor dat permissies en actieve sessies ook verwijderd worden.
    db.delete(users).where(eq(users.userId, user.userId)).run();

    console.log(`Gebruiker '${username}' (ID: ${user.userId}) en al diens permissies/sessies zijn succesvol verwijderd.`);
  } catch (error) {
    console.error("Er is een fout opgetreden bij het verwijderen van de gebruiker:", error);
    process.exit(1);
  }
}

async function changePassword(username: string, passwordPlain: string) {
  try {
    const user = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user) {
      console.error(`Fout: Gebruiker '${username}' bestaat niet.`);
      process.exit(1);
    }

    const passwordHash = await Bun.password.hash(passwordPlain, {
      algorithm: "argon2id",
    });

    db.update(users)
      .set({ pswdHash: passwordHash })
      .where(eq(users.userId, user.userId))
      .run();

    console.log(`Wachtwoord voor gebruiker '${username}' is succesvol gewijzigd.`);
  } catch (error) {
    console.error("Er is een fout opgetreden bij het wijzigen van het wachtwoord:", error);
    process.exit(1);
  }
}

async function renameUser(oldUsername: string, newUsername: string) {
  try {
    const user = db
      .select()
      .from(users)
      .where(eq(users.username, oldUsername))
      .get();

    if (!user) {
      console.error(`Fout: Gebruiker '${oldUsername}' bestaat niet.`);
      process.exit(1);
    }

    const existingNewUser = db
      .select()
      .from(users)
      .where(eq(users.username, newUsername))
      .get();

    if (existingNewUser) {
      console.error(`Fout: Een gebruiker met de naam '${newUsername}' bestaat al.`);
      process.exit(1);
    }

    db.update(users)
      .set({ username: newUsername })
      .where(eq(users.userId, user.userId))
      .run();

    console.log(`Gebruiker '${oldUsername}' is succesvol hernoemd naar '${newUsername}'.`);
  } catch (error) {
    console.error("Er is een fout opgetreden bij het hernoemen van de gebruiker:", error);
    process.exit(1);
  }
}

main().catch(console.error);
