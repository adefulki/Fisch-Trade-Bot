# 🐟 Fisch Trade Assistant Bot

A Discord bot that analyzes trades for the Roblox game **Fisch** using live market data from [game.guide](https://www.game.guide/fisch-value-list). Combines TrueVal, Trade Hub, Proto, Demand, and Trend into smart adjusted valuations powered by AI with local fallback.

---

## 📋 Commands

### `/trade`
Analyze a trade between two players.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `your_offer` | ✅ | Items you are offering (comma-separated) |
| `their_offer` | ✅ | Items they are offering (comma-separated) |

**Examples:**
```
/trade your_offer: 2 Nocturne, Scarwing their_offer: Evangeline
/trade your_offer: 3 c3, stb their_offer: 2 c4
/trade your_offer: slime booth, eye seraph their_offer: crev
```

---

### `/value`
Look up a single item's full stats and adjusted value.

**Examples:**
```
/value item: Evangeline
/value item: c3
/value item: slime booth
```

---

### `/sync`
Manually sync item values from game.guide (values also auto-update every hour).

---

### `/help`
Show a quick usage guide inside Discord (only visible to you).

---

## 🔢 Quantity Format

Quantity goes on the **left side only**:

| Format | Example | Result |
|--------|---------|--------|
| Number before name | `3 Nocturne` | 3× Nocturne |
| Nx before name | `3x Scarwing` | 3× Scarwing |
| With aliases | `4 c4` | 4× Curse IV |
| With aliases | `3 c3` | 3× Curse III |
| No number (default 1) | `Evangeline` | 1× Evangeline |

Separate multiple items with commas:
```
3 c3, 2 Nocturne, Scarwing
```

Max quantity per item: 1,000,000

---

## 🔍 Flexible Item Names

The bot uses smart fuzzy matching. You don't need exact names.

### Aliases (shorthand)

| Shorthand | Matches |
|-----------|---------|
| `c1` | Curse I |
| `c2` | Curse II |
| `c3` or `c 3` | Curse III |
| `c4` or `c 4` | Curse IV |
| `stb` | Slime Trade Booth |
| `rb` | Seraphic Rainbow |

### Shortened names
| You type | Matches |
|----------|---------|
| `evan` | Evangeline |
| `noc` | Nocturne |
| `reaper` | The Reaper |
| `cuddly` | Cuddly Claw |
| `fuchsia` | Fuchsia Fidelity |
| `malev` | Malevolence |
| `cathedral` | Cathedral Booth |

### Partial words (unordered)
| You type | Matches |
|----------|---------|
| `slime booth` | Slime Trade Booth |
| `heavy glory` | Heavyblade of Glory |
| `eye seraph` | Eye of Seraph |
| `purr rebel` | Purr of Rebellion |
| `black com` | Black Comet |
| `rb sera` | Seraphic Rainbow |
| `blk comet` | Black Comet |
| `cy demo` | Cyanic Demonride |

### Condensed names (multi-word abbreviation)
| You type | Matches |
|----------|---------|
| `crev` | Cthulu's Revenge (**C**thulu's **Rev**enge) |
| `treaper` | The Reaper (**T**he **Reaper**) |
| `pheaven` | Puff of Heaven (**P**uff **Heaven**) |
| `cdemon` | Cyanic Demonride (**C**yanic **Demon**ride) |

### Without apostrophes
| You type | Matches |
|----------|---------|
| `dutchmans` | Dutchman's Penance |
| `ravens hush` | Raven's Hush |
| `sanzus embrace` | Sanzu's Embrace |
| `cthulu revenge` | Cthulu's Revenge |

### Typos (auto-corrected)
| You type | Matches |
|----------|---------|
| `pearsickle` | Pearsicle |
| `scarwng` | Scarwing |
| `evangline` | Evangeline |
| `nocturn` | Nocturne |

### Matching priority order
1. Aliases (`c3`, `stb`, `rb`)
2. Number → Roman numeral conversion (`curse 3` → `curse iii`)
3. Exact match
4. Exact match (ignoring apostrophes/dashes)
5. All query words found in item name
6. Initials abbreviation
7. Substring match
8. Word-start sequential match
9. Word-start unordered with short abbreviations
10. Single word prefix match
11. Condensed multi-word abbreviation
12. Typo tolerance (Levenshtein distance)

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

**Output format:**
- If adjusted = raw: shows `S$ 400.0K`
- If adjusted ≠ raw: shows `S$ 400.0K → Adj: S$ 360.0K`

---

## 📊 Verdict Scale

| Verdict | Condition | Meaning |
|---------|-----------|---------|
| 🟢🟢 **BIG WIN** | Their offer > 40% more | Accept immediately |
| 🟢 **WIN** | Their offer 15-40% more | Good trade, accept |
| 🟡 **FAIR** | Within ±15% | Roughly even |
| 🔴 **LOSS** | Your offer 15-40% more | Ask them to add |
| 🔴🔴 **BIG LOSS** | Your offer > 40% more | Decline |

**Item suggestions:**
- LOSS/BIG LOSS → Bot suggests specific items they should add to make it fair
- FAIR → Bot suggests items they could add to make it a WIN for you

---

## 🤖 AI vs Local Analysis

| Mode | When | Features |
|------|------|----------|
| **AI (Gemini)** | When API quota available | Nuanced context-aware analysis |
| **Local** | When AI quota exceeded | Formula-based with item suggestions |

Auto-switches to local mode on rate limits. Users see `⚡ Analyzed locally` footer.

---

## ⏰ Auto-Sync

- Values sync from game.guide **every 1 hour** automatically
- Also syncs on bot startup
- Use `/sync` for manual refresh
- Falls back to cached data if scrape fails
- Scrapes 1000+ items including boats, rods, bobbers, gliders, booths, lanterns, halos

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

**Deploy on Railway (24/7):**
1. Push code to GitHub (without `.env`)
2. Connect repo to [railway.app](https://railway.app)
3. Add environment variables in Railway settings
4. Auto-deploys on every push

**Or keep running locally with PM2:**
```bash
npm install -g pm2
pm2 start index.js --name fisch-bot
pm2 save
```
