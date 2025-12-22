import { join } from "path";
import { AuthService } from "./modules/auth/index";
import { handleAuthRoutes } from "./modules/auth/router";

const PUBLIC_PATH = join(process.cwd(), "public");
console.log(`Serving static files from: ${PUBLIC_PATH}`);

let cachedDashboardTemplate: string | null = null;

function getCookieValue(cookieHeader: string | null | undefined, name = "session_id"): string | null {
    if (!cookieHeader) return null;
    // Escape name for regex
    const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp("(?:^|;\\s*)" + escapedName + "=([^;]*)");
    const match = cookieHeader.match(regex);
    return match ? decodeURIComponent(match[1] ?? "") : null;
}

export async function handleRequest(
	request: Request,
	db: any
): Promise<Response> {
	let url = new URL(request.url);
	let path = url.pathname;

	console.log(`Received request for: ${path}`);

	const AuthServiceInstance = new AuthService(db);

	try {
		//root path to index.html
		switch (path) {
			case "/":
				path = "/index.html";
				break;
			
			case "/dashboard":
				if (!cachedDashboardTemplate) {
                    cachedDashboardTemplate = await Bun.file(
                        "./src/pages/dashboard.html"
                    ).text();
                }

                const sessionId = getCookieValue(request.headers.get("cookie"), "session_id");
                const username = AuthServiceInstance.getUsernameFromSession(sessionId ?? "") ?? "guest";
				const injectedHTML = cachedDashboardTemplate.replace(/{{username}}/g, username);
				return new Response(injectedHTML, {
					status: 200,
					headers: { "Content-Type": "text/html; charset=utf-8" },
				});

			case "/login":
				return handleAuthRoutes(request, AuthServiceInstance);
				break;
		}

		const filePath = join(PUBLIC_PATH, path);

		// Bun.file() creates a reference to a file
		const file = Bun.file(filePath);

		// Check if the file exists
		if (await file.exists()) {
			return new Response(file);
		}

		// If the file doesn't exist, return a 404 response
		console.error(`File not found: ${filePath}`);

		return new Response("Not Found", { status: 404 });
	} catch (error) {
		console.error(`Error handling request for ${path}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
}
