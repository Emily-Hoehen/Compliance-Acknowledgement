/**
 * screenshot.js
 *
 * Takes a screenshot of your local Next.js dev server and saves it
 * to /reference-files/screenshots/ with a timestamped filename.
 *
 * Usage:
 *   node scripts/puppeteer/screenshot.js
 *   node scripts/puppeteer/screenshot.js --url http://localhost:3000/about
 *   node scripts/puppeteer/screenshot.js --name my-component
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : null;
};

const URL = getArg("--url") || "http://localhost:3000";
const NAME = getArg("--name") || "screenshot";
const VIEWPORT_WIDTH = parseInt(getArg("--width") || "1440");
const VIEWPORT_HEIGHT = parseInt(getArg("--height") || "900");

// Output directory
const OUTPUT_DIR = path.resolve(__dirname, "../../reference-files/screenshots");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Timestamped filename
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const filename = `${NAME}-${timestamp}.png`;
const outputPath = path.join(OUTPUT_DIR, filename);

(async () => {
  console.log(`Launching browser...`);
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

  console.log(`Navigating to ${URL}...`);
  await page.goto(URL, { waitUntil: "networkidle2" });

  console.log(`Taking screenshot...`);
  await page.screenshot({ path: outputPath, fullPage: true });

  await browser.close();

  console.log(`Saved: reference-files/screenshots/${filename}`);
})();
