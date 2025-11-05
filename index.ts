import 
// create webserver with routes

const port = 3000;

const server = Bun.serve({
  port: port,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      return new Response("Hello World");
    } else if (url.pathname === "/about") {
      return new Response("About Page");
    } else {
      return new Response("Not Found", { status: 404 });
    }
  },
});

console.log(`webserver open at ${server.url}`);