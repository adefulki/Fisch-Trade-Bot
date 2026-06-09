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
/trade your_offer: 2 Nocturne, Curse IV their_offer: 3x Evangeline
/trade your_offer: slime booth, eye seraph their_offer: crev x2
```

---

### /value
Look up a single item's full stats and adjusted value.

**Usage:**
```
/value item: [item name]
```

**Examples:**
```
/value item: Evangeline
/value item: slime booth
/value item: crev
```

---

### /sync
Force refresh item values from game.guide (values also auto-update every hour).

**Usage:**
```
/sync
```

---

### /help
Show a quick guide inside Discord.

**Usage:**
```
/help
```

---

## Quantity Formats

You can specify multiples of the same item:

| Format | Example | Result |
|--------|---------|--------|
| Number before name | `2 Nocturne` | 2× Nocturne |
| Nx before name | `3x Scarwing` | 3× Scarwing |
| xN after name | `Evangeline x2` | 2× Evangeline |
| No number | `Curse IV` | 1× Curse IV |

Separate multiple items with commas:
```
2 Nocturne, 3x Scarwing, Curse IV
```

---

## Flexible Item Names

You don't need to type exact names. The bot understands:

**Shortened names:**
- `evan` → Evangeline
- `noc` → Nocturne
- `reaper` → The Reaper
- `cuddly` → Cuddly Claw
- `fuchsia` → Fuchsia Fidelity
- `malev` → Malevolence
- `cathedral` → Cathedral Booth

**Partial words:**
- `slime booth` → Slime Trade Booth
- `heavy glory` → Heavyblade of Glory
- `eye seraph` → Eye of Seraph
- `purr rebel` → Purr of Rebellion
- `black com` → Black Comet

**Abbreviations:**
- `rb sera` → Seraphic Rainbow
- `blk comet` → Black Comet
- `cy demo` → Cyanic Demonride

**Condensed names:**
- `crev` → Cthulu's Revenge
- `treaper` → The Reaper
- `pheaven` → Puff of Heaven
- `cdemon` → Cyanic Demonride

**Without apostrophes:**
- `dutchmans` → Dutchman's Penance
- `ravens hush` → Raven's Hush
- `sanzus embrace` → Sanzu's Embrace
- `cthulu revenge` → Cthulu's Revenge

**Typos (auto-corrected):**
- `pearsickle` → Pearsicle
- `scarwng` → Scarwing
- `evangline` → Evangeline
- `nocturn` → Nocturne

**Numbers as text:**
- `curse 4` → Curse IV

---

## Understanding the Output

### Verdict Scale

| Verdict | Meaning | What to do |
|---------|---------|------------|
| 🟢🟢 **BIG WIN** | You're getting way more value | Accept immediately |
| 🟢 **WIN** | Trade favors you | Accept it |
| 🟡 **FAIR** | Roughly equal | Accept if you want their items |
| 🔴 **LOSS** | You're giving more value | Ask them to add |
| 🔴🔴 **BIG LOSS** | Massive value gap | Decline |

### Adjusted Value

The bot adjusts raw values based on how easy an item is to trade:

**Demand effect:**
- Limited → +25% (super rare, hard to find)
- High → +10% (everyone wants it)
- Medium → no change
- Low → -10% (harder to sell)
- Very Low → -20% (very hard to sell)

**Trend effect:**
- 📈 Rising → +10% (gaining value)
- ➡️ Stable → no change
- 📉 Dropping → -12% (losing value)
- ⚡ Unstable → -5% (volatile)

### Item Suggestions

If a trade is unfair, the bot suggests specific items the other side should add:
```
💡 Ask them to add: The Reaper (S$ 1.76M), Curse III (S$ 484.0K) (≈ S$ 2.20M needed).
```

---

## Tips

- Values update automatically every hour from game.guide
- If an item shows `→ Adj:` it means demand/trend changed the value
- Items with 📈 Rising trend are worth more than their listed price
- Items with 📉 Dropping trend are worth less — trade them away sooner
- The bot works even without internet (uses cached values)
- If you see `⚡ Analyzed locally` — AI is on cooldown, results still accurate
