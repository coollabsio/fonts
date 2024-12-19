export const css2 = (request, reply, data, domain, subsets) => {
  try {
    const { family: families, display } = request.query;
    if (!families) {
      throw { statusCode: 500, message: "Wrong request" };
    }

    const familyList = Array.isArray(families) ? families : [families];
    const payload = [];

    for (const family of familyList) {
      const { weights, styles, dashFamily, familyName } = parseFamily(family);
      const properties = getFontProperties(dashFamily, data);

      if (!properties?.subsets) {
        return reply
          .type('text/html')
          .send('This font is not available. <br>If you think this is a bug, <a href="https://docs.coollabs.io/contact">let us know</a>.');
      }

      for (const style of styles) {
        for (const weight of weights) {
          for (const subset of properties.subsets) {
            const css = generateFontFace({
              subset,
              familyName,
              style,
              weightValue: weight,
              display,
              domain,
              dashFamily,
              subsets
            });
            payload.push(css);
          }
        }
      }
    }

    if (payload.length === 0) {
      throw 'Wrong request. Please <a href="https://docs.coollabs.io/contact">contact us</a> if you think this is a bug.';
    }

    return reply
      .header("content-type", "text/css")
      .send(payload.join(" ").trim());

  } catch (error) {
    if (typeof error === "string") {
      reply.header("content-type", "text/html");
      throw error;
    }
    throw { statusCode: 500, message: error.message };
  }
};

function parseFamily(family) {
  let weights = ["400"];
  let styles = new Set(["normal"]);
  let dashFamily = family.toLowerCase().replace(/ /g, "-");
  const familyName = family.split(":")[0];

  if (family.includes(":")) {
    const [_, params] = family.split(":");

    // Handle wght@700 format
    if (params.startsWith("wght@")) {
      weights = [params.split("@")[1]];
    }
    // Handle ital,wght@1,400 format or ital,wght@0,100..900;1,100..900 format
    else if (params.includes("@")) {
      const [axes, values] = params.split("@");
      const valuesList = values.split(";");

      // Reset styles since we'll be adding them based on the input
      styles.clear();
      weights = new Set();

      for (const value of valuesList) {
        const [styleValue, weightValue] = value.split(",");

        // Handle style
        if (axes.includes("ital")) {
          styles.add(styleValue === "1" ? "italic" : "normal");
        }

        // Handle weight
        if (axes.includes("wght") && weightValue) {
          if (weightValue.includes("..")) {
            const [start, end] = weightValue.split("..").map(Number);
            // Only add start and end weights
            weights.add(start.toString());
            weights.add(end.toString());
          } else {
            weights.add(weightValue);
          }
        }
      }
    }

    dashFamily = familyName.toLowerCase().replace(/ /g, "-");
  }

  if (dashFamily === 'source-sans-pro') {
    dashFamily = 'source-sans-3';
  }

  return { weights: Array.from(weights), styles: Array.from(styles), dashFamily, familyName };
}

function getFontProperties(dashFamily, data) {
  return data.find((f) => f.id === dashFamily);
}

function generateFontFace({ subset, familyName, style, weightValue, display, domain, dashFamily, subsets }) {
  let css = `
/* ${subset} */
@font-face {
  font-family: '${familyName}';
  font-style: ${style};
  font-weight: ${weightValue};`;

  if (display) {
    css += `
  font-display: swap;`;
  }

  css += `
  src: url(https://${domain}/${dashFamily}/${style}/${weightValue}.woff2) format('woff2');
  unicode-range: ${subsets[subset]};
}`;

  return css;
}
