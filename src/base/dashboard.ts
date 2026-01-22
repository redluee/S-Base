import type { BunFile } from "bun";
import type { Database } from "bun:sqlite";

export class DashboardService {
	private db: Database;
	private dashboard: any = Bun.file("./src/pages/dashboard.html");

	constructor(db: Database) {
		this.db = db;
	}

	public async getDashboard(sessionId: string): Promise<string> {
		const usernameQuery = this.db.query<{ username: string }, [string]>(`
			SELECT u.username
			FROM sessions s
			JOIN users u ON s.user_id = u.user_id
			WHERE session_id = ? 
			AND s.expires_at > CURRENT_TIMESTAMP
			`);

		const result = usernameQuery.get(sessionId);
		const username = result?.username;

		const dashboardContent = await this.dashboard.text();
		const filledDashboard = dashboardContent.replace("{{username}}", username);

		return filledDashboard;
	}
}
