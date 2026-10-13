import { eq } from "drizzle-orm";
import db from "./client";
import { users, usermodulepermissions, modules } from "./schema";
import { handleError, findUser } from "./user-manager-shared";

export async function listUsers() {
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

export async function createUser(
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

export async function deleteUser(identifier: string) {
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

export async function changePassword(identifier: string, passwordPlain: string) {
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

export async function renameUser(identifier: string, newUsername: string) {
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

export async function setEmail(identifier: string, email: string) {
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