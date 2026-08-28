# Puppeteer Scripts

Screenshots your local dev server and saves them to `/reference-files/screenshots/`.

## Setup

Install Puppeteer as a dev dependency:

```bash
npm install --save-dev puppeteer
```

## Usage

Make sure your dev server is running first:

```bash
npm run dev
```

Then in a separate terminal:

```bash
# Screenshot the homepage at localhost:3000
node scripts/puppeteer/screenshot.js

# Screenshot a specific route
node scripts/puppeteer/screenshot.js --url http://localhost:3000/about

# Custom filename
node scripts/puppeteer/screenshot.js --name hero-section

# Custom viewport size
node scripts/puppeteer/screenshot.js --width 375 --height 812

# Combine options
node scripts/puppeteer/screenshot.js --url http://localhost:3000 --name mobile-home --width 375 --height 812
```

## Output

Screenshots are saved to `/reference-files/screenshots/` with a timestamped filename:

```
reference-files/screenshots/
└── screenshot-2026-04-09T14-30-00.png
└── hero-section-2026-04-09T14-32-00.png
└── mobile-home-2026-04-09T14-35-00.png
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--url` | `http://localhost:3000` | URL to screenshot |
| `--name` | `screenshot` | Output filename prefix |
| `--width` | `1440` | Viewport width in px |
| `--height` | `900` | Viewport height in px |
