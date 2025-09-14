import fastify from "fastify";
import "dotenv/config";
import fs from "fs/promises";
import etag from "@fastify/etag";
import staticPlugin from "@fastify/static";
import path from "path";
import { fileURLToPath } from 'url';
import { css2 } from "./css2.mjs";
import { css } from "./css.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const domain = process.env.DOMAIN ?? "localhost";
if (!domain) {
  throw new Error("Please set DOMAIN in .env file.");
}

const server = fastify();

// Register plugins
server.register(etag);
server.register(staticPlugin, {
  root: path.join(__dirname),
  prefix: '/', // optional: default '/'
});

// Load only subsets data - no external font list needed
const subsets = JSON.parse(await fs.readFile("./subsets.json", "utf8"));
server.get("/", (response, reply) => {
  if (process.env.NODE_ENV === "development") {
    return reply.code(200).send("Hello from DEV.");
  }
  reply.redirect("https://fonts.coollabs.io");
});
server.get("/icon", async (request, reply) => {
  const css = `/* fallback */
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url(https://cdn.fonts.coollabs.io/icons/material-icons/v125.woff2) format('woff2');
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}`;
  reply.header("content-type", "text/css");
  reply.send(css);
  return reply.end();
});
server.get("/css", async (request, reply) => {
  return css(request, reply, null, domain, subsets);
});
server.get("/css2", async (request, reply) => {
  return css2(request, reply, null, domain, subsets);
});
if (process.env.NODE_ENV === "development") {
  server.get("/demo", async (request, reply) => {
    return reply.sendFile("./demo.html");
  });
}

try {
  await server.listen({ port: 3000, host: "0.0.0.0" });
  console.log(
    `Server listening on http://0.0.0.0:${server.server.address().port}`
  );
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
