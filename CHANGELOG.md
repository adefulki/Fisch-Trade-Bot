# Changelog

## v2.1.0 — July 22, 2026

### 🆕 New Commands

- **`/similar`** — Find items within a value range of any item. Shows fair swaps, cheaper/pricier alternatives with trade hints. Adjustable range (default ±30%).
- **`/roi`** — Top items ranked by Return on Investment (value ÷ Robux cost). Paginated, sortable.
- **`/liquidity`** — Items ranked by how easy they are to sell (trade count + sold rate + demand).
- **`/changelog`** — Broadcasts latest changelog to all subscribed servers (admin only).

### 📈 Trading Hub Insights

- Real supply/demand data from game.guide Trading Hub (Most Wanted, Most Offered, Most Traded, High Demand ratios)
- `/top` new sorts: **🎯 Most Wanted** (real demand) and **🔥 Hot** (most traded this week)
- `/value` shows "📈 Trading Hub Activity" — wanted/offered counts, want:offer ratio, oversupplied/undersupplied flags
- `/trade` warns when items are oversupplied ("hard to sell at listed price") or undersupplied ("high real demand")

### 🛡️ Manipulation Detection

- New stability engine detects: rapid spikes, pump & dump, demand/trend flips, price oscillation, fake trends, demand/stock mismatches, supply/demand mismatches from Trading Hub
- Confidence rating: Stable → Moderate → Suspicious → Likely Manipulated
- Integrated into `/value`, `/trade`, `/compare`, `/history`
- Embed color turns orange/red when manipulation detected

### 📊 Market Data (Stock, Cost, Sold Rate, Market Value)

- `/value` now auto-fetches detail page to show Stock, Cost, Sold Rate, Market Value, Trade Count
- 🚨 **Price Gap Warning** when TrueVal differs >30% from real market trade price
- `getSmartValue()` uses real market data (50+ trades) over potentially manipulated TrueVal
- Scarcity info: sold out status, remaining stock calculation

### ⚖️ Compare Overhaul

- Value difference display (% from top, exact gap)
- Price efficiency: 💎 Underpriced → 🔴 Overpriced
- Trade fairness for 2 items, value spread for 3-5
- Scarcity scoring (stock + sold rate) in investment grades
- Stability warnings per item

### 🌐 Scraper Rewrite

- Puppeteer support for JS-rendered game.guide (2025 redesign)
- New card parser with child element fallback for demand/trend
- Post-scrape filter removes all-N/A items
- Reduced timeouts for Railway compatibility

### 🐛 Fixes

- "Very High" demand: color, multiplier, notifier ordering
- `/sync` timeout crash prevention
- Trend parsing for new card design
- N/A data reduction

---

## v1.0.0 — June 9, 2026

- Initial release with `/trade`, `/value`, `/market`, `/history`, `/chart`, `/forecast`, `/watch`, `/portfolio`, `/health`, `/compare`, `/top`, `/subscribe`, `/help`, `/about`
