# 🐟 Fisch Trade Assistant — User Guide

## Commands

### /trade
Analyze a trade to see if it's a win or loss. Shows market value warnings when listed price differs from real trading price.

**Usage:**
```
/trade your_offer: [your items] their_offer: [their items]
```

**Examples:**
```
/trade your_offer: Evangeline their_offer: Nocturne, Scarwing
/trade your_offer: 3 c3, stb their_offer: 2 c4
/trade your_offer: slime booth, eye seraph their_offer: crev
/trade your_offer: 4 curse 4 their_offer: 2 evan
```

**Features:**
- Market value warnings (⚠️) when an item's real trade price differs from listed value
- Stability warnings (🚨) when items show signs of manipulation
- Item suggestions when trade is unfair

---

### /value
Look up a single item's full stats, market data, stability analysis, and adjusted value. Includes a **"View History"** button.

**Examples:**
```
/value item: Evangeline
/value item: c3
/value item: slime booth
```

**Shows:**
- TrueVal, Trade Hub, Proto, Demand, Trend
- 💰 Adjusted Value (with formula breakdown)
- 📦 Stock, 💎 Cost (Robux), 🔥 Sold Rate (when available)
- 🏪 Community Market Value (real trade price from active trades)
- 🚨 Price Gap Warning (when listed value differs >30% from market)
- 📊 Market Info (remaining stock, sold out status)
- 🛡️ Stability analysis (manipulation detection)

---

### /compare
Compare 2-5 items side by side with investment scores, value differences, price efficiency, and stability warnings.

**Usage:**
```
/compare items: Evangeline, Nocturne, Curse IV
/compare items: c3, c4, Scarwing
```

**Shows:**
- Each item ranked by investment score (0-100, grade S to F)
- 💰 Adjusted value with % difference from top item
- Price efficiency: 💎 Underpriced / ✅ Good value / ➡️ Fair / ⚠️ Pricey / 🔴 Overpriced
- Value comparison: exact gap, trade fairness (for 2 items), or value spread (for 3-5)
- Stability warnings per item
- 💡 Investment suggestion + best value-for-money highlight
- Score factors: demand, trend, value tier, proto, forecast, scarcity (stock + sold rate)

---

### /roi
Show top items by Return on Investment (current value ÷ original Robux cost).

**Usage:**
```
/roi                    → sorted by ROI multiplier (default)
/roi sort: 📊 ROI Multiplier
/roi sort: 💰 Current Value
/roi sort: 💎 Robux Cost
```

**Shows:**
- Item name, Robux cost, current value, ROI multiplier
- Demand level, sold rate
- Paginated (10 per page) with navigation buttons

*Note: Only shows items where cost data is available from game.guide detail pages.*

---

### /liquidity
Show items ranked by how easy they are to sell.

**Usage:**
```
/liquidity
```

**Shows:**
- Top 15 most liquid items (easiest to sell)
- Bottom 5 least liquid items (hardest to sell)
- Liquidity score (0-100) based on: trade count (40pts), sold rate (35pts), demand (25pts)
- Grades: 🟢 Very Liquid → 🟢 Liquid → 🟡 Moderate → 🟠 Low Liquidity → 🔴 Illiquid

*Note: Requires market data from game.guide detail pages (trade count, sold rate).*

---

### /similar
Find items within a value range of a target item. Shows trade alternatives — fair swaps, cheaper options, and pricier upgrades.

**Usage:**
```
/similar item: Evangeline              → ±30% range (default)
/similar item: Scarwing range: 15      → ±15% (tighter, fewer results)
/similar item: c3 range: 50            → ±50% (wider, more results)
```

**Shows:**
- Items sorted by closest value match
- 🟢 Fair swap (±10%), 🟡 Close (±15%), 🟠 Needs adds
- Trade hints: "fair 1:1 swap", "they'd need to add", "you'd need to add"
- Summary: how many fair swaps, cheaper, and pricier alternatives
- Demand, trend, and proto for each item

---

### /market
Show market analytics: top valued items, rising/dropping trends, biggest gainers/losers, most volatile items, and best flip opportunities.

**Usage:**
```
/market              → last 7 days (default)
/market days: 14     → last 14 days
/market days: 30     → last 30 days
```

**Shows:**
- 🏆 Top 10 most valuable items
- 📈 Currently rising items
- 📉 Currently dropping items
- 🚀 Biggest gainers / 💀 Biggest losers
- ⚡ Most volatile (most frequent price changes)
- 💰 Best flip opportunities (High demand, underpriced in Trade Hub)

---

### /history
Show price charts + change history + stability analysis for a specific item.

**Usage:**
```
/history item: Evangeline          → last 30 days (default)
/history item: c3 days: 7          → last 7 days
/history item: Nocturne days: 60   → last 60 days
```

**Shows:**
- Dual-line chart (TrueVal green, Trade Hub red)
- Proto chart (gold, if data exists)
- Current values + High/Low/Total Change stats
- 🛡️ Stability analysis (manipulation detection for the time period)
- Timeline of all changes (newest first, paginated)

---

### /chart
Show price charts for an item (TrueVal + Trade Hub dual line, Proto).

**Usage:**
```
/chart item: Evangeline
/chart item: c3 days: 14
```

---

### /forecast
Price trend prediction based on recent price history (linear regression).

**Usage:**
```
/forecast item: Evangeline
/forecast item: c3 days: 14
```

**Shows:**
- Current value and trend direction
- Daily change rate (value + percentage)
- 7-day price prediction
- Confidence level (Low/Medium/High)

*Requires at least 3 recorded price changes.*

---

### /top
Show top 100 items with configurable sorting. Paginated.

**Usage:**
```
/top                              → default: Investment Grade
/top sort: 📊 Investment Grade
/top sort: 💎 TrueVal (highest)
/top sort: 🏪 Trade Hub (highest)
/top sort: 🪙 Proto (highest)
/top sort: 🔥 Demand (highest)
/top sort: 📈 Rising items
/top sort: 📉 Dropping items
```

---

### /watch
Manage price alerts. Get a DM when an item hits your target price.

**Usage:**
```
/watch add item: Evangeline condition: above price: 5000000
/watch add item: Curse III condition: below price: 400000
/watch remove item: Evangeline
/watch list
```

- Max 10 watches per user
- Alerts sent via DM, auto-remove after triggering

---

### /portfolio
Track your item holdings, see total value with ROI, and get trade deal alerts.

**Usage:**
```
/portfolio add item: Nocturne qty: 2
/portfolio view
/portfolio remove item: Nocturne
/portfolio clear
/portfolio watch toggle: 🔔 On
/portfolio watch toggle: 🔕 Off
```

**Trade Deal Alerts:** When enabled, bot scans game.guide every 15 minutes and DMs you when WIN trades appear for your items.

---

### /health
Show overall market health index — is the market bullish or bearish?

**Usage:**
```
/health
/health days: 14
```

---

### /subscribe / /unsubscribe
Subscribe a channel to receive value change notifications. Requires **Manage Channels** permission.

```
/subscribe                    → subscribes current channel
/subscribe channel: #updates  → subscribes a specific channel
/unsubscribe                  → stop alerts
```

---

### /sync
Force refresh item values from game.guide (owner only). Values auto-update every hour.

---

### /help
Show a quick usage guide inside Discord.

---

### /about
Show bot information and creator details.

---

## Quantity Format

| Format | Example | Result |
|--------|---------|--------|
| Number + space | `3 Nocturne` | 3× Nocturne |
| Number + x + space | `3x Nocturne` | 3× Nocturne |
| With aliases | `4 c4` | 4× Curse IV |
| No number | `Evangeline` | 1× Evangeline |

Separate multiple items with commas: `3 c3, 2 Nocturne, Scarwing`

---

## Flexible Item Names

All item fields have **autocomplete** — start typing and the bot suggests matches.

### Quick Aliases
| Type | Gets |
|------|------|
| `c3` | Curse III |
| `c4` | Curse IV |
| `stb` | Slime Trade Booth |
| `rb` | Seraphic Rainbow |

### Shortened Names
| Type | Gets |
|------|------|
| `evan` | Evangeline |
| `noc` | Nocturne |
| `reaper` | The Reaper |
| `cuddly` | Cuddly Claw |

### Partial Words
| Type | Gets |
|------|------|
| `slime booth` | Slime Trade Booth |
| `heavy glory` | Heavyblade of Glory |
| `purr rebel` | Purr of Rebellion |

### Condensed Names
| Type | Gets |
|------|------|
| `crev` | Cthulu's Revenge |
| `pheaven` | Puff of Heaven |
| `cdemon` | Cyanic Demonride |

### Typos (Auto-Corrected)
| Type | Gets |
|------|------|
| `pearsickle` | Pearsicle |
| `scarwng` | Scarwing |
| `evangline` | Evangeline |

---

## Understanding the Output

### Trade Verdict Scale

| Verdict | Meaning | What to do |
|---------|---------|------------|
| 🟢🟢 **BIG WIN** | You're getting way more value | Accept immediately |
| 🟢 **WIN** | Trade favors you | Accept it |
| 🟡 **FAIR** | Roughly equal (±15%) | Accept if you want their items |
| 🔴 **LOSS** | You're giving more value | Ask them to add |
| 🔴🔴 **BIG LOSS** | Massive value gap | Decline |

### Adjusted Value
```
Adjusted Value = Raw Value × Demand Multiplier × Trend Multiplier
```

| Demand | Effect | | Trend | Effect |
|--------|--------|---|-------|--------|
| Limited | +25% | | 📈 Rising | +10% |
| Very High | +15% | | ➡️ Stable | 0% |
| High | +10% | | 📉 Dropping | -12% |
| Medium | 0% | | ⚡ Unstable | -5% |
| Low | -10% | | | |
| Very Low | -20% | | | |

### Smart Value
When community market data is available (50+ active trades), the bot uses real trade prices instead of potentially manipulated TrueVal. This gives more accurate trade verdicts.

### Manipulation Detection

| Level | Score | Meaning |
|-------|-------|---------|
| ✅ Stable | 85-100 | No issues detected |
| ℹ️ Moderate | 65-84 | Minor activity (no warning shown) |
| ⚠️ Suspicious | 40-64 | Unusual changes detected |
| 🚨 Likely Manipulated | 0-39 | Strong manipulation signals |

### Price Efficiency (in /compare)

| Rating | Meaning |
|--------|---------|
| 💎 Underpriced | High quality, low cost — best deal |
| ✅ Good value | Above average value for price |
| ➡️ Fair price | Expected price for its quality |
| ⚠️ Pricey | Paying more than expected for quality |
| 🔴 Overpriced | Way too expensive for what you get |

---

## Tips

- Values update every hour automatically from game.guide
- 🚨 **Always check Price Gap warnings** — don't overpay based on inflated TrueVal
- ⚠️ **Check stability** before trading high-value items
- Use `/roi` to find the best investments per Robux spent
- Use `/liquidity` to verify you can actually sell at listed price
- Use `/compare` to see which item gives best value-for-money
- Use `/market` to find flip opportunities
- Use `/history` to check trends before accepting trades
- Use `/forecast` to see where prices are heading
- Use `/watch` to get DM'd when an item hits your target
- Use `/portfolio` to track investments and get trade deal alerts
- Use `/health` to check if the market is bullish or bearish
- History data is kept for 90 days then auto-pruned
