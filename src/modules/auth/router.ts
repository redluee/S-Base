import type { AuthService } from "./index";

/**
 * Handles HTTP requests specifically for the Auth module.
 * It parses the request, calls the service, and returns a redirect.
 */
export async function handleAuthRoutes(req: Request, authService: AuthService): Promise<Response> {
    const url = new URL(req.url);

    // Route: POST /login
    if (req.method === "POST" && url.pathname === "/login") {
        try {
            // 1. Parse HTTP Form Data
            const formData = await req.formData();
            const username = formData.get("username") as string;
            const password = formData.get("password") as string;

            // 2. Call the Service (Logic Layer)
            const isValid = await authService.verifyCredentials(username, password);

            // 3. Determine HTTP Response
            if (isValid) {
                console.log(`Login successful: ${username}`);
                // In the future: Set-Cookie headers would go here
                return Response.redirect(new URL("/dashboard.html", req.url).toString(), 302);
            } else {
                // Redirect back to login on failure
                return Response.redirect(new URL("/", req.url).toString(), 302);
            }
        } catch (err) {
            return new Response("Bad Request", { status: 400 });
        }
    }

    // Return 404 if the auth router received a request it doesn't know how to handle
    return new Response("Auth route not found", { status: 404 });
}