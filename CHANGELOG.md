# Changelog

## v2.0.0 — July 15, 2026

### 🆕 New Commands

- **`/roi`** — Top items ranked by Return on Investment (value ÷ Robux cost). Sortable by ROI multiplier, current value, or Robux cost. Paginated with navigation buttons.
- **`/liquidity`** — Items ranked by how easy they are to sell. Liquidity score based on trade count, sold rate, and demand level. Shows top 15 most liquid + bottom 5 hardest to sell.

### 🛡️ Manipulation Detection System

- New stability analysis engine that scans price history for suspicious activity
- Detects: rapid value spikes (>50%), pump & dump patterns, demand/trend flips, price oscillation, fake trends, and demand/stock mismatches
- Confidence rating: Stable → Moderate → Suspicious → Likely Manipulated
- Integrated into `/value`, `/trade`, `/compare`, and `/history`
- Embed color turns orange/red when manipulation is detected

### 📊 Market Data (Stock, Cost, Sold Rate)

- Scraper and live-lookup now extract **Stock**, **Cost (Robux)**, and **Sold Rate** from game.guide item detail pages
- `/value` displays these fields with scarcity info and remaining stock calculation
- Items marked as "Sold out" when sold rate hits 100%
- Scarcity scoring integrated into `/compare` investment grades

### 🏪 Community Market Value

- Extracts real **Market Value** from active trades on game.guide (e.g., "~2.26M from 1577 trades")
- New `getSmartValue()` function prioritizes market data (when 50+ trades exist) over possibly-manipulated TrueVal
- `/value` shows community market price alongside listed value
- **🚨 Price Gap Warning** — alerts users when TrueVal differs from market price by >30%
- `/trade` shows inline warnings when items in a trade have significant market value discrepancy

### ⚖️ Compare Command Overhaul

- Added **value difference** display (% from top item, exact gap)
- Added **price efficiency** rating: 💎 Underpriced / ✅ Good value / ➡️ Fair / ⚠️ Pricey / 🔴 Overpriced
- Added **value comparison section** — for 2 items shows trade fairness and add suggestions; for 3-5 shows value spread
- Stability warnings per item inline
- Scarcity (stock + sold rate) now factors into investment scoring

### 🌐 Scraper Rewrite (game.guide 2025 Redesign)

- Added **Puppeteer** support for JS-rendered pages (game.guide is now a Single Page App)
- Falls back to axios if Puppeteer is unavailable
- New card parsing logic handles the redesigned layout: demand/trend at top, name in middle, values at bottom
- Child element scanning fallback for when text is concatenated without spaces
- Regex fixes: removed word boundaries that broke on concatenated text, reordered alternatives
- Post-scrape filter removes items with all-N/A data (no more empty entries)
- Added `--single-process` flag and reduced timeouts for Railway compatibility
- Individual item page lookups (`live-lookup.js`) updated for new page format

### 🐛 Fixes

- **"Very High" demand** now properly handled everywhere: color (0x00ff88), proto multiplier (2500x), notifier demand ordering
- **`/sync` timeout** — added try/catch to prevent bot crash when Discord interaction expires
- **Trend parsing** — fixed regex to correctly capture "Rising"/"Stable"/"Dropping" from new card design
- **N/A data reduction** — scraper no longer stores items that have zero useful data

### ⚙️ Technical

- Added `puppeteer` dependency for headless browser scraping
- New service: `src/services/stability.js` — manipulation detection engine
- New commands: `src/commands/roi.js`, `src/commands/liquidity.js`
- Updated `deploy-commands.js` with `/roi` and `/liquidity` slash command registration
- Updated `bot.js` with command routing for new commands
- `getSmartValue()` and `getMarketValueWarning()` exported from analyzer
- `getItems()` exported from matcher for use by new commands
