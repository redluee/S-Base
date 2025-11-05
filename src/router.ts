import {join} from "path";

const PUBLIC_PATH = join(process.cwd(), 'public');
console.log(`Serving static files from: ${PUBLIC_PATH}`);

export async function handleRequest(request: Request, db: any): Promise<Response> {
    let url = new URL(request.url);
    let path = url.pathname;

    console.log(`Received request for: ${path}`);

    try {

    //root path to index.html
    if (path === '/') {
      path = '/index.html';
    }
    
    const filePath = join(PUBLIC_PATH, path);

    // Bun.file() creates a reference to a file
    const file = Bun.file(filePath);

    // Check if the file exists
    if (await file.exists()) {
      // If it exists, return the file.
      // Bun is smart enough to set the correct Content-Type header
      // (e.g., "text/html", "text/css", "application/javascript").
      return new Response(file);
    }

    // --- Route 3: Not Found (404) ---
    // If the file doesn't exist, return a 404 response
    console.warn(`File not found: ${filePath}`);
    return new Response("Not Found", { status: 404 });

  } catch (error) {
    console.error(`Error handling request for ${path}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
}