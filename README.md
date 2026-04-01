# YGO Research Tracker

Personal tool for tracking Yu-Gi-Oh! card purchases across CardMarket sellers. Build a watchlist, compare prices side-by-side, plan your orders with shipping cost estimates, and track delivery status — all in one dark-themed interface.

---

## Features

### Watchlist
- Search from a local database of ~14 000 cards (synced from YGOProDeck API)
- Per-row selection of edition and rarity from the card's actual print history
- Card artwork displayed inline (images downloaded and cached locally on first load)
- Inline editing of deck name, quantity, and notes
- Status tracking per card: **À commander → Commandé → Reçu**
- Bulk actions: change status or delete multiple rows at once

### Price comparison
- Enter prices manually per seller — as many sellers as you want
- Best price per row highlighted automatically (requires ≥ 2 non-null prices)
- **Best deal** column: cheapest seller + savings vs. most expensive
- Price history: ↑/↓ indicator when a price changes, with tooltip showing the previous value and how long ago it was set
- Seller column headers link directly to the seller's CardMarket offers page

### Filters & views
- Filter by deck, card name, or status
- Sort by card name, quantity, or any seller's price
- Group rows by deck with per-group subtotals and coverage stats

### Purchase plan
- Dedicated view showing only **À commander** entries, grouped by cheapest seller
- Shipping cost calculated automatically using the CardMarket France standard rate schedule (Lettre Verte Suivi / R2 / R3 / Colissimo), based on cart weight and order value
- **Simple mode**: best price per card, one seller per card
- **Optimised mode**: heuristic that attempts to consolidate small baskets when the shipping savings justify it — shows gain and which cards were moved
- Manual shipping override for edge cases (selector guides you to a compatible rate line)
- Mark an entire vendor's basket as ordered in one click
- Export plan as CSV (detail per card + vendor recap + global summary)

### Dashboard
- Global progress bars by status (Reçu / Commandé / À commander / Sans statut)
- Per-deck breakdown: cost estimate, price coverage, dominant vendor
- Top 5 most expensive cards
- Vendor summary table: best deal count, coverage, total catalogue cost

### Import / Export
- Import a `.ydk` deck file — cards matched against local DB, unrecognised IDs flagged
- Export watchlist as CSV (UTF-8 BOM for Excel compatibility)
- Export purchase plan as structured CSV with shipping breakdown

### Sync
- YGOProDeck card database synced automatically every night at 03:00 via `node-cron`
- Manual sync available via the API at any time

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router) |
| UI | React 19.2.4 + TypeScript 5.x |
| Styling | Tailwind CSS v4 (CSS-native, no config file) |
| Components | shadcn/ui 4.1.1 (based on `@base-ui/react`) |
| Database | Prisma 6.19.2 + SQLite |
| Validation | zod 3.x |
| Scheduling | node-cron 3.x |

---

## Data model

```
Card           id (YGOProDeck), name, type, imageUrl, hasLocalImage
CardSet        cardId × setCode × setRarity (unique) — source: YGOProDeck card_sets[]
Seller         name (unique), shippingProfile
WatchlistEntry deck, cardId, quantity, setName?, rarity?, status, notes
Price          watchlistEntryId × sellerId (unique), price?, previousPrice?, previousUpdatedAt?
```

Price history uses a "one step back" pattern: when a price is updated, the current value shifts to `previousPrice` before being overwritten — no history table needed.

---

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Initialise the database

```bash
# Apply schema and generate Prisma client
npm run db:migrate

# Seed ~14 000 cards from YGOProDeck API (~2–3 min)
npm run seed
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Commands

```bash
npm run dev          # Development server (port 3000, Turbopack)
npm run build        # Production build
npm run seed         # Seed card database from YGOProDeck API
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Run pending migrations
npm run db:reset     # Drop database, re-migrate, re-seed
```

---

## Project structure

```
app/
  page.tsx                  # Server component — loads Prisma data, passes to TrackerClient
  layout.tsx                # Forced dark mode, Cinzel + Geist fonts
  globals.css               # Tailwind v4 tokens (@theme inline), custom CSS components
  api/
    cards/search/           # GET ?q=  — autocomplete
    cards/[id]/sets/        # GET      — editions for a card
    cards/[id]/rarities/    # GET ?setName= — rarities for a card+edition
    cards/[id]/image/       # POST     — download and cache card image
    cards/batch/            # POST     — validate a list of YGOProDeck IDs
    sellers/                # GET/POST/DELETE
    sellers/[id]/           # PATCH    — update seller (shippingProfile)
    watchlist/              # GET/POST/PATCH/DELETE
    prices/                 # PUT      — upsert price with history shift
    sync/                   # GET/POST — DB status / manual sync

components/tracker/
  TrackerClient.tsx         # Main client component — all UI state
  CardAutocomplete.tsx      # Debounced card search (280 ms)
  SellerDialog.tsx          # Add/remove sellers
  ImportDialog.tsx          # .ydk file import with preview
  PurchasePlan.tsx          # Purchase plan with shipping engine
  Dashboard.tsx             # Stats dashboard
  types.ts                  # Shared TypeScript types

lib/
  prisma.ts                 # PrismaClient singleton (absolute datasourceUrl)
  sync.ts                   # YGOProDeck sync logic (shared between API and cron)
  cron.ts                   # node-cron scheduler (daily at 03:00, hot-reload safe)

prisma/
  schema.prisma
  seed.ts
```

---

## Design

- Permanent dark theme — no light mode
- Colour palette: background `#0d0e12`, gold accent `#c9a227`, night hover `#1c2035`
- Typefaces: Cinzel (headings), Geist Sans (body), Geist Mono (prices/numbers)
- No chart libraries — progress bars are pure CSS Tailwind
- No client-side routing — single-page with view toggle (`table | plan | dashboard`)
