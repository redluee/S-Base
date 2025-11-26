import type { Database } from "bun:sqlite";

/**
 * AuthService handles the business logic for authentication.
 * It interacts with the database but knows nothing about HTTP requests.
 */
export class AuthService {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Verifies if the username and password match a record in the database.
     */
    public async verifyCredentials(username: string, pswdPlain: string): Promise<boolean> {
        if (!username || !pswdPlain) return false;

        try {
            // 1. Prepare query
            const userQuery = this.db.query<{ pswd_hash: string }, [string]>(
                "SELECT pswd_hash FROM users WHERE username = ? LIMIT 1"
            );
            
            // 2. Fetch user
            const user = userQuery.get(username);

            if (!user) {
                console.warn(`Auth Failed: User not found (${username})`);
                return false;
            }

            // 3. Verify password
            const isMatch = await Bun.password.verify(pswdPlain, user.pswd_hash);
            
            if (!isMatch) {
                console.warn(`Auth Failed: Invalid password for (${username})`);
            }

            return isMatch;

        } catch (error) {
            console.error("Database error during verification:", error);
            return false;
        }
    }
}