import { eq } from "drizzle-orm";
import db from "./client";
import { users } from "./schema";

const assignments = [
  { username: "admin", email: "stevenheijn2004@gmail.com" },
  { username: "Dèmi", email: "dvdejong2005@gmail.com" },
];

async function setEmails() {
  console.log("Assigning emails to users...");
  for (const { username, email } of assignments) {
    const user = db.select().from(users).where(eq(users.username, username)).get();
    if (!user) {
      console.warn(`User '${username}' not found — skipping.`);
      continue;
    }
    db.update(users).set({ email }).where(eq(users.userId, user.userId)).run();
    console.log(`Set email for '${username}' (id=${user.userId}) → ${email}`);
  }
  console.log("Done.");
}

setEmails().catch(console.error);
