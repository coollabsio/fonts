import fastify from "fastify";
import got from "got";
import "dotenv/config";
import fs from "fs/promises";
import etag from "@fastify/etag";
const domain = process.env.DOMAIN ?? "localhost";
if (!domain) {
  throw new Error("Please set DOMAIN in .env file.");
}
const server = fastify();
const base = "gwfh.mranftl.com";
const data = await got.get(`https://${base}/api/fonts/`).json();
const subsets = JSON.parse(await fs.readFile("./subsets.json", "utf8"));
server.register(etag);
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
  try {
    const payload = [];
    let {
      family: familyQuery,
      display = null,
      subset = null,
      ver = null,
    } = request.query;
    const families = familyQuery.split("|");
    for (let family of families) {
      let style = "normal";
      let weights = ["400"];
      const name = family.split(":")[0];
      const foundWeights = family
        .split(":")[1]
        .split(",")
        .map((weight) => {
          if (weight === "i" || weight === "italic") {
            weight = "400i";
            return weight;
          }
          if (
            /^[a-zA-Z]+$/.test(weight) &&
            weight !== "i" &&
            weight !== "italic" &&
            weight !== "b" &&
            weight !== "bold" &&
            weight !== "bi" &&
            weight !== "ib" &&
            weight !== "bolditalic" &&
            weight !== "italicbold"
          ) {
            return "400";
          }
          return weight;
        });
      if (foundWeights.length > 0) {
        weights = foundWeights;
      }
      const dashFamily = name.toLowerCase().replace(/ /g, "-");
      const properties = data.find((f) => f.id === dashFamily);
      if (weights.length > 0) {
        for (let weight of weights) {
          for (const sub of properties?.subsets) {
            if (weight.includes("italic") || weight.includes("i")) {
              style = "italic";
              weight = weight.replace("italic", "").replace("i", "");
            }
            if (weight.includes("b") || weight.includes("bold")) {
              weight = "700";
            }
            let css = `
/* ${sub} */
@font-face {
  font-family: '${name}';
  font-style: ${style};
  font-weight: ${weight};`;
            if (display)
              css += `
  font-display: swap;`;
            css += `
  src: url(https://${domain}/${dashFamily}/${style}/${weight}.woff2) format('woff2');
  unicode-range: ${subsets[sub]};
}`;
            payload.push(css);
          }
        }
      }
    }
    if (payload.length === 0) {
      throw 'Wrong request. Please <a href="https://docs.coollabs.io/contact">contact us</a> if you think this is a bug.';
    }
    reply.header("content-type", "text/css");
    return reply.send(payload.join(" ").trim());
  } catch (error) {
    if (typeof error === "string") {
      reply.header("content-type", "text/html");
      throw error;
    }
    throw { statusCode: 500, message: error.message };
  }
});
server.get("/css2", async (request, reply) => {
  try {
    let { family: families, display } = request.query;
    if (families) {
      if (typeof families === "string") {
        families = [families];
      }
      const payload = [];
      for (let family of families) {
        let style = "normal";
        let weights = ["400"];

        let dashFamily = family.toLowerCase().replace(/ /g, "-");
        if (family.includes("wght") || family.includes("ital")) {
          weights = family
            .split(":")[1]
            ?.split("@")[1]
            ?.split(";")
            .filter((n) => n);
          dashFamily = family.toLowerCase().replace(/ /g, "-")?.split(":")[0];
        }
        family = family.split(":")[0];
        const properties = data.find((f) => f.id === dashFamily);
        if (weights && weights.length > 0) {
          for (let weight of weights) {
            if (properties?.subsets) {
              for (const subset of properties?.subsets) {
                if (weight.includes(",")) {
                  style = weight.split(",")[0] === "0" ? "normal" : "italic";
                  weight = weight.split(",")[1];
                } else {
                  if (weight === "0") {
                    style = "normal";
                    weight = "400";
                  }
                  if (weight === "1") {
                    style = "italic";
                    weight = "400";
                  }
                }
                let css = `
  /* ${subset} */
  @font-face {
    font-family: '${family}';
    font-style: ${style};
    font-weight: ${weight};`;
                if (display)
                  css += `
    font-display: swap;`;
                css += `
    src: url(https://${domain}/${dashFamily}/${style}/${weight}.woff2) format('woff2');
    unicode-range: ${subsets[subset]};
  }`;
                payload.push(css);
              }
            } else {
              return reply.type('text/html').send('This font is not available. <br>If you think this is a bug, <a href="https://docs.coollabs.io/contact">let us know</a>.')
            }
          }
        }
      }
      if (payload.length === 0) {
        throw 'Wrong request. Please <a href="https://docs.coollabs.io/contact">contact us</a> if you think this is a bug.';
      }
      reply.header("content-type", "text/css");
      return reply.send(payload.join(" ").trim());
    } else {
      throw { statusCode: 500, message: "Wrong request" };
    }
  } catch (error) {
    if (typeof error === "string") {
      reply.header("content-type", "text/html");
      throw error;
    }
    throw { statusCode: 500, message: error.message };
  }
});

try {
  await server.listen({ port: 3000, host: "0.0.0.0" });
  console.log(
    `Server listening on http://0.0.0.0:${server.server.address().port}`
  );
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
