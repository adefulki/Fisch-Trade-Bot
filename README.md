# 🐟 Fisch Trade Assistant Bot

A Discord bot that analyzes trades for the Roblox game **Fisch** using live market data from [game.guide](https://www.game.guide/fisch-value-list). Combines TrueVal, Trade Hub, Proto, Demand, and Trend into smart adjusted valuations powered by AI with local fallback.

---

# 👤 For Users

## Add the Bot to Your Server

[Click here to invite the bot](https://discord.com/oauth2/authorize?client_id=1513696596435402752&permissions=2147485696&scope=bot+applications.commands)

That's it — all commands work immediately after inviting.

---

## Commands

| Command | Description |
|---------|-------------|
| `/trade` | Analyze a trade between two players |
| `/value` | Look up a single item's value |
| `/market` | Market analytics: top items, trends, flips |
| `/history` | Price chart + change history for an item |
| `/chart` | Quick price chart (standalone) |
| `/subscribe` | Get value change alerts in a channel |
| `/unsubscribe` | Stop value change alerts |
| `/forecast` | Price trend prediction for an item |
| `/watch` | Price alerts (add/remove/list) |
| `/portfolio` | Track your holdings with ROI |
| `/health` | Market health index (bullish/bearish) |
| `/help` | Show quick usage guide |
| `/about` | Bot info and creator details |

---

## How to Trade

```
/trade your_offer: 2 Nocturne, Scarwing their_offer: Evangeline
```

The bot will tell you if it's a **WIN**, **FAIR**, or **LOSS** — and suggest specific items to add if it's unfair.

---

## Quantity Format

Put the number **before** the item name:

```
3 Nocturne       → 3× Nocturne
3x Scarwing      → 3× Scarwing
4 curse 4        → 4× Curse IV
3 c3             → 3× Curse III
```

Separate multiple items with commas: `3 c3, 2 Nocturne, Scarwing`

---

## Flexible Item Names

You don't need exact names. The bot has **autocomplete** — start typing and it suggests matching items. You can also type freely using shortcuts:

| You type | Gets |
|----------|------|
| `c3`, `c4` | Curse III, Curse IV |
| `stb` | Slime Trade Booth |
| `evan` | Evangeline |
| `noc` | Nocturne |
| `crev` | Cthulu's Revenge |
| `rb sera` | Seraphic Rainbow |
| `slime booth` | Slime Trade Booth |
| `heavy glory` | Heavyblade of Glory |
| `pheaven` | Puff of Heaven |
| `reaper` | The Reaper |
| `pearsickle` (typo) | Pearsicle |
| `dutchmans` | Dutchman's Penance |

---

## Verdict Scale

| Verdict | Meaning | Action |
|---------|---------|--------|
| 🟢🟢 **BIG WIN** | You're getting way more value | Accept immediately |
| 🟢 **WIN** | Trade favors you | Accept |
| 🟡 **FAIR** | Roughly equal (±15%) | Accept if you prefer their items |
| 🔴 **LOSS** | You're giving more value | Ask them to add |
| 🔴🔴 **BIG LOSS** | Massive value gap | Decline |

---

## Value Change Notifications

Server admins can subscribe a channel to get automatic alerts when values change:

```
/subscribe                    → subscribe current channel
/subscribe channel: #updates  → subscribe a specific channel
/unsubscribe                  → stop alerts
```

Requires **Manage Channels** permission. One channel per server.

---

## Market Analytics

Use `/market` to see:
- 🏆 Top 10 most valuable items
- 📈 Currently rising items
- 📉 Currently dropping items
- 🚀 Biggest gainers / 💀 Biggest losers
- ⚡ Most volatile items
- 💰 Best flip opportunities

All sections displayed at once as multiple embeds.

---

## Price Charts

```
/chart item: Evangeline days: 30
/history item: Nocturne
```

Shows two charts:
- **TrueVal + Trade Hub** (green & red lines) — value comparison over time
- **Proto** (gold line) — proto changes over time

Both `/chart` and `/history` display these charts. `/history` also includes the change log.

---

## How Values Are Calculated

```
Adjusted Value = Raw Value × Demand × Trend
```

| Demand | Effect | | Trend | Effect |
|--------|--------|---|-------|--------|
| Limited | +25% | | 📈 Rising | +10% |
| High | +10% | | ➡️ Stable | 0% |
| Medium | 0% | | 📉 Dropping | -12% |
| Low | -10% | | ⚡ Unstable | -5% |
| Very Low | -20% | | | |

High demand items sell fast and trade above listed price. Low demand items are harder to sell.

---

## Tips

- Values update every hour automatically from game.guide
- Use `/market` to find flip opportunities before trading
- Use `/history` to check trends and price charts before accepting
- Use `/forecast` to see where prices are heading
- Use `/watch` to get DM'd when an item hits your target price
- Use `/portfolio` to track your investments and see ROI
- Use `/health` to check if the market is bullish or bearish
- Bot suggests specific items to add when a trade is unfair
- If you see `⚡ Analyzed locally` — AI is on cooldown, results still accurate

---

---

# 🛠️ For Developers

## Setup

### Prerequisites
- Node.js 18+
- Discord Bot Token ([discord.com/developers](https://discord.com/developers/applications))
- Gemini API Key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### Installation

```bash
git clone https://github.com/adefulki/fisch-trade-bot.git
cd fisch-trade-bot
npm install
```

### Environment Variables

Create `.env`:
```
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GEMINI_API_KEY=your_gemini_key
NOTIFICATION_CHANNEL_ID=your_channel_id
VOLUME_PATH=./data
```

### Run

```bash
npm run deploy    # Register slash commands (once)
npm start         # Start the bot
```

---

## Deploy on Railway (24/7)

1. Push code to GitHub (without `.env`)
2. Connect repo to [railway.app](https://railway.app)
3. Add environment variables in Railway settings
4. Add a **Volume** (mount path: `/data`) for persistent storage
5. Set `VOLUME_PATH=/data` in Railway env vars
6. Auto-deploys on every push

---

## Architecture

```
├── index.js                  # Entry point
├── deploy-commands.js        # Register slash commands
├── values.js                 # Fallback hardcoded values
├── package.json
├── data/
│   ├── values.json           # Current scraped data
│   ├── history.json          # Price change history (90 days)
│   ├── subscriptions.json    # Server notification subscriptions
│   ├── watchlist.json        # User price alerts
│   └── portfolios.json       # User portfolio holdings
└── src/
    ├── bot.js                # Discord client, cron, command router
    ├── commands/
    │   ├── trade.js          # /trade
    │   ├── value.js          # /value
    │   ├── market.js         # /market (multi-embed)
    │   ├── history.js        # /history
    │   ├── chart.js          # /chart (QuickChart image)
    │   ├── forecast.js       # /forecast (trend prediction)
    │   ├── watch.js          # /watch (price alerts)
    │   ├── portfolio.js      # /portfolio (holdings + ROI)
    │   ├── health.js         # /health (market index)
    │   ├── subscribe.js      # /subscribe + /unsubscribe
    │   ├── sync.js           # /sync
    │   ├── help.js           # /help
    │   └── about.js          # /about
    ├── services/
    │   ├── ai.js             # Gemini AI integration + fallback
    │   ├── analyzer.js       # Local trade valuation formulas
    │   ├── matcher.js        # Fuzzy item name matching
    │   ├── autocomplete.js   # Discord autocomplete suggestions
    │   ├── notifier.js       # Multi-channel embed notifications
    │   ├── scraper.js        # game.guide scraper + diff detection
    │   ├── chart.js          # QuickChart.io URL generation
    │   ├── forecast.js       # Linear regression price prediction
    │   └── market-health.js  # Market sentiment calculation
    ├── data/
    │   ├── history.js        # Historical data storage + analytics
    │   ├── watchlist.js      # Price alert management
    │   ├── portfolio.js      # User portfolio storage
    │   └── subscriptions.js  # Notification subscription manager
    └── utils/
        ├── constants.js      # Multipliers, aliases, roman numerals
        ├── format.js         # Value formatting (S$ 4.5M, etc.)
        └── discord.js        # Embeds, pagination, message splitting
```

---

## Key Technical Details

### AI vs Local Mode
| Mode | When | How |
|------|------|-----|
| AI (Gemini) | API quota available | Sends all item data to Gemini for analysis |
| Local | Quota exceeded (auto-fallback) | Formula: `value × demand × trend` |

Auto-switches on 429 errors. 5-minute cooldown before retrying AI.

### Data Sync
- Cron: every hour (`0 * * * *`)
- Scrapes 1050+ items from game.guide
- Detects changes by comparing with previous data
- Records diffs to history (kept 90 days, auto-pruned)
- Posts notifications to all subscribed channels

### Fuzzy Matching Priority
1. Aliases (`c3` → Curse III)
2. Number → Roman numeral (`curse 3` → `curse iii`)
3. Exact match
4. Clean match (strip apostrophes)
5. All-words-in-name match
6. Initials abbreviation
7. Substring match
8. Sequential word-start prefix
9. Unordered word-start prefix (short abbreviations)
10. Single word prefix
11. Condensed multi-word split
12. Levenshtein typo tolerance (30% threshold)

### Notifications
- Posts to `NOTIFICATION_CHANNEL_ID` (env) + all `/subscribe` channels
- Separates changes into 📈 UP / 📉 DOWN / 🔄 OTHER
- Splits long messages for Discord's 2000 char limit
- 5-minute cooldown prevents duplicate posts

### Charts
- Generated via QuickChart.io (free, no dependencies)
- Embedded as image URL in Discord embed
- Dark theme matching Discord's background

---

## 👤 Creator

| | |
|--|--|
| **Discord** | adefulkih (`456285930420961281`) |
| **GitHub** | [adefulki](https://github.com/adefulki) |
| **Roblox** | RiseFromHell (`adefulkih`) |
