export const css2 = (request, reply, data, domain, subsets) => {
  try {
    const { family: families, display, text } = request.query;
    if (!families) {
      throw { statusCode: 500, message: "Wrong request" };
    }

    const familyList = Array.isArray(families) ? families : [families];
    const payload = [];

    if (text) {
      payload.push(`/* Optimized for text: ${decodeURIComponent(text)} */`);
    }

    for (const family of familyList) {
      const { weights, styles, dashFamily, familyName } = parseFamily(family);
      const properties = getFontProperties(dashFamily, data);

      if (!properties?.subsets) {
        return reply
          .type('text/html')
          .send('This font is not available. <br>If you think this is a bug, <a href="https://docs.coollabs.io/contact">let us know</a>.');
      }

      const sortedWeights = weights.sort((a, b) => parseInt(a) - parseInt(b));

      for (const style of styles) {
        for (const weight of sortedWeights) {
          for (const subset of properties.subsets) {
            const css = generateFontFace({
              subset,
              familyName,
              style,
              weightValue: weight,
              display,
              domain,
              dashFamily,
              subsets,
              text
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

    if (params.startsWith("wght@")) {
      const weightParam = params.split("@")[1];
      const weightSpecs = weightParam.split(";");
      weights = new Set();

      for (const spec of weightSpecs) {
        if (spec.includes("..")) {
          const [start, end] = spec.split("..").map(Number);
          const standardWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
          standardWeights.forEach(weight => {
            if (weight >= start && weight <= end) {
              weights.add(weight.toString());
            }
          });
        } else {
          weights.add(spec);
        }
      }
      weights = Array.from(weights);
    }
    else if (params.includes("@")) {
      const [axes, values] = params.split("@");
      const valuesList = values.split(";");
      const axisList = axes.split(",");

      styles.clear();
      weights = new Set();

      for (const value of valuesList) {
        const axisValues = value.split(",");

        for (let i = 0; i < axisList.length; i++) {
          const axisValue = axisValues[i];

          if (axisList[i] === "ital") {
            styles.add(axisValue === "1" ? "italic" : "normal");
          }

          if (axisList[i] === "wght" && axisValue) {
            if (axisValue.includes("..")) {
              const [start, end] = axisValue.split("..").map(Number);
              const standardWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
              standardWeights.forEach(weight => {
                if (weight >= start && weight <= end) {
                  weights.add(weight.toString());
                }
              });
            } else {
              weights.add(axisValue);
            }
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

function generateFontFace({ subset, familyName, style, weightValue, display, domain, dashFamily, subsets, text }) {
  let css = `
/* ${subset} */
@font-face {
  font-family: '${familyName}';
  font-style: ${style};
  font-weight: ${weightValue};`;

  if (display) {
    css += `
  font-display: ${display};`;
  }

  let url = `https://${domain}/${dashFamily}/${style}/${weightValue}.woff2`;
  if (text) {
    url += `?text=${encodeURIComponent(text)}`;
  }

  css += `
  src: url(${url}) format('woff2');
  unicode-range: ${subsets[subset]};
}`;

  return css;
}
