export const css2 = (request, reply, data, domain, subsets) => {
  try {
    let { family: families, display, text } = request.query;
    if (families) {
      if (typeof families === "string") {
        families = [families];
      }
      const payload = [];

      if (text) {
        payload.push(`/* Optimized for text: ${decodeURIComponent(text)} */`);
      }
      for (let family of families) {
        let style = "normal";
        let weights = ["400"];

        let dashFamily = family.toLowerCase().replace(/ /g, "-");
        if (family.includes("wght") || family.includes("ital")) {
          const params = family.split(":")[1];

          if (params?.startsWith("wght@")) {
            const weightParam = params.split("@")[1];
            const weightSpecs = weightParam.split(";");
            weights = [];

            for (const spec of weightSpecs) {
              if (spec.includes("..")) {
                // Handle weight range (e.g., 100..900)
                const [start, end] = spec.split("..").map(Number);
                const standardWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
                standardWeights.forEach(weight => {
                  if (weight >= start && weight <= end) {
                    weights.push(weight.toString());
                  }
                });
              } else {
                weights.push(spec);
              }
            }
          } else if (params?.includes("@")) {
            // Handle ital,wght@ syntax
            const [axes, values] = params.split("@");
            const valuesList = values.split(";");

            if (axes.includes(",")) {
              // Handle combined axes like ital,wght
              // For ital,wght@0,400;0,700;1,400;1,700
              // We need to expand weight ranges and preserve the ital value
              weights = [];
              for (const value of valuesList) {
                if (value.includes(",")) {
                  const [italValue, weightValue] = value.split(",");
                  if (weightValue?.includes("..")) {
                    // Handle weight range (e.g., 200..700)
                    const [start, end] = weightValue.split("..").map(Number);
                    const standardWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
                    standardWeights.forEach(weight => {
                      if (weight >= start && weight <= end) {
                        weights.push(`${italValue},${weight}`);
                      }
                    });
                  } else if (weightValue) {
                    weights.push(value);
                  }
                } else {
                  weights.push(value);
                }
              }
            } else {
              weights = valuesList.filter((n) => n);
            }
          }

          dashFamily = family.toLowerCase().replace(/ /g, "-")?.split(":")[0];
        }
        family = family.split(":")[0];
        if (dashFamily === 'source-sans-pro') {
          dashFamily = 'source-sans-3';
        }

        // Get default subsets for the font
        const fontSubsets = getDefaultSubsets(dashFamily);

        if (weights && weights.length > 0) {
          for (let weight of weights) {
            for (const subset of fontSubsets) {
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
  font-weight: ${weight};
  font-stretch: 100%;`;
              if (display)
                css += `
  font-display: ${display};`;

              let url = `https://${domain}/${dashFamily}/${style}/${weight}.woff2`;
              if (text) {
                url += `?text=${encodeURIComponent(text)}`;
              }

              css += `
  src: url(${url}) format('woff2');
  unicode-range: ${subsets[subset] || 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'};
}`;
              payload.push(css);
            }
          }
        } else {
          // No weights specified, use default
          for (const subset of fontSubsets) {
            let css = `
/* ${subset} */
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: 400;
  font-stretch: 100%;`;
            if (display)
              css += `
  font-display: ${display};`;

            let url = `https://${domain}/${dashFamily}/normal/400.woff2`;
            if (text) {
              url += `?text=${encodeURIComponent(text)}`;
            }

            css += `
  src: url(${url}) format('woff2');
  unicode-range: ${subsets[subset] || 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'};
}`;
            payload.push(css);
          }
        }
      }
      reply.header("content-type", "text/css");
      reply.send(payload.join(" ").trim());
      return reply;
    }
    throw { statusCode: 500, message: "Wrong request" };
  } catch (error) {
    throw { statusCode: 500, message: error.message };
  }
};

function getDefaultSubsets(dashFamily) {
  // Return common subsets for most fonts
  // Special cases for known fonts can be added here
  const specialCases = {
    'roboto': ['cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'latin', 'latin-ext', 'math', 'symbols', 'vietnamese'],
    'open-sans': ['cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'hebrew', 'latin', 'latin-ext', 'math', 'symbols', 'vietnamese'],
    'noto-sans-jp': ['cyrillic', 'japanese', 'latin', 'latin-ext', 'vietnamese'],
    'noto-sans-kr': ['cyrillic', 'korean', 'latin', 'latin-ext', 'vietnamese'],
    'noto-sans-tc': ['chinese-traditional', 'cyrillic', 'latin', 'latin-ext', 'vietnamese'],
    'noto-sans-sc': ['chinese-simplified', 'cyrillic', 'latin', 'latin-ext', 'vietnamese'],
    'noto-color-emoji': ['emoji'],
    'noto-sans': ['cyrillic', 'cyrillic-ext', 'devanagari', 'greek', 'greek-ext', 'latin', 'latin-ext', 'vietnamese'],
    'noto-serif': ['cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'latin', 'latin-ext', 'math', 'vietnamese']
  };

  // Common subsets for popular fonts
  const commonSubsets = [
    'cyrillic',
    'cyrillic-ext',
    'greek',
    'greek-ext',
    'latin',
    'latin-ext',
    'vietnamese'
  ];

  // Return special case if it exists, otherwise return common subsets
  return specialCases[dashFamily] || commonSubsets;
}