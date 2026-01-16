import { describe, expect, test } from "bun:test";
import { fetch } from "bun";

describe("Font Loading API Tests", () => {
  const LOCAL_URL = "http://localhost:3000/css2";
  const GOOGLE_URL = "https://fonts.googleapis.com/css2";

  async function compareFontResponses(params) {
    const localUrl = `${LOCAL_URL}${params}`;
    const googleUrl = `${GOOGLE_URL}${params}`;

    const results = {
      localCss: null,
      googleCss: null,
      errors: {
        localCss: null,
        googleCss: null
      }
    };

    try {
      const localResponse = await fetch(localUrl);
      results.localCss = await localResponse.text();
    } catch (error) {
      results.errors.localCss = error;
      console.log('Local CSS endpoint failed:', error.message);
      console.log('Failed URL:', localUrl);
    }

    try {
      const googleResponse = await fetch(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      results.googleCss = await googleResponse.text();
    } catch (error) {
      results.errors.googleCss = error;
      console.log('Google CSS endpoint failed:', error.message);
      console.log('Failed URL:', googleUrl);
    }

    return results;
  }

  // Helper to extract font properties from CSS
  function extractFontProperties(css) {
    const properties = {
      families: new Set(),
      weights: new Set(),
      styles: new Set(),
      subsets: new Set(),
      hasDisplay: false,
      displayValue: null,
      fontFaceCount: 0
    };

    if (!css) return properties;

    // Extract font families
    const familyMatches = css.matchAll(/font-family:\s*['"]([^'"]+)['"]/g);
    for (const match of familyMatches) {
      properties.families.add(match[1]);
    }

    // Extract weights
    const weightMatches = css.matchAll(/font-weight:\s*(\d+)/g);
    for (const match of weightMatches) {
      properties.weights.add(match[1]);
    }

    // Extract styles
    const styleMatches = css.matchAll(/font-style:\s*(\w+)/g);
    for (const match of styleMatches) {
      properties.styles.add(match[1]);
    }

    // Extract subsets
    const subsetMatches = css.matchAll(/\/\*\s*([^*]+)\s*\*\//g);
    for (const match of subsetMatches) {
      const subset = match[1].trim();
      if (subset && !subset.includes('Optimized')) {
        properties.subsets.add(subset);
      }
    }

    // Check for font-display
    const displayMatch = css.match(/font-display:\s*(\w+)/);
    if (displayMatch) {
      properties.hasDisplay = true;
      properties.displayValue = displayMatch[1];
    }

    // Count @font-face rules
    properties.fontFaceCount = (css.match(/@font-face/g) || []).length;

    return properties;
  }

  test("loads a single regular font", async () => {
    const params = "?family=Roboto";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      expect(results.localCss).toContain("font-family: 'Roboto'");
      expect(results.localCss).toContain("font-weight: 400");
      expect(results.localCss).toContain("font-stretch: 100%");
      expect(results.localCss).toContain("unicode-range");
    }

    if (results.googleCss) {
      expect(results.googleCss).toContain("font-family: 'Roboto'");
      expect(results.googleCss).toContain("font-weight: 400");
    }

    // Compare properties
    const localProps = extractFontProperties(results.localCss);
    const googleProps = extractFontProperties(results.googleCss);

    if (results.localCss && results.googleCss) {
      expect(localProps.families).toEqual(googleProps.families);
      expect(localProps.weights).toEqual(googleProps.weights);
    }
  });

  test("loads a font with specific weight", async () => {
    const params = "?family=Roboto:wght@700";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      expect(results.localCss).toContain("font-family: 'Roboto'");
      expect(results.localCss).toMatch(/font-weight:\s*700/);
    }

    if (results.googleCss) {
      expect(results.googleCss).toContain("font-family: 'Roboto'");
      expect(results.googleCss).toMatch(/font-weight:\s*700/);
    }
  });

  test("loads multiple weights", async () => {
    const params = "?family=Roboto:wght@100;300;500;700;900&display=swap";
    const results = await compareFontResponses(params);

    const localProps = extractFontProperties(results.localCss);
    const googleProps = extractFontProperties(results.googleCss);

    if (results.localCss) {
      expect(localProps.weights.has("100")).toBe(true);
      expect(localProps.weights.has("300")).toBe(true);
      expect(localProps.weights.has("500")).toBe(true);
      expect(localProps.weights.has("700")).toBe(true);
      expect(localProps.weights.has("900")).toBe(true);
      expect(localProps.displayValue).toBe("swap");
    }

    if (results.googleCss) {
      expect(googleProps.weights.has("100")).toBe(true);
      expect(googleProps.weights.has("300")).toBe(true);
      expect(googleProps.weights.has("500")).toBe(true);
      expect(googleProps.weights.has("700")).toBe(true);
      expect(googleProps.weights.has("900")).toBe(true);
      expect(googleProps.displayValue).toBe("swap");
    }
  });

  test("loads italic variants", async () => {
    const params = "?family=Roboto:ital@1";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      expect(results.localCss).toContain("font-style: italic");
      expect(results.localCss).toContain("font-weight: 400");
    }

    if (results.googleCss) {
      expect(results.googleCss).toContain("font-style: italic");
      expect(results.googleCss).toContain("font-weight: 400");
    }
  });

  test("loads a variable font weight range", async () => {
    const params = "?family=Roboto:wght@100..900";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      expect(results.localCss).toContain("font-family: 'Roboto'");

      // Should have all standard weights
      const localProps = extractFontProperties(results.localCss);
      ["100", "200", "300", "400", "500", "600", "700", "800", "900"].forEach(weight => {
        expect(localProps.weights.has(weight)).toBe(true);
      });
    }
  });

  test("loads combined italic and weights", async () => {
    const params = "?family=Roboto:ital,wght@0,400;0,700;1,400;1,700";
    const results = await compareFontResponses(params);

    const localProps = extractFontProperties(results.localCss);

    if (results.localCss) {
      expect(localProps.families.has("Roboto")).toBe(true);
      expect(localProps.styles.has("normal")).toBe(true);
      expect(localProps.styles.has("italic")).toBe(true);
      expect(localProps.weights.has("400")).toBe(true);
      expect(localProps.weights.has("700")).toBe(true);
    }

    if (results.googleCss) {
      const googleProps = extractFontProperties(results.googleCss);
      expect(googleProps.families.has("Roboto")).toBe(true);
      expect(googleProps.styles.has("normal")).toBe(true);
      expect(googleProps.styles.has("italic")).toBe(true);
    }
  });

  test("loads multiple fonts", async () => {
    const params = "?family=Roboto&family=Open+Sans&family=Lato";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      expect(results.localCss).toContain("font-family: 'Roboto'");
      expect(results.localCss).toContain("font-family: 'Open Sans'");
      expect(results.localCss).toContain("font-family: 'Lato'");
    }

    if (results.googleCss) {
      expect(results.googleCss).toContain("font-family: 'Roboto'");
      expect(results.googleCss).toContain("font-family: 'Open Sans'");
      expect(results.googleCss).toContain("font-family: 'Lato'");
    }
  });

  test("loads font with display parameter variations", async () => {
    const displayValues = ["auto", "block", "swap", "fallback", "optional"];

    for (const display of displayValues) {
      const params = `?family=Roboto&display=${display}`;
      const results = await compareFontResponses(params);

      if (results.localCss) {
        expect(results.localCss).toContain(`font-display: ${display}`);
      }

      if (results.googleCss) {
        // Google doesn't include font-display for 'auto' value
        if (display === "auto") {
          expect(results.googleCss).not.toContain("font-display:");
        } else {
          expect(results.googleCss).toContain(`font-display: ${display}`);
        }
      }
    }
  });

  test("compares subset handling between local and Google", async () => {
    const params = "?family=Roboto:wght@400";
    const results = await compareFontResponses(params);

    const localProps = extractFontProperties(results.localCss);
    const googleProps = extractFontProperties(results.googleCss);

    if (results.localCss && results.googleCss) {
      // Sort subsets for consistent comparison
      const localSubsets = Array.from(localProps.subsets).sort();
      const googleSubsets = Array.from(googleProps.subsets).sort();

      console.log('Local subsets (sorted):', localSubsets);
      console.log('Google subsets (sorted):', googleSubsets);

      // Check that we have common subsets
      expect(localProps.subsets.has("latin")).toBe(true);
      expect(localProps.subsets.has("latin-ext")).toBe(true);
      expect(localProps.subsets.has("cyrillic")).toBe(true);
      expect(localProps.subsets.has("greek")).toBe(true);

      // Google should also have these
      expect(googleProps.subsets.has("latin")).toBe(true);
      expect(googleProps.subsets.has("latin-ext")).toBe(true);

      // Both should have the same subsets (when sorted)
      expect(localSubsets).toEqual(googleSubsets);
    }
  });

  test("handles special characters in font names", async () => {
    const params = "?family=Roboto+Mono:wght@400";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      expect(results.localCss).toContain("font-family: 'Roboto Mono'");
    }

    if (results.googleCss) {
      expect(results.googleCss).toContain("font-family: 'Roboto Mono'");
    }
  });

  test("loads fonts with non-standard weights", async () => {
    const params = "?family=Inter:wght@175;425;675";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      const localProps = extractFontProperties(results.localCss);
      expect(localProps.weights.has("175")).toBe(true);
      expect(localProps.weights.has("425")).toBe(true);
      expect(localProps.weights.has("675")).toBe(true);
    }
  });

  test("loads variable font with partial range", async () => {
    const params = "?family=Roboto:wght@300..700";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      const localProps = extractFontProperties(results.localCss);
      // Should have weights 300-700
      ["300", "400", "500", "600", "700"].forEach(weight => {
        expect(localProps.weights.has(weight)).toBe(true);
      });
      // Should NOT have weights outside range
      expect(localProps.weights.has("100")).toBe(false);
      expect(localProps.weights.has("200")).toBe(false);
      expect(localProps.weights.has("800")).toBe(false);
      expect(localProps.weights.has("900")).toBe(false);
    }
  });

  test("loads font with text optimization parameter", async () => {
    const text = "Hello World";
    const params = `?family=Roboto&text=${encodeURIComponent(text)}`;
    const results = await compareFontResponses(params);

    if (results.localCss) {
      expect(results.localCss).toContain(`Optimized for text: ${text}`);
      expect(results.localCss).toContain(`?text=${encodeURIComponent(text)}`);
    }

    // Google handles text parameter differently (subsetting)
    if (results.googleCss) {
      expect(results.googleCss).toContain("font-family: 'Roboto'");
    }
  });

  test("handles complex multi-font request", async () => {
    const params = "?family=Roboto:ital,wght@0,300;0,400;1,300;1,400&family=Open+Sans:wght@300..800&family=Lato:ital@0;1&display=swap";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      const localProps = extractFontProperties(results.localCss);

      // Check all three fonts are present
      expect(localProps.families.has("Roboto")).toBe(true);
      expect(localProps.families.has("Open Sans")).toBe(true);
      expect(localProps.families.has("Lato")).toBe(true);

      // Check display value
      expect(localProps.displayValue).toBe("swap");

      // Check styles
      expect(localProps.styles.has("normal")).toBe(true);
      expect(localProps.styles.has("italic")).toBe(true);
    }
  });

  test("compares font-face count for same request", async () => {
    const params = "?family=Roboto:wght@400;700";
    const results = await compareFontResponses(params);

    const localProps = extractFontProperties(results.localCss);
    const googleProps = extractFontProperties(results.googleCss);

    if (results.localCss && results.googleCss) {
      console.log(`Local font-face count: ${localProps.fontFaceCount}`);
      console.log(`Google font-face count: ${googleProps.fontFaceCount}`);

      // Both should generate multiple @font-face rules for subsets
      expect(localProps.fontFaceCount).toBeGreaterThan(0);
      expect(googleProps.fontFaceCount).toBeGreaterThan(0);
    }
  });

  test("handles font with all weights and styles", async () => {
    const params = "?family=Roboto:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      const localProps = extractFontProperties(results.localCss);

      // Should have all weights
      ["100", "200", "300", "400", "500", "600", "700", "800", "900"].forEach(weight => {
        expect(localProps.weights.has(weight)).toBe(true);
      });

      // Should have both styles
      expect(localProps.styles.has("normal")).toBe(true);
      expect(localProps.styles.has("italic")).toBe(true);
    }
  });

  test("validates unicode-range presence", async () => {
    const params = "?family=Roboto";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      // Check for unicode-range in each @font-face
      const fontFaces = results.localCss.split('@font-face');
      fontFaces.slice(1).forEach(face => {
        expect(face).toContain('unicode-range:');
      });
    }

    if (results.googleCss) {
      // Google also includes unicode-range
      const fontFaces = results.googleCss.split('@font-face');
      fontFaces.slice(1).forEach(face => {
        expect(face).toContain('unicode-range:');
      });
    }
  });

  test("handles Source Sans Pro special case", async () => {
    const params = "?family=Source+Sans+Pro";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      // Should be converted to Source Sans 3
      expect(results.localCss).toContain("font-family: 'Source Sans Pro'");
      expect(results.localCss).toContain("/source-sans-3/");
    }
  });

  test("handles variable font with ital,wght weight ranges (Cascadia Mono case)", async () => {
    const params = "?family=Cascadia+Mono:ital,wght@0,200..700;1,200..700&display=swap";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      const localProps = extractFontProperties(results.localCss);

      // Should have expanded to individual weights
      expect(localProps.weights.has("200")).toBe(true);
      expect(localProps.weights.has("300")).toBe(true);
      expect(localProps.weights.has("400")).toBe(true);
      expect(localProps.weights.has("500")).toBe(true);
      expect(localProps.weights.has("600")).toBe(true);
      expect(localProps.weights.has("700")).toBe(true);

      // Should NOT have weights outside the range
      expect(localProps.weights.has("100")).toBe(false);
      expect(localProps.weights.has("800")).toBe(false);
      expect(localProps.weights.has("900")).toBe(false);

      // Should have both normal and italic styles
      expect(localProps.styles.has("normal")).toBe(true);
      expect(localProps.styles.has("italic")).toBe(true);

      // Should have display swap
      expect(localProps.displayValue).toBe("swap");

      // Should NOT have weight ranges in the output
      expect(results.localCss).not.toContain("font-weight: 200..700");

      // Should have individual weight values
      expect(results.localCss).toContain("font-weight: 200");
      expect(results.localCss).toContain("font-weight: 700");

      // Should have proper URLs for individual weights (with subset suffix)
      expect(results.localCss).toMatch(/\/cascadia-mono\/normal\/200-[a-z-]+\.woff2/);
      expect(results.localCss).toMatch(/\/cascadia-mono\/normal\/700-[a-z-]+\.woff2/);
      expect(results.localCss).toMatch(/\/cascadia-mono\/italic\/200-[a-z-]+\.woff2/);
      expect(results.localCss).toMatch(/\/cascadia-mono\/italic\/700-[a-z-]+\.woff2/);
    }
  });

  test("compares URL structure", async () => {
    const params = "?family=Roboto:wght@400";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      // Check our CDN URL structure (with subset suffix: weight-subset.woff2)
      expect(results.localCss).toMatch(/https:\/\/cdn\.fonts\.coollabs\.io\/[^/]+\/[^/]+\/\d+-[a-z-]+\.woff2/);
    }

    if (results.googleCss) {
      // Check Google's URL structure
      expect(results.googleCss).toMatch(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/);
    }
  });

  test("handles missing family parameter gracefully", async () => {
    const response = await fetch(LOCAL_URL);
    expect(response.status).toBe(500);
  });

  test("handles empty family parameter", async () => {
    const response = await fetch(`${LOCAL_URL}?family=`);
    expect(response.status).toBe(500);
  });
});