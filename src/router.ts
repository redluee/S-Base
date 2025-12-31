import { join } from "path";

// import services
import { AuthService } from "./modules/auth/index";
import { RecipeService } from "./modules/recipes/index";

// import routers
import { handleAuthRoutes } from "./modules/auth/router";
import { handleRecipeRoutes } from "./modules/recipes/router";

const PUBLIC_PATH = join(process.cwd(), "public");
console.log(`Serving static files from: ${PUBLIC_PATH}`);

let cachedDashboardTemplate: string | null = null;
let navigationbar: string | null = null;

function getCookieValue(
	cookieHeader: string | null | undefined,
	name = "session_id"
): string | null {
	if (!cookieHeader) return null;
	// Escape name for regex
	const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
	const regex = new RegExp("(?:^|;\\s*)" + escapedName + "=([^;]*)");
	const match = cookieHeader.match(regex);
	return match ? decodeURIComponent(match[1] ?? "") : null;
}

async function getNavigationBar(): Promise<string | null> {
	if (navigationbar) {
		return navigationbar;
	}
	// Load navigation bar HTML from file
	navigationbar =
		(await Bun.file("./src/pages/navigation.html").text()) || null;
	return navigationbar;
}

export async function handleRequest(
	request: Request,
	db: any
): Promise<Response> {
	let url = new URL(request.url);
	let path = url.pathname;

	console.log(`Received request for: ${path}`);

	const AuthServiceInstance = new AuthService(db);
	const RecipeServiceInstance = new RecipeService(db);

	try {
		//root path to index.html

		switch (true) {
			case path == "/":
				path = "/index.html";
				break;

			case path == "/login":
			case path == "/logout":
				return handleAuthRoutes(request, AuthServiceInstance);

			case path == "/dashboard":
				const sessionId = getCookieValue(
					request.headers.get("cookie"),
					"session_id"
				);

				if (
					sessionId &&
					AuthServiceInstance.verifySession(parseInt(sessionId))
				) {
					if (!cachedDashboardTemplate) {
						cachedDashboardTemplate = await Bun.file(
							"./src/pages/dashboard.html"
						).text();
					}
					const username =
						AuthServiceInstance.getUsernameFromSession(sessionId);
					const navigationbar = await getNavigationBar();
					const data = {
						username: username,
						navigationbar: navigationbar,
					};

					const injectedHTML = cachedDashboardTemplate.replace(
						/{{\s*(\w+)\s*}}/g,
						(_, key: string) => data[key as keyof typeof data] || ""
					);

					return new Response(injectedHTML, {
						status: 200,
						headers: { "Content-Type": "text/html; charset=utf-8" },
					});
				} else {
					path = "/index.html";
					break;
				}
			
			case path.startsWith("/recipes"):
				return handleRecipeRoutes(request, RecipeServiceInstance);

			case path.startsWith("/movies"):
				path = "wip.html";
				break;

			case path.startsWith("/hue"):
				path = "wip.html";
				break;

			case path.startsWith("/notes"):
				path = "wip.html";
				break;

			case path.startsWith("/photos"):
				path = "wip.html";
				break;
			
			case path.startsWith("/volleyball"):
				path = "wip.html";
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
