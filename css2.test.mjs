import { describe, expect, test } from "bun:test";
import { fetch } from "bun";

describe("Font Loading API Tests", () => {
  const LOCAL_URL = "http://localhost:3000/css2";
  const GOOGLE_URL = "https://fonts.googleapis.com/css2";

  async function compareFontResponses(params) {
    const localUrl = `${LOCAL_URL}${params}`;
    const googleUrl = `${GOOGLE_URL}${params}`;

    try {
      const localResponse = await fetch(localUrl);
      const googleResponse = await fetch(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36'
        }
      });

      // Don't compare status codes directly as they might differ
      expect(localResponse.headers.get("content-type")).toContain("text/css");

      const localCss = await localResponse.text();
      const googleCss = await googleResponse.text();

      // Compare core font properties while ignoring specific URLs and formatting
      return { localCss, googleCss };
    } catch (error) {
      console.log('Test failed for URLs:');
      console.log('Local:', localUrl);
      console.log('Google:', googleUrl);
      console.log('Error:', error.message);
      throw error;
    }
  }

  test("loads a single regular font", async () => {
    const { localCss, googleCss } = await compareFontResponses("?family=Roboto");
    expect(localCss).toContain("font-family: 'Roboto'");
    expect(localCss).toContain("font-weight: 400");
    expect(googleCss).toContain("font-family: 'Roboto'");
    expect(googleCss).toContain("font-weight: 400");
  });

  test("loads a font with specific weight", async () => {
    const { localCss, googleCss } = await compareFontResponses("?family=Roboto:wght@700");
    expect(localCss).toContain("font-family: 'Roboto'");
    expect(localCss).toMatch(/font-weight:\s*700/);
    expect(googleCss).toContain("font-family: 'Roboto'");
    expect(googleCss).toMatch(/font-weight:\s*700/);
  });

  test("loads a variable font weight range", async () => {
    const { localCss, googleCss } = await compareFontResponses("?family=Jost:ital,wght@0,100..900;1,100..900");
    expect(localCss).toContain("font-family: 'Jost'");
    expect(localCss).toContain("font-style: normal");
    expect(localCss).toMatch(/font-weight:\s*100\s+900/);
    expect(localCss).toContain("font-style: italic");
    expect(localCss).toMatch(/font-weight:\s*100\s+900/);
    expect(googleCss).toContain("font-family: 'Jost'");
    expect(googleCss).toContain("font-style: normal");
    expect(googleCss).toMatch(/font-weight:\s*100\s+900/);
    expect(googleCss).toContain("font-style: italic");
    expect(googleCss).toMatch(/font-weight:\s*100\s+900/);
  });

  test("loads variable font with italic and weight ranges", async () => {
    const { localCss, googleCss } = await compareFontResponses("?family=Roboto:ital,wght@1,400");
    expect(localCss).toContain("font-family: 'Roboto'");
    expect(localCss).toMatch(/font-style:\s*italic/);
    expect(localCss).toMatch(/font-weight:\s*400/);
    expect(googleCss).toContain("font-family: 'Roboto'");
    expect(googleCss).toMatch(/font-style:\s*italic/);
    expect(googleCss).toMatch(/font-weight:\s*400/);
  });

  test("loads multiple fonts", async () => {
    const { localCss, googleCss } = await compareFontResponses("?family=Roboto&family=Open+Sans");
    expect(localCss).toContain("font-family: 'Roboto'");
    expect(localCss).toContain("font-family: 'Open Sans'");
    expect(googleCss).toContain("font-family: 'Roboto'");
    expect(googleCss).toContain("font-family: 'Open Sans'");
  });

  test("loads font with display swap", async () => {
    const { localCss, googleCss } = await compareFontResponses("?family=Roboto&display=swap");
    expect(localCss).toContain("font-display: swap");
    expect(googleCss).toContain("font-display: swap");
  });

  test("handles invalid font request", async () => {
    const response = await fetch(`${LOCAL_URL}?family=NonExistentFont`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("This font is not available");
  });

  test("handles missing family parameter", async () => {
    const response = await fetch(LOCAL_URL);
    expect(response.status).toBe(500);
  });
});