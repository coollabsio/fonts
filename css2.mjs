export const css2 = (request, reply, data, domain, subsets) => {
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
        if (dashFamily === 'source-sans-pro') {
          dashFamily = 'source-sans-3';
        }
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
};
