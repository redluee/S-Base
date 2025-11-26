import { join } from "path";
import { AuthService } from "./modules/auth/index";
import { handleAuthRoutes } from "./modules/auth/router";

const PUBLIC_PATH = join(process.cwd(), "public");
console.log(`Serving static files from: ${PUBLIC_PATH}`);

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
    if (path === "/") {
      path = "/index.html";
    }

    // Handle login route
    if (path === "/login" && request.method === "POST") {
      return handleAuthRoutes(request, AuthServiceInstance);
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
