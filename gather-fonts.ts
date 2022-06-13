import css from "css";
const got = require("got");
import stream from "node:stream";
import { promises as fs } from "fs";
import { promisify } from "node:util";

import "dotenv/config";

async function main() {
  var data: any[] = await got
    .get(`https://google-webfonts-helper.herokuapp.com/api/fonts/`)
    .json();
  const storageZoneName = "coolfonts";
  const families = data.map((d) => d.id).filter((n) => n);

  const pipeline = promisify(stream.pipeline);
  const subsets = new Set();
  for (const subset of data) {
    for (const range of subset.subsets) {
      subsets.add(range);
    }
  }

  // Generate subsets
  const allSubsets: any = {};

  for (const subset of Array.from(subsets)) {
    console.log("Checking subset: ", subset);

    const example = data.find((d) => d.subsets.includes(subset));
    const gf = await got
      .get(`https://fonts.googleapis.com/css2?family=${example.family}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",
        },
      })
      .text();

    const parsedCss = css.parse(gf);
    parsedCss.stylesheet.rules.map(
      (a: {
        comment: any;
        type: string;
        declarations: { property: string; value: any }[];
      }) => {
        if (a.type === "comment") {
          var currentSubset = a.comment.trim();
          allSubsets[a.comment.trim()] = "";
        }
        if (a.type === "font-face") {
          const value = a.declarations.find(
            (d) => d.property === "unicode-range"
          ).value;
          allSubsets[currentSubset] = value;
        }
      }
    );
  }

  await fs.writeFile("./subsets.json", JSON.stringify(allSubsets));
  for (const family of families) {
    console.log("Doing: ", family);
    const { variants }: any = await got
      .get(`https://google-webfonts-helper.herokuapp.com/api/fonts/${family}`)
      .json();

    for (const variant of variants) {
      const id = variant.fontWeight;
      const dir = `./${family}/${variant.fontStyle}/`;

      try {
        await pipeline(
          got.stream(`${variant.woff2}`),
          await got.stream.put(
            `https://storage.bunnycdn.com/${storageZoneName}/${dir}/${id}.woff2`,
            {
              headers: {
                AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
              },
            }
          ),
          new stream.PassThrough()
        );
      } catch (err) {
        console.log(err);
      }
    }
  }
}
main();
