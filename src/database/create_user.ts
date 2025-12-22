import { exit } from "process";
import db  from ".";

console.log("-- Create new user; --");

const username = prompt("Enter new username:");
const usernameRegex = /^[\w\-\p{L}]+$/u;
const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};'"\\|,.<>\/?`~]+$/;
if (!username) {
    console.error("Username is required.");
    process.exit(1);
}
if (username.length < 4) {
    console.error("Username must be at least 4 characters long.");
    process.exit(1);
}
// only allow alphanumeric usernames
if (!usernameRegex.test(username)) {
    console.error("Username can only contain alphanumeric characters and underscores.");
    process.exit(1);
}
// check if username already exists
const existingUser = db.query<{ username: string }, [string]>(
    "SELECT username FROM users WHERE username = ? LIMIT 1"
).get(username);
if (existingUser) {
    console.error(`Username "${username}" is already taken.`);
    process.exit(1);
}

const password = prompt("Enter new password:");
if (!password) {
    console.error("Password is required.");
    process.exit(1);
}
if (password.length < 5) {
    console.error("Password must be at least 5 characters long.");
    process.exit(1);
}
// password can only contain certain special characters and alphanumerics
if (!passwordRegex.test(password)) {
    console.error("Password contains invalid characters.");
    process.exit(1);
}

const pswd_hash = await Bun.password.hash(password);

let user_id: number | undefined;
try {
    const insert = db.prepare("INSERT INTO users (username, pswd_hash) VALUES (?, ?)");
    const result = insert.run(username, pswd_hash);
    // Check result for success
    if (!result || (typeof result === 'object' && 'changes' in result && (result as any).changes === 0)) {
        console.error("Error: user insert did not affect any rows.");
        process.exit(1);
    }
    // Prefer lastInsertRowid when available
    if (result && typeof result === 'object' && 'lastInsertRowid' in result) {
        user_id = (result as any).lastInsertRowid as number;
    }

    // If lastInsertRowid wasn't provided, try to fetch the inserted row directly
    if (!user_id) {
        try {
            const userRow = db.query<{ user_id: number }, [string]>(
                "SELECT user_id FROM users WHERE username = ? LIMIT 1"
            ).get(username);
            if (userRow) user_id = userRow.user_id;
        } catch (err) {
            console.error("Warning: could not fetch user_id after insert:", err);
        }
    }

    console.log(`User "${username}" created successfully (insert result: ${JSON.stringify(result)}).`);
} catch (error) {
    console.error("Error creating user:", error);
    process.exit(1);
}

// Ensure we have the user's id before proceeding
if (!user_id) {
    const userRow = db.query<{ user_id: number }, [string]>(
        "SELECT user_id FROM users WHERE username = ? LIMIT 1"
    ).get(username);
    if (!userRow) {
        console.error("Error retrieving new user ID after insert.");
        process.exit(1);
    }
    user_id = userRow.user_id;
}

// Assign module permission per module
// get all modules
const modules = db.query<{ module_id: number; module_name: string }, []>(
    "SELECT module_id, module_name FROM modules"
).all();

const permissionInsert = db.prepare(
    // use the actual table/name from your migration and columns
    "INSERT INTO usermodulepermissions (user_id, module_id) VALUES (?, ?)"
);

// ask for each module if user should have access
for (const m of modules) {
    const hasAccess = prompt(`Should user "${username}" have access to module "${m.module_name}"? (y/n)`);
    if (hasAccess === "y") {
        try {
            const pRes = permissionInsert.run(user_id, m.module_id);
            // Some Bun versions return an object with 'changes'; check that
            if (!pRes || (typeof pRes === 'object' && 'changes' in pRes && (pRes as any).changes === 0)) {
                console.error(`Failed to assign permission for module ${m.module_name}: no rows affected`);
            }
        } catch (err: any) {
            // If it's a UNIQUE constraint (already granted), just warn and continue
            if (err?.message?.includes("UNIQUE") || err?.code === "SQLITE_CONSTRAINT") {
                console.warn(`Permission for module ${m.module_name} already exists, skipping.`);
            } else {
                console.error("Failed to assign permission for module", m.module_name, err);
            }
        }
    }
}
