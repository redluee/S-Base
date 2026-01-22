import { join } from "path";

// import services
import { AuthService } from "./auth/index";
import { DashboardService } from "./base/dashboard";
import { RecipeService } from "./modules/recipes/index";

// import routers
import { handleAuthRoutes } from "./auth/router";
import { handleRecipeRoutes } from "./modules/recipes/router";

const PUBLIC_PATH = join(process.cwd(), "public");

const INDEX_HTML = await Bun.file(join(PUBLIC_PATH, "index.html")).bytes();
const NOT_FOUND_HTML = await Bun.file(join(PUBLIC_PATH, "404.html")).text();

function getCookieValue(
	cookieHeader: string | null | undefined,
	name = "session_id",
): string | null {
	if (!cookieHeader) return null;
	// Escape name for regex
	const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
	const regex = new RegExp("(?:^|;\\s*)" + escapedName + "=([^;]*)");
	const match = cookieHeader.match(regex);
	return match ? decodeURIComponent(match[1] ?? "") : null;
}

export async function handleRequest(
	request: Request,
	services: { auth: AuthService; dashboard: DashboardService; recipe: RecipeService },
): Promise<Response> {
	let url = new URL(request.url);
	let path = url.pathname;

	console.log(`Received request for: ${path}`);

	try {
		//root path to index.html

		if (path == "/" || path == "/index.html") {
			return new Response(INDEX_HTML, {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}

		if (path == "/login") {
			return handleAuthRoutes(request, services.auth);
		}

		const sessionId = getCookieValue(
			request.headers.get("cookie"),
			"session_id",
		);
		const isAuthenticated = sessionId ? services.auth.verifySession(sessionId) : false;

		if (sessionId && isAuthenticated) {
			switch (true) {
				case path === "/dashboard":
					const dashboardHTML = await services.dashboard.getDashboard(sessionId);
					return new Response(dashboardHTML, {
						headers: { "Content-Type": "text/html; charset=utf-8" },
					});

				case path.startsWith("/recipes"):
				// if(moduleAccessCheck(sessionToken)){
				//	reroute to reciperouter
				// }
			}
		}

		const assetFile = Bun.file(join(PUBLIC_PATH, path));
		if (await assetFile.exists()) {
			return new Response(assetFile);
		}

		const seedednotFoundPage = NOT_FOUND_HTML.replace("{{path}}", path);
		return new Response(seedednotFoundPage, {
			headers: { "Content-Type": "text/html; charset=utf-8" },
			status: 404,
		});
	} catch (error) {
		console.error(`Error handling request for ${path}:`, error);
		return new Response("Internal Server Error", { status: 500 });
	}
}
