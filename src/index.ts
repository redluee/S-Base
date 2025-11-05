import db from "./database";
import { handleRequest } from "./router";

const port = process.env.PORT || 3000;

console.log("Starting webserver...");

const server = Bun.serve({
  port: port,

  async fetch(request: Request): Promise<Response> {
    return handleRequest(request, db);
  },

  error(error: Error): Response {
    console.error("Unhandled server error:", error);
    return new Response("Something went wrong!", { status: 500 });
  },
});

console.log(`Webserver is running on http://localhost:${server.port}`);
