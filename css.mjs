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
        ?.split(",")
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
        }) || ["400"];
      if (foundWeights.length > 0) {
        weights = foundWeights;
      }
      const dashFamily = name.toLowerCase().replace(/ /g, "-");

      // Get default subsets for the font
      const fontSubsets = getDefaultSubsets(dashFamily);

      if (weights.length > 0) {
        for (let weight of weights) {
          for (const sub of fontSubsets) {
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
  font-display: ${display};`;
            css += `
  src: url(https://${domain}/${dashFamily}/${style}/${weight}-${sub}.woff2) format('woff2');
  unicode-range: ${subsets[sub] || 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'};
}`;
            payload.push(css);
          }
        }
      }
    }

    reply.header("content-type", "text/css");
    reply.send(payload.join(" ").trim());
    return reply;
  } catch (error) {
    throw { statusCode: 500, message: error.message };
  }
}

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