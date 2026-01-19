import type { AuthService } from "./index";

/**
 * Handles HTTP requests specifically for the Auth module.
 * It parses the request, calls the service, and returns a redirect.
 */
export async function handleAuthRoutes(
	req: Request,
	authService: AuthService
): Promise<Response> {
	const url = new URL(req.url);

	// Route: POST /login
	if (req.method === "POST" && url.pathname === "/login") {
		try {
			const formData = await req.formData();
			const username = formData.get("username") as string;
			const password = formData.get("password") as string;

			// 1. Verify Credentials
			// (Note: verifyCredentials now returns userId or null)
			const userId = await authService.verifyCredentials(username, password);

			if (userId) {
				// 2. Create Session
				const sessionId = authService.createSession(userId);

				// 3. Redirect to /dashboard and set cookie
				return new Response(null, {
					status: 302,
					headers: {
						Location: "/dashboard",
						"Set-Cookie": `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
					},
				});
			} else {
				return new Response("Invalid Username or Password", { status: 401 });
			}
		} catch (err) {
			return new Response("Bad Request", { status: 400 });
		}
	}

	// --- GET /logout ---
	if (url.pathname === "/logout") {
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/",
				// Expire the cookie immediately
				"Set-Cookie": "session_id=; Path=/; Max-Age=0",
			},
		});
	}

	// Return 404 if the auth router received a request it doesn't know how to handle
	return new Response("Auth route not found", { status: 404 });
}
