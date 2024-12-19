export function css(request, reply, data, domain, subsets) {
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
}
