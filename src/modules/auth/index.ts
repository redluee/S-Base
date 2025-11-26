import type { Database } from "bun:sqlite";

/**
 * Handles the /login POST request.
 * It parses form data, finds the user, and verifies the password using Bun.password.
 */
export async function handleLogin(request: Request, db: Database): Promise<Response> {
    try {
        // 1. Parse the form data (username, password) from the HTML form
        const formData = await request.formData();
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;

        if (!username || !password) {
            return new Response("Username and password are required", { status: 400 });
        }

        // 2. Find the user in the database
        const userQuery = db.query<{ pswd_hash: string }, [string]>(
            "SELECT pswd_hash FROM users WHERE username = ? LIMIT 1"
        );
        const user = userQuery.get(username);

        if (!user) {
            console.warn(`Login failed: User not found (${username})`);
            return Response.redirect(new URL("/", request.url).toString(), 302);
        }

        // 3. Verify the password using Bun's built-in, secure API
        const isMatch = await Bun.password.verify(password, user.pswd_hash);

        // 4. Handle success or failure
        if (isMatch) {
            // SUCCESS!
            // In a real app, you would create a session or JWT here.
            // For now, we'll just log success and redirect to the homepage.
            console.log(`Login successful: ${username}`);
            return Response.redirect(new URL("/dashboard.html", request.url).toString(), 302);
        } else {
            // FAILURE
            console.warn(`Login failed: Invalid password for ${username}`);
            // Redirect back to login
            return Response.redirect(new URL("/", request.url).toString(), 302);
        }

    } catch (error) {
        console.error("Error in handleLogin:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}