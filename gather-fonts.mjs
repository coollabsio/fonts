import got from "got";
import { promises as fs } from "fs";
import { promisify } from "node:util";
import stream from "node:stream";
import css from "css";
import pLimit from "p-limit";
import "dotenv/config";

const CONCURRENT_DOWNLOADS = 5;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const VERSION_CACHE_FILE = "./font-versions-cache.json";
const GOOGLE_FONTS_API = "https://www.googleapis.com/webfonts/v1/webfonts";
const BUNNY_CDN_API = "https://api.bunny.net";
const pipeline = promisify(stream.pipeline);
const limit = pLimit(CONCURRENT_DOWNLOADS);

// Progress tracking
let totalFonts = 0;
let processedFonts = 0;
let skippedFonts = 0;
let updatedFonts = 0;
let totalVariants = 0;
let processedVariants = 0;
let failedUploads = [];
let startTime = Date.now();
let lastLogTime = 0;

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

function logProgress(message = null) {
  const now = Date.now();
  if (!message && now - lastLogTime < 1000) return;
  lastLogTime = now;

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

  if (message) {
    console.log(message);
    return;
  }

  let progressText = `Progress: ${processedFonts}/${totalFonts} fonts (${skippedFonts} skipped, ${updatedFonts} updated) | `;
  progressText += `${processedVariants}/${totalVariants} variants | `;
  progressText += `Time: ${formatTime(elapsedSeconds)}`;

  if (processedVariants > 0 && totalVariants > processedVariants) {
    const avgTimePerVariant = elapsedSeconds / processedVariants;
    const remainingVariants = totalVariants - processedVariants;
    const estimatedRemainingSeconds = Math.floor(avgTimePerVariant * remainingVariants);
    progressText += ` | ETA: ${formatTime(estimatedRemainingSeconds)}`;
  }

  console.log(progressText);
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  try {
    const method = options.method || 'GET';
    const response = method === 'GET'
      ? await got.get(url, options)
      : await got(url, options);
    return options.responseType === 'json' ? response.body : response;
  } catch (error) {
    if (retries > 0) {
      const delay = RETRY_DELAYS[MAX_RETRIES - retries] || 4000;
      console.log(`Retrying after ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function loadVersionCache() {
  try {
    const cache = await fs.readFile(VERSION_CACHE_FILE, 'utf-8');
    return JSON.parse(cache);
  } catch {
    return {};
  }
}

async function saveVersionCache(cache) {
  await fs.writeFile(VERSION_CACHE_FILE, JSON.stringify(cache, null, 2));
}

function normalizeFileName(family) {
  return family.toLowerCase().replace(/ /g, "-");
}

function parseVariant(variant) {
  // Parse variants like "regular", "italic", "100", "100italic", "700", "700italic"
  let weight = "400";
  let style = "normal";

  if (variant === "regular") {
    weight = "400";
    style = "normal";
  } else if (variant === "italic") {
    weight = "400";
    style = "italic";
  } else if (variant.endsWith("italic")) {
    weight = variant.replace("italic", "");
    style = "italic";
  } else {
    weight = variant;
    style = "normal";
  }

  return { weight, style };
}

async function getWoff2UrlsForAllSubsets(family, variant) {
  // Parse variant to determine weight and style
  let weight = "400";
  let style = "normal";

  if (variant === "regular") {
    weight = "400";
  } else if (variant === "italic") {
    weight = "400";
    style = "italic";
  } else if (variant.endsWith("italic")) {
    weight = variant.replace("italic", "");
    style = "italic";
  } else {
    weight = variant;
  }

  // Build the appropriate URL based on style
  let url;
  if (style === "italic") {
    url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@1,${weight}`;
  } else {
    url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  }

  const subsetUrls = [];

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      responseType: 'text'
    });

    const parsedCss = css.parse(response.body);

    // Extract all subset URLs from the CSS
    // Google's CSS has comments like /* latin */ before each @font-face
    let currentSubset = null;

    for (const rule of parsedCss.stylesheet.rules) {
      if (rule.type === "comment") {
        currentSubset = rule.comment.trim();
      } else if (rule.type === "font-face") {
        const styleDecl = rule.declarations.find(d => d.property === "font-style");
        const weightDecl = rule.declarations.find(d => d.property === "font-weight");

        if (styleDecl && weightDecl) {
          const ruleStyle = styleDecl.value;
          const ruleWeight = weightDecl.value;

          if (ruleStyle === style && ruleWeight === weight) {
            const srcDeclaration = rule.declarations.find(d => d.property === "src");
            if (srcDeclaration && currentSubset) {
              const match = srcDeclaration.value.match(/url\(([^)]+)\)/);
              if (match) {
                const fontUrl = match[1].replace(/['"]/g, '');
                subsetUrls.push({
                  subset: currentSubset,
                  url: fontUrl,
                  weight,
                  style
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to get WOFF2 URLs for ${family} ${variant}:`, error.message);
  }

  return subsetUrls;
}

async function processFont(fontData, versionCache) {
  const { family, version, variants, files, lastModified } = fontData;
  const normalizedFamily = normalizeFileName(family);

  // Check if font needs updating
  const cachedFont = versionCache[family];
  if (cachedFont && cachedFont.version === version && cachedFont.lastModified === lastModified) {
    logProgress(`Skipping ${family} (version ${version} already uploaded)`);
    skippedFonts++;
    processedFonts++;
    return;
  }

  logProgress(`Processing ${family} (version ${version})`);
  updatedFonts++;

  const variantData = {};

  // Process all variants
  for (const variant of variants) {
    const { weight, style } = parseVariant(variant);

    try {
      // Get WOFF2 URLs for all subsets from Google Fonts CSS API
      const subsetUrls = await getWoff2UrlsForAllSubsets(family, variant);

      if (subsetUrls.length === 0) {
        console.error(`No WOFF2 URLs found for ${family} ${variant}`);
        failedUploads.push({ family, variant, weight, style, reason: "No WOFF2 URLs" });
        continue;
      }

      totalVariants += subsetUrls.length;
      logProgress();

      // Upload each subset in parallel (with concurrency limit)
      await Promise.all(
        subsetUrls.map(({ subset, url }) =>
          limit(async () => {
            try {
              // Upload to BunnyCDN with subset in filename
              const dir = `${normalizedFamily}/${style}`;
              const bunnyUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE_NAME}/${dir}/${weight}-${subset}.woff2`;

              await pipeline(
                got.stream(url, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  },
                  retry: { limit: MAX_RETRIES }
                }),
                got.stream.put(bunnyUrl, {
                  headers: {
                    AccessKey: process.env.BUNNY_STORAGE_API_KEY,
                  },
                  retry: { limit: MAX_RETRIES }
                }),
                new stream.PassThrough()
              );

              processedVariants++;
              logProgress();

            } catch (err) {
              console.error(`\nError uploading ${family}/${style}/${weight}-${subset}:`, err.message);

              failedUploads.push({
                family,
                variant,
                weight,
                style,
                subset,
                error: err.message
              });

              // Check if rate limited
              if (err.response?.statusCode === 429 || err.message.includes('rate limit')) {
                console.log('Rate limit detected, waiting 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
              } else if (err.message.includes('Unable to connect')) {
                console.log('Connection issue detected, waiting 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
              }

              processedVariants++;
              logProgress();
            }
          })
        )
      );

      variantData[variant] = { weight, style, subsets: subsetUrls.map(s => s.subset) };

    } catch (err) {
      console.error(`\nError processing ${family}/${style}/${weight}:`, err.message);
      failedUploads.push({ family, variant, weight, style, error: err.message });
    }
  }

  // Update cache for this font
  versionCache[family] = {
    version,
    lastModified,
    variants: variantData,
    lastUploaded: new Date().toISOString()
  };

  processedFonts++;
  logProgress();
}

async function generateSubsets(fonts) {
  const subsets = new Set();
  fonts.forEach(font => {
    if (font.subsets) {
      font.subsets.forEach(subset => subsets.add(subset));
    }
  });

  const allSubsets = {};
  const totalSubsets = subsets.size;
  let processedSubsets = 0;

  console.log(`\nProcessing ${totalSubsets} subsets...`);

  await Promise.all(
    Array.from(subsets).map(async subset => {
      try {
        // Find a font that has this subset
        const exampleFont = fonts.find(f => f.subsets && f.subsets.includes(subset));
        if (!exampleFont) return;

        const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(exampleFont.family)}`;
        const response = await fetchWithRetry(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          responseType: 'text'
        });

        const parsedCss = css.parse(response.body);
        let currentSubset;

        parsedCss.stylesheet.rules.forEach(rule => {
          if (rule.type === "comment") {
            currentSubset = rule.comment.trim();
            allSubsets[currentSubset] = "";
          }
          if (rule.type === "font-face") {
            const unicodeRange = rule.declarations.find(d => d.property === "unicode-range");
            if (unicodeRange && currentSubset) {
              allSubsets[currentSubset] = unicodeRange.value;
            }
          }
        });

        processedSubsets++;
        console.log(`Processed subset ${processedSubsets}/${totalSubsets}: ${subset}`);
      } catch (err) {
        console.error(`Error processing subset ${subset}:`, err.message);
      }
    })
  );

  // Sort the subsets object by keys to ensure consistent output
  const sortedSubsets = {};
  Object.keys(allSubsets).sort().forEach(key => {
    sortedSubsets[key] = allSubsets[key];
  });
  return sortedSubsets;
}

async function purgeBunnyCDNCache() {
  if (!process.env.BUNNY_API_KEY) {
    console.log('Warning: BUNNY_API_KEY not found, skipping CDN cache purge');
    return false;
  }

  if (!process.env.BUNNY_CDN_ID) {
    console.log('Warning: BUNNY_CDN_ID not found, skipping CDN cache purge');
    return false;
  }

  try {
    console.log('\n=== Purging BunnyCDN Cache ===');

    const purgeUrl = `${BUNNY_CDN_API}/pullzone/${process.env.BUNNY_CDN_ID}/purgeCache`;
    const response = await fetchWithRetry(purgeUrl, {
      method: 'POST',
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      json: {},
      responseType: 'json'
    });
    console.log(`✓ Successfully purged BunnyCDN cache for pull zone ${process.env.BUNNY_CDN_ID}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to purge BunnyCDN cache:', error.message);
    return false;
  }
}

async function retryFailedUploads() {
  if (failedUploads.length === 0) return;

  console.log(`\n=== Retrying ${failedUploads.length} failed uploads ===`);
  const retryLimit = pLimit(2);
  let successCount = 0;

  await Promise.all(
    failedUploads.map(upload =>
      retryLimit(async () => {
        try {
          const { family, variant, weight, style } = upload;
          console.log(`Retrying ${family}/${style}/${weight}...`);

          const woff2Url = await getWoff2Url(family, variant);
          if (!woff2Url) {
            console.error(`✗ Still no WOFF2 URL for ${family} ${variant}`);
            return;
          }

          const normalizedFamily = normalizeFileName(family);
          const dir = `${normalizedFamily}/${style}`;
          const bunnyUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE_NAME}/${dir}/${weight}.woff2`;

          await pipeline(
            got.stream(woff2Url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              retry: { limit: 1 }
            }),
            got.stream.put(bunnyUrl, {
              headers: {
                AccessKey: process.env.BUNNY_STORAGE_API_KEY,
              },
              retry: { limit: 1 }
            }),
            new stream.PassThrough()
          );

          console.log(`✓ Successfully uploaded ${family}/${style}/${weight}`);
          successCount++;
        } catch (err) {
          console.error(`✗ Failed again: ${upload.family}/${upload.style}/${upload.weight}: ${err.message}`);
        }
      })
    )
  );

  console.log(`Retry complete: ${successCount}/${failedUploads.length} successful`);
}

async function main() {
  // Parse command line arguments for single font testing
  const args = process.argv.slice(2);
  const fontNameArg = args.find(arg => arg.startsWith('--font='));
  const singleFontName = fontNameArg ? fontNameArg.split('=')[1] : null;
  const skipCache = args.includes('--skip-cache');

  console.log('Starting Google Fonts gathering with version tracking...');
  if (singleFontName) {
    console.log(`\n*** Single font mode: ${singleFontName} ***\n`);
  }
  console.log(`Google Fonts API Key: ${process.env.GOOGLE_FONTS_API_KEY ? 'Configured' : 'Missing!'}`);
  console.log(`Bunny Storage API Key: ${process.env.BUNNY_STORAGE_API_KEY ? 'Configured' : 'Missing!'}`);
  console.log(`Bunny Storage Zone: ${process.env.BUNNY_STORAGE_ZONE_NAME || 'Missing!'}`);
  console.log(`Bunny CDN API Key: ${process.env.BUNNY_API_KEY ? 'Configured' : 'Missing (purge will be skipped)'}`);
  console.log(`Bunny CDN Pull Zone ID: ${process.env.BUNNY_CDN_ID || 'Missing (purge will be skipped)'}`);

  if (!process.env.GOOGLE_FONTS_API_KEY) {
    console.error('Error: GOOGLE_FONTS_API_KEY not found in .env file');
    process.exit(1);
  }

  if (!process.env.BUNNY_STORAGE_API_KEY) {
    console.error('Error: BUNNY_STORAGE_API_KEY not found in .env file');
    process.exit(1);
  }

  if (!process.env.BUNNY_STORAGE_ZONE_NAME) {
    console.error('Error: BUNNY_STORAGE_ZONE_NAME not found in .env file');
    process.exit(1);
  }

  startTime = Date.now();

  // Load version cache
  let versionCache = await loadVersionCache();
  console.log(`Loaded version cache with ${Object.keys(versionCache).length} fonts`);

  // If skip-cache flag is set with single font, remove it from cache
  if (skipCache && singleFontName) {
    delete versionCache[singleFontName];
    console.log(`Cleared cache for ${singleFontName}`);
  }

  // Fetch all fonts from Google Fonts API
  console.log('\nFetching font list from Google Fonts API...');
  const apiUrl = `${GOOGLE_FONTS_API}?key=${process.env.GOOGLE_FONTS_API_KEY}&sort=popularity`;
  const response = await fetchWithRetry(apiUrl, { responseType: 'json' });
  let fonts = response.items;

  // Filter to single font if specified
  if (singleFontName) {
    fonts = fonts.filter(f => f.family.toLowerCase() === singleFontName.toLowerCase());
    if (fonts.length === 0) {
      console.error(`Error: Font "${singleFontName}" not found in Google Fonts`);
      process.exit(1);
    }
  }

  totalFonts = fonts.length;
  console.log(`Found ${totalFonts} font families to process`);

  // Process fonts
  console.log('\nProcessing fonts...');
  for (const font of fonts) {
    await processFont(font, versionCache);

    // Save cache periodically (every 10 fonts)
    if (processedFonts % 10 === 0) {
      await saveVersionCache(versionCache);
    }
  }

  // Save final cache
  await saveVersionCache(versionCache);

  // Generate subsets (skip if single font mode)
  if (!singleFontName) {
    const subsets = await generateSubsets(fonts);
    await fs.writeFile("./subsets.json", JSON.stringify(subsets, null, 2));
  }

  // Retry failed uploads
  await retryFailedUploads();

  // Purge CDN cache
  await purgeBunnyCDNCache();

  // Final statistics
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  console.log('\n=== Final Statistics ===');
  console.log(`Total execution time: ${formatTime(totalTime)}`);
  console.log(`Processed: ${processedFonts} fonts`);
  console.log(`Skipped (up-to-date): ${skippedFonts} fonts`);
  console.log(`Updated: ${updatedFonts} fonts`);
  console.log(`Total variants processed: ${processedVariants}`);
  if (failedUploads.length > 0) {
    console.log(`Failed uploads: ${failedUploads.length}`);
  }
  if (processedVariants > 0) {
    console.log(`Average time per variant: ${(totalTime / processedVariants).toFixed(2)}s`);
  }
  console.log('========================');
}

main().catch(console.error);