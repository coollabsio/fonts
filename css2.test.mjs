import { describe, expect, test } from "bun:test";
import { fetch } from "bun";

describe("Font Loading API Tests", () => {
  const LOCAL_URL = "http://localhost:3000/css2";
  const LOCAL_URL_NEXT = "http://localhost:3000/css2-next";
  const GOOGLE_URL = "https://fonts.googleapis.com/css2";

  async function compareFontResponses(params) {
    const localUrl = `${LOCAL_URL}${params}`;
    const googleUrl = `${GOOGLE_URL}${params}`;
    const localUrlNext = `${LOCAL_URL_NEXT}${params}`;

    const results = {
      localCss: null,
      googleCss: null,
      localCssNext: null,
      errors: {
        localCss: null,
        googleCss: null,
        localCssNext: null
      }
    };

    // try {
    //   const localResponse = await fetch(localUrl);
    //   results.localCss = await localResponse.text();
    // } catch (error) {
    //   results.errors.localCss = error;
    //   console.log('Local CSS endpoint failed:', error.message);
    //   console.log('Failed URL:', localUrl);
    // }

    try {
      const googleResponse = await fetch(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36'
        }
      });
      results.googleCss = await googleResponse.text();
    } catch (error) {
      results.errors.googleCss = error;
      console.log('Google CSS endpoint failed:', error.message);
      console.log('Failed URL:', googleUrl);
    }

    try {
      const localResponseNext = await fetch(localUrlNext);
      results.localCssNext = await localResponseNext.text();
    } catch (error) {
      results.errors.localCssNext = error;
      console.log('Local CSS Next endpoint failed:', error.message);
      console.log('Failed URL:', localUrlNext);
    }

    return results;
  }

  test("loads a single regular font", async () => {
    const params = "?family=Roboto";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      try {
        expect(results.localCss).toContain("font-family: 'Roboto'");
        expect(results.localCss).toContain("font-weight: 400");
      } catch (error) {
        console.log('Test failed for URL:', `${LOCAL_URL}${params}`);
        throw error;
      }
    }

    if (results.localCssNext) {
      try {
        expect(results.localCssNext).toContain("font-family: 'Roboto'");
        expect(results.localCssNext).toContain("font-weight: 400");
      } catch (error) {
        console.log('Test failed for URL:', `${LOCAL_URL_NEXT}${params}`);
        throw error;
      }
    }

    if (results.googleCss) {
      try {
        expect(results.googleCss).toContain("font-family: 'Roboto'");
        expect(results.googleCss).toContain("font-weight: 400");
      } catch (error) {
        console.log('Test failed for URL:', `${GOOGLE_URL}${params}`);
        throw error;
      }
    }
  });

  test("loads a font with specific weight", async () => {
    const params = "?family=Roboto:wght@700";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      try {
        expect(results.localCss).toContain("font-family: 'Roboto'");
        expect(results.localCss).toMatch(/font-weight:\s*700/);
      } catch (error) {
        console.log('Test failed for URL:', `${LOCAL_URL}${params}`);
        throw error;
      }
    }

    if (results.localCssNext) {
      try {
        expect(results.localCssNext).toContain("font-family: 'Roboto'");
        expect(results.localCssNext).toMatch(/font-weight:\s*700/);
      } catch (error) {
        console.log('Test failed for URL:', `${LOCAL_URL_NEXT}${params}`);
        throw error;
      }
    }

    if (results.googleCss) {
      try {
        expect(results.googleCss).toContain("font-family: 'Roboto'");
        expect(results.googleCss).toMatch(/font-weight:\s*700/);
      } catch (error) {
        console.log('Test failed for URL:', `${GOOGLE_URL}${params}`);
        throw error;
      }
    }
  });

  test("loads multiple weights", async () => {
    const params = "?family=Roboto:wght@100;200;300&display=swap";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      try {
        expect(results.localCss).toContain("font-family: 'Roboto'");
        expect(results.localCss).toMatch(/font-weight:\s*100/);
        expect(results.localCss).toMatch(/font-weight:\s*200/);
        expect(results.localCss).toMatch(/font-weight:\s*300/);
      } catch (error) {
        console.log('Test failed for URL:', `${LOCAL_URL}${params}`);
        throw error;
      }
    }

    if (results.localCssNext) {
      try {
        expect(results.localCssNext).toContain("font-family: 'Roboto'");
        expect(results.localCssNext).toMatch(/font-weight:\s*100/);
        expect(results.localCssNext).toMatch(/font-weight:\s*200/);
        expect(results.localCssNext).toMatch(/font-weight:\s*300/);
      } catch (error) {
        console.log('Test failed for URL:', `${LOCAL_URL_NEXT}${params}`);
        throw error;
      }
    }

    // if (results.googleCss) {
    //   try {
    //     expect(results.googleCss).toContain("font-family: 'Roboto'");
    //     expect(results.googleCss).toMatch(/font-weight:\s*100/);
    //     expect(results.googleCss).toMatch(/font-weight:\s*200/);
    //     expect(results.googleCss).toMatch(/font-weight:\s*300/);
    //     expect(results.googleCss).toContain("font-display: swap");
    //   } catch (error) {
    //     console.log('Test failed for URL:', `${GOOGLE_URL}${params}`);
    //     throw error;
    //   }
    // }
  });

  test("loads a variable font weight range", async () => {
    const params = "?family=Jost:ital,wght@0,100..300;1,100..900";
    const results = await compareFontResponses(params);

    [results.localCss, results.localCssNext].forEach((css, index) => {
      if (css) {
        const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
        const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
        console.log(`${endpoint} checks succeeded`);

        try {
          expect(css).toContain("font-family: 'Jost'");
          expect(css).toContain("font-style: normal");
          expect(css).toMatch(/font-weight:\s*100/);
          expect(css).toMatch(/font-weight:\s*200/);
          expect(css).toMatch(/font-weight:\s*300/);
          expect(css).not.toMatch(/font-style: normal.*?font-weight:\s*400/s);

          expect(css).toContain("font-style: italic");
          expect(css).toMatch(/font-weight:\s*100/);
          expect(css).toMatch(/font-weight:\s*200/);
          expect(css).toMatch(/font-weight:\s*300/);
          expect(css).toMatch(/font-weight:\s*400/);
          expect(css).toMatch(/font-weight:\s*500/);
          expect(css).toMatch(/font-weight:\s*600/);
          expect(css).toMatch(/font-weight:\s*700/);
          expect(css).toMatch(/font-weight:\s*800/);
          expect(css).toMatch(/font-weight:\s*900/);

          expect((css.match(/@font-face/g) || []).length).toBe(54);

          expect(css).toContain("/normal/100.woff2");
          expect(css).toContain("/normal/900.woff2");
          expect(css).toContain("/italic/100.woff2");
          expect(css).toContain("/italic/900.woff2");
        } catch (error) {
          console.log('Test failed for URL:', `${url}${params}`);
          throw error;
        }
      }
    });
  });

  test("loads variable font with italic and weight ranges", async () => {
    const params = "?family=Roboto:ital,wght@1,400";
    const results = await compareFontResponses(params);

    [results.localCss, results.localCssNext].forEach((css, index) => {
      if (css) {
        const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
        const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
        console.log(`${endpoint} checks succeeded`);

        try {
          expect(css).toContain("font-family: 'Roboto'");
          expect(css).toMatch(/font-style:\s*italic/);
          expect(css).toMatch(/font-weight:\s*400/);
        } catch (error) {
          console.log('Test failed for URL:', `${url}${params}`);
          throw error;
        }
      }
    });

    if (results.googleCss) {
      console.log('Google CSS checks succeeded');
      try {
        expect(results.googleCss).toContain("font-family: 'Roboto'");
        expect(results.googleCss).toMatch(/font-style:\s*italic/);
        expect(results.googleCss).toMatch(/font-weight:\s*400/);
      } catch (error) {
        console.log('Test failed for URL:', `${GOOGLE_URL}${params}`);
        throw error;
      }
    }
  });

  test("loads multiple fonts", async () => {
    const params = "?family=Roboto&family=Open+Sans";
    const results = await compareFontResponses(params);

    [results.localCss, results.localCssNext].forEach((css, index) => {
      if (css) {
        const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
        const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
        console.log(`${endpoint} checks succeeded`);

        try {
          expect(css).toContain("font-family: 'Roboto'");
          expect(css).toContain("font-family: 'Open Sans'");
        } catch (error) {
          console.log('Test failed for URL:', `${url}${params}`);
          throw error;
        }
      }
    });

    if (results.googleCss) {
      console.log('Google CSS checks succeeded');
      try {
        expect(results.googleCss).toContain("font-family: 'Roboto'");
        expect(results.googleCss).toContain("font-family: 'Open Sans'");
      } catch (error) {
        console.log('Test failed for URL:', `${GOOGLE_URL}${params}`);
        throw error;
      }
    }
  });

  test("loads font with display swap", async () => {
    const params = "?family=Roboto&display=swap";
    const results = await compareFontResponses(params);

    if (results.localCss) {
      try {
        expect(results.localCss).toContain("font-display: swap");
      } catch (error) {
        console.log('Test failed for URL:', `${LOCAL_URL}${params}`);
        throw error;
      }
    }

    if (results.localCssNext) {
      try {
        expect(results.localCssNext).toContain("font-display: swap");
      } catch (error) {
        console.log('Test failed for URL:', `${LOCAL_URL_NEXT}${params}`);
        throw error;
      }
    }

    if (results.googleCss) {
      try {
        expect(results.googleCss).toContain("font-display: swap");
      } catch (error) {
        console.log('Test failed for URL:', `${GOOGLE_URL}${params}`);
        throw error;
      }
    }
  });

  test("handles invalid font request", async () => {
    const params = "?family=NonExistentFont";
    const response = await fetch(`${LOCAL_URL}${params}`);
    const responseNext = await fetch(`${LOCAL_URL_NEXT}${params}`);

    [response, responseNext].forEach((resp, index) => {
      const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
      const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
      if (resp.status === 200) {
        console.log(`${endpoint} returned 200 status as expected`);
      } else {
        console.log(`${endpoint} failed with status ${resp.status}`);
        console.log('Failed URL:', `${url}${params}`);
      }
      try {
        expect(resp.status).toBe(200);
        expect(resp.text()).resolves.toContain("This font is not available");
      } catch (error) {
        console.log('Test failed for URL:', `${url}${params}`);
        throw error;
      }
    });
  });

  test("handles missing family parameter", async () => {
    const response = await fetch(LOCAL_URL);
    const responseNext = await fetch(LOCAL_URL_NEXT);

    [response, responseNext].forEach((resp, index) => {
      const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
      const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
      if (resp.status === 500) {
        console.log(`${endpoint} returned 500 status as expected`);
      } else {
        console.log(`${endpoint} failed with unexpected status ${resp.status}`);
        console.log('Failed URL:', url);
      }
      try {
        expect(resp.status).toBe(500);
      } catch (error) {
        console.log('Test failed for URL:', url);
        throw error;
      }
    });
  });

  // test("loads font with text optimization parameter", async () => {
  //   const text = "Hello World";
  //   const results = await compareFontResponses(`?family=Roboto&text=${encodeURIComponent(text)}`);
  //   console.log("http://localhost:3000/css2?family=Roboto&text=Hello+World")
  //   [results.localCss, results.localCssNext].forEach((css, index) => {
  //     if (css) {
  //       const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
  //       console.log(`${endpoint} checks succeeded`);

  //       expect(css).toContain(`Optimized for text: ${text}`);
  //       expect(css).toContain(`?text=${encodeURIComponent(text)}`);
  //     }
  //   });

  //   if (results.googleCss) {
  //     console.log('Google CSS checks succeeded');
  //     expect(results.googleCss).toContain("font-family: 'Roboto'");
  //   }
  // });

  test("loads font with non-standard weights", async () => {
    const params = "?family=Roboto:wght@451;577";
    const results = await compareFontResponses(params);

    [results.localCss, results.localCssNext].forEach((css, index) => {
      if (css) {
        const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
        const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
        console.log(`${endpoint} checks succeeded`);

        try {
          expect(css).toContain("font-family: 'Roboto'");
          expect(css).toMatch(/font-weight:\s*451/);
          expect(css).toMatch(/font-weight:\s*577/);
        } catch (error) {
          console.log('Test failed for URL:', `${url}${params}`);
          throw error;
        }
      }
    });
  });

  test("loads font with multiple weight definitions", async () => {
    const params = "?family=Roboto:wght@300;400..700;900";
    const results = await compareFontResponses(params);

    [results.localCss, results.localCssNext].forEach((css, index) => {
      if (css) {
        const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
        const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
        console.log(`${endpoint} checks succeeded`);

        try {
          expect(css).toContain("font-family: 'Roboto'");
          expect(css).toMatch(/font-weight:\s*300/);
          expect(css).toMatch(/font-weight:\s*400/);
          expect(css).toMatch(/font-weight:\s*500/);
          expect(css).toMatch(/font-weight:\s*600/);
          expect(css).toMatch(/font-weight:\s*700/);
          expect(css).toMatch(/font-weight:\s*900/);
        } catch (error) {
          console.log('Test failed for URL:', `${url}${params}`);
          throw error;
        }
      }
    });
  });

  test("loads font with custom display parameter", async () => {
    const params = "?family=Roboto&display=block";
    const results = await compareFontResponses(params);

    [results.localCss, results.localCssNext].forEach((css, index) => {
      if (css) {
        const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
        const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
        console.log(`${endpoint} checks succeeded`);
        try {
          expect(css).toContain("font-display: block");
        } catch (error) {
          console.log('Test failed for URL:', `${url}${params}`);
          throw error;
        }
      }
    });

    if (results.googleCss) {
      console.log('Google CSS checks succeeded');
      try {
        expect(results.googleCss).toContain("font-display: block");
      } catch (error) {
        console.log('Test failed for URL:', `${GOOGLE_URL}${params}`);
        throw error;
      }
    }
  });

  // test("loads font with complex variable range and styles", async () => {
  //   const params = "?family=Roboto+Flex:wght,wdth,GRAD@300,85.0,0;400,100.0,0;500,151.0,-50";
  //   const results = await compareFontResponses(params);

  //   [results.localCss, results.localCssNext].forEach((css, index) => {
  //     if (css) {
  //       const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
  //       const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
  //       console.log(`${endpoint} checks succeeded`);

  //       try {
  //         expect(css).toContain("font-family: 'Roboto Flex'");
  //         expect(css).toMatch(/font-weight:\s*300/);
  //         expect(css).toMatch(/font-weight:\s*400/);
  //         expect(css).toMatch(/font-weight:\s*500/);
  //       } catch (error) {
  //         console.log('Test failed for URL:', `${url}${params}`);
  //         throw error;
  //       }
  //     }
  //   });
  // });

  test("loads multiple fonts with different configurations", async () => {
    const params = "?family=Roboto:ital,wght@0,400;1,700&family=Open+Sans:wght@300..800";
    const results = await compareFontResponses(params);

    [results.localCss, results.localCssNext].forEach((css, index) => {
      if (css) {
        const endpoint = index === 0 ? 'Local CSS' : 'Local CSS Next';
        const url = index === 0 ? LOCAL_URL : LOCAL_URL_NEXT;
        console.log(`${endpoint} checks succeeded`);

        try {
          expect(css).toContain("font-family: 'Roboto'");
          expect(css).toContain("font-family: 'Open Sans'");
          expect(css).toMatch(/font-style:\s*normal/);
          expect(css).toMatch(/font-style:\s*italic/);
          expect(css).toMatch(/font-weight:\s*400/);
          expect(css).toMatch(/font-weight:\s*700/);
          expect(css).toMatch(/font-weight:\s*300/);
          expect(css).toMatch(/font-weight:\s*800/);
        } catch (error) {
          console.log('Test failed for URL:', `${url}${params}`);
          throw error;
        }
      }
    });
  });
});