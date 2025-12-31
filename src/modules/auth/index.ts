import type { Database } from "bun:sqlite";
import { resolve } from "path";

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
	public async verifyCredentials(
		username: string,
		pswdPlain: string
	): Promise<number | null> {
		if (!username || !pswdPlain) return null;

		try {
			// Fetch user_id and hash
			const userQuery = this.db.query<
				{ user_id: number; pswd_hash: string },
				[string]
			>("SELECT user_id, pswd_hash FROM users WHERE username = ? LIMIT 1");
			const user = userQuery.get(username);

			if (!user) return null;

			const isMatch = await Bun.password.verify(pswdPlain, user.pswd_hash);

			// Return user_id if match, otherwise null
			return isMatch ? user.user_id : null;
		} catch (error) {
			console.error("Auth Error:", error);
			return null;
		}
	}

	/**
	 * Creates a new session in the database and returns the Session ID (UUID).
	 */
	public createSession(userId: number): string {
		const sessionId = crypto.randomUUID();
		// Set expiration to 24 hours from now
		const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

		this.db.run(
			"INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)",
			[sessionId, userId, expiresAt]
		);

		return sessionId;
	}

	public verifySession(session_id: number): boolean {

		const query = this.db.run(`
            SELECT session_id
            FROM sessions
            WHERE session_id = ? AND expires_at > CURRENT_TIMESTAMP
            LIMIT 1
        `, [session_id]);

		const result = query;
		
		// if session is valid, true is returned.
		return !!result;
	}

	/**
	 * Checks if a session ID is valid and returns the associated username.
	 */
	public getUsernameFromSession(sessionId: string): string | null {
		if (!sessionId) return null;

		const query = this.db.query<{ username: string }, [string]>(`
            SELECT u.username 
            FROM sessions s
            JOIN users u ON s.user_id = u.user_id
            WHERE s.session_id = ? AND s.expires_at > CURRENT_TIMESTAMP
        `);

		const result = query.get(sessionId);
		return result ? result.username : null;
	}
}
