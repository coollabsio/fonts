import got from "got";
import { promises as fs } from "fs";
import { promisify } from "node:util";
import stream from "node:stream";
import css from "css";
import pLimit from "p-limit";

import "dotenv/config";

const CONCURRENT_DOWNLOADS = 10;
const MAX_RETRIES = 3;
const CACHE_FILE = "./font-cache.json";

const base = "gwfh.mranftl.com";
const storageZoneName = "coollabs-fonts";
const pipeline = promisify(stream.pipeline);
const limit = pLimit(CONCURRENT_DOWNLOADS);

// Progress tracking
let totalFonts = 0;
let processedFonts = 0;
let totalVariants = 0;
let processedVariants = 0;
let startTime = Date.now();
let lastLogTime = 0;

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

function logProgress() {
  const now = Date.now();
  // Throttle updates to max once per second
  if (now - lastLogTime < 1000) return;
  lastLogTime = now;

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const remainingFonts = totalFonts - processedFonts;
  const remainingVariants = totalVariants - processedVariants;

  let progressText = `Progress: ${processedFonts}/${totalFonts} fonts, ${processedVariants}/${totalVariants} variants | `;
  progressText += `Time: ${formatTime(elapsedSeconds)} | `;

  if (processedVariants > 0) {
    const avgTimePerVariant = elapsedSeconds / processedVariants;
    const estimatedRemainingSeconds = Math.floor(avgTimePerVariant * remainingVariants);
    progressText += `ETA: ${formatTime(estimatedRemainingSeconds)}`;
  }

  console.log(progressText);
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  try {
    return await got.get(url, options).json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function loadCache() {
  try {
    const cache = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(cache);
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache));
}

async function processFont(family, cache) {
  const cacheKey = `font_${family}`;

  let variants;
  if (cache[cacheKey]) {
    variants = cache[cacheKey];
  } else {
    const response = await fetchWithRetry(`https://${base}/api/fonts/${family}`);
    variants = response.variants;
    cache[cacheKey] = variants;
  }

  totalVariants += variants.length;
  logProgress();

  await Promise.all(
    variants.map(variant =>
      limit(async () => {
        const id = variant.fontWeight;
        const dir = `./${family}/${variant.fontStyle}`;

        try {
          await pipeline(
            got.stream(`${variant.woff2}`),
            await got.stream.put(
              `https://storage.bunnycdn.com/${storageZoneName}/${dir}/${id}.woff2`,
              {
                headers: {
                  AccessKey: process.env.BUNNY_API_KEY,
                },
                retry: { limit: MAX_RETRIES }
              },
            ),
            new stream.PassThrough()
          );
          processedVariants++;
          logProgress();
        } catch (err) {
          console.error(`\nError processing ${family}/${variant.fontStyle}/${id}:`, err.message);
          logProgress(); // Redraw progress after error message
        }
      })
    )
  );

  processedFonts++;
  logProgress();
}

async function generateSubsets(data) {
  const subsets = new Set(data.flatMap(d => d.subsets));
  const allSubsets = {};
  const totalSubsets = subsets.size;
  let processedSubsets = 0;

  console.log(`Processing subsets: 0/${totalSubsets}`);

  await Promise.all(
    Array.from(subsets).map(async subset => {
      const example = data.find(d => d.subsets.includes(subset));

      try {
        const gf = await got
          .get(`https://fonts.googleapis.com/css2?family=${example.family}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",
            },
            retry: { limit: MAX_RETRIES }
          })
          .text();

        const parsedCss = css.parse(gf);
        let currentSubset;

        parsedCss.stylesheet.rules.forEach(a => {
          if (a.type === "comment") {
            currentSubset = a.comment.trim();
            allSubsets[currentSubset] = "";
          }
          if (a.type === "font-face") {
            const value = a.declarations.find(d => d.property === "unicode-range")?.value;
            if (value) allSubsets[currentSubset] = value;
          }
        });

        processedSubsets++;
        console.log(`Processing subsets: ${processedSubsets}/${totalSubsets}`);
      } catch (err) {
        console.error(`Error processing subset ${subset}:`, err.message);
        console.log(`Processing subsets: ${processedSubsets}/${totalSubsets}`);
      }
    })
  );

  return allSubsets;
}

async function main() {
  console.log('Starting font processing...');
  startTime = Date.now();

  const cache = await loadCache();
  const data = await fetchWithRetry(`https://${base}/api/fonts/`);
  const families = data.map(d => d.id).filter(Boolean);

  totalFonts = families.length;
  console.log(`Found ${totalFonts} font families to process`);

  // Generate and save subsets in parallel with font processing
  const subsetsPromise = generateSubsets(data);

  if (process.env.BUNNY_API_KEY) {
    // Process fonts in parallel with limited concurrency
    await Promise.all(
      families.map(family => processFont(family, cache))
    );
  }

  const allSubsets = await subsetsPromise;
  await Promise.all([
    fs.writeFile("./subsets.json", JSON.stringify(allSubsets)),
    saveCache(cache)
  ]);

  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  console.log('\n=== Final Statistics ===');
  console.log(`Total execution time: ${formatTime(totalTime)}`);
  console.log(`Processed ${processedFonts} fonts with ${processedVariants} variants`);
  console.log(`Average time per variant: ${(totalTime / processedVariants).toFixed(2)}s`);
  console.log('=====================');
}

main().catch(console.error);
