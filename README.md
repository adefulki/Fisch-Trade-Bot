# 🐟 Fisch Trade Assistant Bot

A Discord bot that analyzes trades for the Roblox game **Fisch** using live market data from [game.guide](https://www.game.guide/fisch-value-list). Combines TrueVal, Trade Hub, Proto, Demand, and Trend into smart adjusted valuations powered by AI with local fallback. Includes market analytics and price history tracking.

---

## 📋 Commands

| Command | Description |
|---------|-------------|
| `/trade` | Analyze a trade (AI + local fallback) |
| `/value` | Look up a single item's value |
| `/market` | Market analytics: top items, trends, flips |
| `/history` | Price change history for an item |
| `/sync` | Force refresh values from game.guide |
| `/help` | Show usage guide in Discord |
| `/about` | Show bot info and creator details |
| `/chart` | Show a price chart for an item over time |

---

## 🎯 Features

- **AI Trade Analysis** — Gemini AI combines all metrics for nuanced verdicts (with local formula fallback)
- **Smart Fuzzy Matching** — `c3`, `slime booth`, `crev`, typos all work
- **Quantity Support** — `3 Nocturne`, `3x c3`, `4 curse 4`
- **Market Analytics** — Top items, rising/dropping, best flips, volatility
- **Price History** — Track how items change over 90 days
- **Auto-Sync** — Scrapes 1050+ items every hour from game.guide
- **Change Notifications** — Posts value changes to a Discord channel (📈 UP / 📉 DOWN separated)
- **Item Suggestions** — Recommends specific items to add for unfair trades

---

## 🔢 Quantity Format

Quantity goes **before** the item name only:

```
3 Nocturne       → 3× Nocturne
3x Scarwing      → 3× Scarwing
4 curse 4        → 4× Curse IV
3 c3             → 3× Curse III
```

---

## 🔍 Flexible Item Names

| Input | Matches |
|-------|---------|
| `c3`, `c4` | Curse III, Curse IV |
| `stb` | Slime Trade Booth |
| `evan` | Evangeline |
| `crev` | Cthulu's Revenge |
| `rb sera` | Seraphic Rainbow |
| `slime booth` | Slime Trade Booth |
| `heavy glory` | Heavyblade of Glory |
| `pheaven` | Puff of Heaven |
| `pearsickle` | Pearsicle (typo) |
| `dutchmans` | Dutchman's Penance |

**Matching priority:** Aliases → Roman numeral conversion → Exact → Words match → Initials → Substring → Word-start → Unordered prefix → Prefix → Condensed → Levenshtein typo tolerance

---

## 📊 Valuation

```
Adjusted Value = Base Value × Demand Multiplier × Trend Multiplier
```

| Demand | Multiplier | | Trend | Multiplier |
|--------|-----------|---|-------|-----------|
| Limited | ×1.25 | | Rising 📈 | ×1.10 |
| High | ×1.10 | | Stable ➡️ | ×1.00 |
| Medium | ×1.00 | | Dropping 📉 | ×0.88 |
| Low | ×0.90 | | Unstable ⚡ | ×0.95 |
| Very Low | ×0.80 | | | |

---

## 📈 Market Analytics (`/market`)

- 🏆 Top 10 most valuable items
- 📈 Currently rising items
- 📉 Currently dropping items
- 🚀 Biggest price gainers (historical)
- 💀 Biggest price losers (historical)
- ⚡ Most volatile items (most frequent changes)
- 💰 Best flip opportunities (High demand + underpriced in Trade Hub)

---

## 📜 Price History (`/history`)

Tracks every value change per item over 90 days:
- Shows current values
- Lists all recorded changes with timestamps (WIB timezone)
- Each entry shows field: before → after

History accumulates automatically from hourly syncs.

---

## 🔔 Change Notifications

Posts to a Discord channel when values change during sync:

```
📢 FISCH VALUE UPDATE — 11 Jun 2026, 14:00 WIB

📈 VALUE UP (3)
> • Nocturne — TrueVal: S$ 4.00M → S$ 4.20M

📉 VALUE DOWN (2)
> • Curse III — Trade Hub: S$ 600.0K → S$ 572.0K
```

---

## 🛠️ Setup

1. Create a Discord bot at [discord.com/developers](https://discord.com/developers/applications)
2. Get a Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
3. Fill in `.env` or Railway environment variables:
   ```
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_application_id
   GEMINI_API_KEY=your_gemini_key
   NOTIFICATION_CHANNEL_ID=your_channel_id
   VOLUME_PATH=./data
   ```
4. Install & run:
   ```bash
   npm install
   npm run deploy    # Register slash commands (once)
   npm start         # Start the bot
   ```

---

## 🚀 Deploy on Railway (24/7)

1. Push code to GitHub (without `.env`)
2. Connect repo to [railway.app](https://railway.app)
3. Add environment variables in Railway settings
4. Add a **Volume** (mount path: `/data`) for persistent history storage
5. Set `VOLUME_PATH=/data` in Railway env vars
6. Auto-deploys on every push

---

## 📁 Project Structure

```
├── index.js                  # Entry point
├── deploy-commands.js        # Register slash commands
├── values.js                 # Fallback hardcoded values
├── package.json
├── .env
├── README.md
├── COMMANDS.md
├── data/
│   ├── values.json           # Current scraped data
│   └── history.json          # Price change history (90 days)
└── src/
    ├── bot.js                # Discord client, cron, command router
    ├── commands/
    │   ├── trade.js          # /trade
    │   ├── value.js          # /value
    │   ├── market.js         # /market (paginated)
    │   ├── history.js        # /history
    │   ├── chart.js          # /chart (price chart image)
    │   ├── sync.js           # /sync
    │   ├── help.js           # /help
    │   └── about.js          # /about
    ├── services/
    │   ├── ai.js             # Gemini AI integration
    │   ├── analyzer.js       # Local trade valuation
    │   ├── matcher.js        # Fuzzy item matching
    │   ├── notifier.js       # Discord notifications
    │   ├── scraper.js        # game.guide scraper
    │   └── chart.js          # QuickChart.io chart generation
    ├── data/
    │   └── history.js        # Historical data + analytics
    └── utils/
        ├── constants.js      # Multipliers, aliases, roman numerals
        ├── format.js         # Value formatting helpers
        └── discord.js        # Embed, pagination, message splitting
```

---

## 🤖 AI vs Local Mode

| Mode | When | Features |
|------|------|----------|
| **AI (Gemini)** | API quota available | Nuanced context-aware analysis |
| **Local** | AI quota exceeded | Formula-based, instant, with item suggestions |

Auto-switches on rate limits. Users see `⚡ Analyzed locally` footer when in local mode.

---

## 👤 Creator

| | |
|--|--|
| **Discord** | adefulkih (`456285930420961281`) |
| **GitHub** | [adefulki](https://github.com/adefulki) |
| **Roblox** | RiseFromHell (`adefulkih`) |
