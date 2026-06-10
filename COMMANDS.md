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
Look up a single item's full stats and adjusted value.

**Usage:**
```
/value item: [item name]
```

**Examples:**
```
/value item: Evangeline
/value item: c3
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
Show a quick guide inside Discord (only visible to you).

**Usage:**
```
/help
```

---

## Quantity Format

Quantity goes **before** the item name only. Two formats:

| Format | Example | Result |
|--------|---------|--------|
| Number + space | `3 Nocturne` | 3× Nocturne |
| Number + x + space | `3x Nocturne` | 3× Nocturne |

**More examples:**
```
3 c3        → 3× Curse III
4 c4        → 4× Curse IV
2 evan      → 2× Evangeline
3x stb      → 3× Slime Trade Booth
4 curse 4   → 4× Curse IV
```

Separate multiple items with commas:
```
3 c3, 2 Nocturne, Scarwing
```

No number = 1× by default.

---

## Flexible Item Names

You don't need to type exact names. The bot understands shortcuts, abbreviations, partial words, and even typos.

### Quick Aliases

| Type this | Gets this |
|-----------|-----------|
| `c3` | Curse III |
| `c4` | Curse IV |
| `c 3` | Curse III |
| `c 4` | Curse IV |
| `stb` | Slime Trade Booth |
| `rb` | Seraphic Rainbow |
| `curse 3` | Curse III |
| `curse 4` | Curse IV |

### Shortened Names

| Type this | Gets this |
|-----------|-----------|
| `evan` | Evangeline |
| `noc` | Nocturne |
| `reaper` | The Reaper |
| `cuddly` | Cuddly Claw |
| `fuchsia` | Fuchsia Fidelity |
| `malev` | Malevolence |
| `cathedral` | Cathedral Booth |
| `panth` | Pantheress |

### Partial Words

| Type this | Gets this |
|-----------|-----------|
| `slime booth` | Slime Trade Booth |
| `heavy glory` | Heavyblade of Glory |
| `eye seraph` | Eye of Seraph |
| `purr rebel` | Purr of Rebellion |
| `black com` | Black Comet |
| `cy demo` | Cyanic Demonride |
| `rb sera` | Seraphic Rainbow |
| `blk comet` | Black Comet |

### Condensed Names

Combine first letters of each word into one word:

| Type this | Gets this | How it works |
|-----------|-----------|-------------|
| `crev` | Cthulu's Revenge | **C** + **Rev**enge |
| `treaper` | The Reaper | **T** + **Reaper** |
| `pheaven` | Puff of Heaven | **P** + **Heaven** |
| `cdemon` | Cyanic Demonride | **C** + **Demon**ride |

### Without Apostrophes

| Type this | Gets this |
|-----------|-----------|
| `dutchmans` | Dutchman's Penance |
| `ravens hush` | Raven's Hush |
| `sanzus embrace` | Sanzu's Embrace |
| `cthulu revenge` | Cthulu's Revenge |

### Typos (Auto-Corrected)

| Type this | Gets this |
|-----------|-----------|
| `pearsickle` | Pearsicle |
| `scarwng` | Scarwing |
| `evangline` | Evangeline |
| `nocturn` | Nocturne |

---

## Understanding the Output

### Trade Output Example

```
⚖️ FISCH TRADE ASSISTANT

📦 YOUR OFFER
• Eye of Seraph — S$ 400.0K (TrueVal | Demand: Medium | ➡️ Stable)
Total Adjusted Value: S$ 400.0K

🎁 THEIR OFFER
• Nessie Booth — S$ 400.0K → Adj: S$ 360.0K (TrueVal | Demand: Low | ➡️ Stable)
Total Adjusted Value: S$ 360.0K

━━━━━━━━━━━━━━━━━━━━━━━━
📊 VERDICT: 🟡 FAIR 🟡

📝 RECOMMENDATION:
Trade is roughly even. Accept if you prefer their items or demand/trend favors them.
💡 To make it a WIN: Ask them to add Porcelain Chord (S$ 84.7K).
```

**Reading the values:**
- `S$ 400.0K` = raw value from TrueVal/Trade Hub
- `→ Adj: S$ 360.0K` = adjusted for demand/trend (only shown when different)
- Items with Medium demand + Stable trend show only the raw value

### Verdict Scale

| Verdict | Meaning | What to do |
|---------|---------|------------|
| 🟢🟢 **BIG WIN** | You're getting way more value | Accept immediately |
| 🟢 **WIN** | Trade favors you | Accept it |
| 🟡 **FAIR** | Roughly equal (±15%) | Accept if you want their items |
| 🔴 **LOSS** | You're giving more value | Ask them to add |
| 🔴🔴 **BIG LOSS** | Massive value gap | Decline |

### Item Suggestions

If a trade is unfair, the bot suggests specific items to add:
```
💡 Ask them to add: The Reaper (S$ 1.76M), Curse III (S$ 484.0K) (≈ S$ 2.20M needed).
```

If a trade is fair but you want a win:
```
💡 To make it a WIN: Ask them to add Porcelain Chord (S$ 84.7K).
```

---

## How Values Are Calculated

Each item has an **Adjusted Value** based on:

```
Adjusted Value = Raw Value × Demand × Trend
```

**Demand effect:**
| Demand | Effect |
|--------|--------|
| Limited | +25% |
| High | +10% |
| Medium | No change |
| Low | -10% |
| Very Low | -20% |

**Trend effect:**
| Trend | Effect |
|-------|--------|
| 📈 Rising | +10% |
| ➡️ Stable | No change |
| 📉 Dropping | -12% |
| ⚡ Unstable | -5% |

---

## Tips

- Values update automatically every hour from game.guide
- Items with 📈 Rising trend are worth more — hold them
- Items with 📉 Dropping trend are worth less — trade them away soon
- High demand items sell fast and trade above price
- Low demand items are hard to sell and trade below price
- The bot suggests real items you can ask for to balance unfair trades
- If you see `⚡ Analyzed locally` — AI is on cooldown, values are still accurate
