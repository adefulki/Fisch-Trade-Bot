# 🐟 Fisch Trade Assistant — User Guide

## Commands

### /trade
Analyze a trade to see if it's a win or loss.

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

---

### /value
Look up a single item's full stats and adjusted value. Includes a **"View History"** button to see recent price changes and chart.

**Examples:**
```
/value item: Evangeline
/value item: c3
/value item: slime booth
/value item: crev
```

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
- 🚀 Biggest gainers (price went up most)
- 💀 Biggest losers (price went down most)
- ⚡ Most volatile (most frequent price changes)
- 💰 Best flip opportunities (High demand, underpriced in Trade Hub)

---

### /history
Show price charts + change history for a specific item. Displays:
- **Chart 1:** TrueVal + Trade Hub (dual line)
- **Chart 2:** Proto value (if proto has changed)
- Paginated list of all recorded changes (newest first)

**Usage:**
```
/history item: Evangeline          → last 30 days (default)
/history item: c3 days: 7          → last 7 days
/history item: Nocturne days: 60   → last 60 days
```

**Shows:**
- Dual-line chart (TrueVal green, Trade Hub red)
- Proto chart (gold, if data exists)
- Current values (TrueVal, Trade Hub, Proto, Demand, Trend)
- High / Low / Total Change stats
- Timeline of all changes (newest first, paginated with ◀ ▶ buttons)

*Note: History accumulates over time. The bot records changes every hour.*

---

### /sync
Force refresh item values from game.guide. Values also auto-update every hour.

**Usage:**
```
/sync
```

---

### /help
Show a quick guide inside Discord (only visible to you).

**Usage:**
```
/help
```

---

### /about
Show bot information, features, and creator details.

**Usage:**
```
/about
```

---

### /chart
Show price charts for an item. Displays two charts:
- **Chart 1:** TrueVal (green) + Trade Hub (red) — dual line comparison
- **Chart 2:** Proto value (gold) — shown if proto has changed

Requires at least 2 recorded price changes.

**Usage:**
```
/chart item: Evangeline
/chart item: c3 days: 14
/chart item: Nocturne days: 60
```

**Shows:**
- TrueVal & Trade Hub chart with change stats
- Proto chart with change stats
- Current values, demand, and trend

---

### /subscribe
Subscribe a channel in your server to receive value change notifications. Requires **Manage Channels** permission.

**Usage:**
```
/subscribe                    → subscribes current channel
/subscribe channel: #updates  → subscribes a specific channel
```

Only one channel per server. Running again replaces the previous subscription.

---

### /unsubscribe
Stop receiving value change notifications in this server. Requires **Manage Channels** permission.

**Usage:**
```
/unsubscribe
```

---

### /forecast
Price trend prediction for an item based on recent price history. Uses linear regression to project future values.

**Usage:**
```
/forecast item: Evangeline
/forecast item: c3 days: 14
```

**Shows:**
- Current value and trend direction (Rising/Falling/Stable)
- Daily change rate (value + percentage)
- 7-day price prediction
- Confidence level (Low/Medium/High) based on data consistency

*Requires at least 3 recorded price changes for the item.*

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
- Alerts are sent via DM
- Watches auto-remove after triggering
- Conditions: `above` (≥ target) or `below` (≤ target)

---

### /portfolio
Track your item holdings and see total value with ROI (Return on Investment).

**Usage:**
```
/portfolio add item: Nocturne qty: 2       → add items (records current price as buy price)
/portfolio view                            → see all holdings + ROI
/portfolio remove item: Nocturne           → remove item
/portfolio remove item: Nocturne qty: 1    → remove specific quantity
/portfolio clear                           → clear everything
```

**Shows:**
- Each item with quantity, current value, and ROI %
- Total portfolio value vs total invested
- Total ROI (profit/loss)

Max 25 items per user. Buy price is averaged when adding more of the same item.

---

### /health
Show the overall market health index — is the market bullish or bearish?

**Usage:**
```
/health
/health days: 14
```

**Shows:**
- Sentiment score (-100 to +100)
- Visual sentiment bar
- Market status: Bullish / Slightly Bullish / Neutral / Slightly Bearish / Bearish
- Breakdown: rising vs dropping, gainers vs losers, demand distribution
- Activity level: Quiet → Moderate → Active → Very Active

---

## Quantity Format

Quantity goes **before** the item name only:

| Format | Example | Result |
|--------|---------|--------|
| Number + space | `3 Nocturne` | 3× Nocturne |
| Number + x + space | `3x Nocturne` | 3× Nocturne |
| With aliases | `4 c4` | 4× Curse IV |
| With aliases | `3 c3` | 3× Curse III |
| No number | `Evangeline` | 1× Evangeline |

Separate multiple items with commas:
```
3 c3, 2 Nocturne, Scarwing
```

---

## Flexible Item Names

All item fields have **autocomplete** — start typing and the bot suggests matching items in a dropdown. You can also type freely using shortcuts and abbreviations:

### Quick Aliases

| Type this | Gets this |
|-----------|-----------|
| `c3` | Curse III |
| `c4` | Curse IV |
| `stb` | Slime Trade Booth |
| `rb` | Seraphic Rainbow |

### Shortened Names

| Type this | Gets this |
|-----------|-----------|
| `evan` | Evangeline |
| `noc` | Nocturne |
| `reaper` | The Reaper |
| `cuddly` | Cuddly Claw |
| `malev` | Malevolence |

### Partial Words

| Type this | Gets this |
|-----------|-----------|
| `slime booth` | Slime Trade Booth |
| `heavy glory` | Heavyblade of Glory |
| `eye seraph` | Eye of Seraph |
| `purr rebel` | Purr of Rebellion |
| `rb sera` | Seraphic Rainbow |

### Condensed Names

| Type this | Gets this |
|-----------|-----------|
| `crev` | Cthulu's Revenge |
| `treaper` | The Reaper |
| `pheaven` | Puff of Heaven |
| `cdemon` | Cyanic Demonride |

### Without Apostrophes

| Type this | Gets this |
|-----------|-----------|
| `dutchmans` | Dutchman's Penance |
| `ravens hush` | Raven's Hush |
| `cthulu revenge` | Cthulu's Revenge |

### Typos (Auto-Corrected)

| Type this | Gets this |
|-----------|-----------|
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

Items show raw value and adjusted value based on demand/trend:
- `S$ 400.0K` = raw value (no adjustment needed)
- `S$ 400.0K → Adj: S$ 360.0K` = demand/trend reduced the effective value

**Demand effect:** Limited +25% | High +10% | Medium 0% | Low -10% | Very Low -20%

**Trend effect:** 📈 Rising +10% | ➡️ Stable 0% | 📉 Dropping -12% | ⚡ Unstable -5%

### Item Suggestions

If a trade is unfair, the bot suggests specific items to add:
```
💡 Ask them to add: The Reaper (S$ 1.76M) (≈ S$ 2.20M needed).
```

---

## Market Analytics

The `/market` command shows live market insights:

- **Best Flip Opportunities** — Items where Trade Hub price is lower than TrueVal with High demand. Buy low in Trade Hub, sell at TrueVal.
- **Most Volatile** — Items that change price frequently. Good for active traders.
- **Biggest Gainers/Losers** — Items that gained or lost the most value over the selected period.

---

## Price History

The `/history` command tracks how an item's value changed over time:

```
📜 Evangeline — Price History (last 30 days)

Current: TrueVal: S$ 4.50M | Trade Hub: S$ 4.60M | Demand: High | Trend: Stable

📊 3 changes recorded:
> 2 Jun, 14:00  TrueVal: S$ 4.20M → S$ 4.35M
> 5 Jun, 08:00  TrueVal: S$ 4.35M → S$ 4.50M
> 8 Jun, 20:00  Trade Hub: S$ 4.40M → S$ 4.60M
```

History builds up automatically. More time = more data = better analytics.

---

## Value Change Notifications

The bot posts automatic notifications to a designated channel when values change:

```
📢 FISCH VALUE UPDATE — 11 Jun 2026, 14:00 WIB

📈 VALUE UP (3)
> • Grand Symphony — Trade Hub: S$ 152.0K → S$ 154.0K
> • Nocturne — Trend: Stable → Rising

📉 VALUE DOWN (2)
> • Pearsicle — Trade Hub: S$ 31.1K → S$ 30.5K
> • Curse III — Trend: Stable → Dropping
```

---

## Tips

- Values update automatically every hour from game.guide
- Items with 📈 Rising trend are worth more — hold them
- Items with 📉 Dropping trend are worth less — trade them away soon
- Use `/market` to find flip opportunities before trading
- Use `/history` to check if an item's value is going up or down before accepting a trade
- Use `/forecast` to see where an item's price is heading
- Use `/watch` to get notified the moment an item hits your target price
- Use `/portfolio` to track your investments and see ROI
- Use `/health` to check if the overall market is bullish or bearish
- History data is kept for 90 days then auto-pruned
