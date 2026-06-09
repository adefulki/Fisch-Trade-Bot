# 🐟 Fisch Trade Assistant Bot

A Discord bot that analyzes trades for the Roblox game **Fisch** using live market data from [game.guide](https://www.game.guide/fisch-value-list). Combines TrueVal, Trade Hub, Proto, Demand, and Trend into smart adjusted valuations.

---

## 📋 Commands

### `/trade`
Analyze a trade between two players.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `your_offer` | ✅ | Items you are offering (comma-separated) |
| `their_offer` | ✅ | Items they are offering (comma-separated) |

**Example:**
```
/trade your_offer: 2 Nocturne, Scarwing their_offer: Evangeline x2
```

**Output:**
```
⚖️ FISCH TRADE ASSISTANT

📦 YOUR OFFER
• Nocturne ×2 — S$ 4.00M → Adj: S$ 8.80M (TrueVal | Demand: High | ➡️ Stable)
• Scarwing — S$ 2.50M → Adj: S$ 2.75M (TrueVal | Demand: High | ➡️ Stable)
Total Adjusted Value: S$ 11.55M

🎁 THEIR OFFER
• Evangeline ×2 — S$ 4.50M → Adj: S$ 9.90M (TrueVal | Demand: High | ➡️ Stable)
Total Adjusted Value: S$ 9.90M

━━━━━━━━━━━━━━━━━━━━━━━━
📊 VERDICT: 🔴 LOSS 🔴

📝 RECOMMENDATION:
You're underpaid by ~S$ 1.65M. Ask them to add more to make it fair.
💡 Ask them to add: The Reaper (S$ 1.76M) (≈ S$ 1.65M needed).
```

---

### `/value`
Look up a single item's value and stats.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `item` | ✅ | Item name to look up |

**Example:**
```
/value item: Evangeline
```

**Output:**
```
🔍 Evangeline

TrueVal: S$ 4,500,000
Trade Hub: S$ 4,600,000
Proto: 1,500
Demand: High
Trend: ➡️ Stable

💰 Adjusted Value: S$ 4.95M (TrueVal × demand × trend)
```

---

### `/sync`
Manually sync item values from game.guide. Values auto-sync every 1 hour.

**Parameters:** None

**Example:**
```
/sync
```

**Output:**
```
✅ Values synced! Loaded 1050 items.
```

---

## 🎯 Quantity Support

You can specify multiple quantities of the same item:

| Format | Example |
|--------|---------|
| Number before name | `2 Nocturne` |
| `Nx` before name | `3x Scarwing` |
| `xN` after name | `Evangeline x2` |
| No number (default 1) | `Curse IV` |

Max quantity: 1,000,000

---

## 🔍 Flexible Item Names

The bot uses smart fuzzy matching. You don't need to type exact names:

| You type | Matches |
|----------|---------|
| `slime booth` | Slime Trade Booth |
| `evan` | Evangeline |
| `noc` | Nocturne |
| `reaper` | The Reaper |
| `rb sera` | Seraphic Rainbow |
| `crev` | Cthulu's Revenge |
| `pheaven` | Puff of Heaven |
| `heavy glory` | Heavyblade of Glory |
| `curse 4` | Curse IV |
| `pearsickle` (typo) | Pearsicle |
| `dutchmans` | Dutchman's Penance |
| `blk comet` | Black Comet |
| `cy demo` | Cyanic Demonride |
| `purr rebel` | Purr of Rebellion |
| `treaper` | The Reaper |
| `eye seraph` | Eye of Seraph |

**Matching methods (in priority order):**
1. Exact match
2. Exact match (ignoring apostrophes/dashes)
3. All query words found in item name
4. Initials abbreviation (e.g. `stb` → Slime Trade Booth)
5. Substring match
6. Word-start sequential (e.g. `cya demon` → Cyanic Demonride)
7. Word-start unordered with short abbreviations (e.g. `rb sera`)
8. Single word prefix (e.g. `evan` → Evangeline)
9. Condensed multi-word (e.g. `crev` → Cthulu's Revenge)
10. Typo tolerance (Levenshtein distance)

---

## 📊 How Valuation Works

The bot calculates an **Adjusted Value** for each item:

```
Adjusted Value = Base Value × Demand Multiplier × Trend Multiplier
```

**Base Value priority:**
1. TrueVal (if available)
2. Trade Hub (if TrueVal is N/A)
3. Proto estimate (Proto × multiplier based on demand)

**Demand Multipliers:**
| Demand | Multiplier | Effect |
|--------|-----------|--------|
| Limited | ×1.25 | +25% (extremely rare) |
| High | ×1.10 | +10% |
| Medium | ×1.00 | No change |
| Low | ×0.90 | -10% |
| Very Low | ×0.80 | -20% |

**Trend Multipliers:**
| Trend | Multiplier | Effect |
|-------|-----------|--------|
| Rising 📈 | ×1.10 | +10% |
| Stable ➡️ | ×1.00 | No change |
| Dropping 📉 | ×0.88 | -12% |
| Unstable ⚡ | ×0.95 | -5% |

---

## 📊 Verdict Scale

| Verdict | Condition | Meaning |
|---------|-----------|---------|
| 🟢🟢 **BIG WIN** | Their offer > 40% more | Accept immediately |
| 🟢 **WIN** | Their offer 15-40% more | Good trade, accept |
| 🟡 **FAIR** | Within ±15% | Roughly even |
| 🔴 **LOSS** | Your offer 15-40% more | Ask them to add |
| 🔴🔴 **BIG LOSS** | Your offer > 40% more | Decline |

---

## 🤖 AI vs Local Analysis

The bot has two analysis modes:

| Mode | When | Features |
|------|------|----------|
| **AI (Gemini)** | When API quota available | Nuanced context-aware analysis |
| **Local** | When AI quota exceeded | Formula-based with item suggestions |

The bot auto-switches to local mode when hitting rate limits, and retries AI after cooldown. Users see a small footer `⚡ Analyzed locally` when in local mode.

---

## ⏰ Auto-Sync

- Values sync from game.guide **every 1 hour** automatically
- Also syncs on bot startup
- Use `/sync` for manual refresh
- Falls back to cached data if scrape fails

---

## 🛠️ Setup

1. Create a Discord bot at [discord.com/developers](https://discord.com/developers/applications)
2. Get a Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
3. Fill in `.env`:
   ```
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_application_id
   GEMINI_API_KEY=your_gemini_key
   ```
4. Install & run:
   ```bash
   npm install
   npm run deploy    # Register slash commands (once)
   npm start         # Start the bot
   ```

**Keep running 24/7 with PM2:**
```bash
npm install -g pm2
pm2 start index.js --name fisch-bot
pm2 save
```
