const puppeteer = require("puppeteer");
const outPath = process.argv[2];
const url = process.argv[3] || "http://localhost:3001/quality/scope-of-work";
const clickText = process.argv[4];
const width = parseInt(process.argv[5] || "1600", 10);
const height = parseInt(process.argv[6] || "1000", 10);

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: "networkidle2" });

  const clicked = await page.evaluate((label) => {
    const els = Array.from(document.querySelectorAll("button"));
    const target = els.find((b) => b.textContent.trim().includes(label));
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, clickText);

  if (!clicked) {
    console.error("Button not found:", clickText);
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log("Saved", outPath);
})();
