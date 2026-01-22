import db from "./database";
import { handleRequest } from "./router";
import { AuthService } from "./auth/index";
import { RecipeService } from "./modules/recipes/index";

const services = {
  auth: new AuthService(db),
  recipe: new RecipeService(db),
};

const port = process.env.PORT || 3000;

console.log("Starting webserver...");

const server = Bun.serve({
  port: port,

  async fetch(request: Request): Promise<Response> {
    return handleRequest(request, services);
  },

  error(error: Error): Response {
    console.error("Unhandled server error:", error);
    return new Response("Something went wrong!", { status: 500 });
  },
});

console.log(`Webserver is running on http://localhost:${server.port}`);
