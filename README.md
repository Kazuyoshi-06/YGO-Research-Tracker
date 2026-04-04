# YGO Research Tracker

Personal platform for tracking Yu-Gi-Oh! card purchases across CardMarket sellers. Manage a TCG and OCG watchlist, compare prices side-by-side, run group order waves with submission and consolidation tools, and track delivery status — all in one dark-themed interface.

---

## Features

### Multi-format hub (TCG / OCG)
- Landing page at `/` shows stats for both formats at a glance
- Navigate directly to `/tracker/tcg` or `/tracker/ocg` via animated format cards
- Format switcher in the tracker header to jump between the two at any time
- Cards tagged as TCG-only, OCG-only, or BOTH — search results filtered accordingly

### Watchlist
- Search from a local database of ~14 000 cards (synced from YGOProDeck API)
- Per-row selection of edition and rarity from the card's actual print history
- Card artwork displayed inline (images downloaded and cached locally on first load)
- Inline editing of deck name, quantity, and notes
- Status tracking per card: **À commander → Commandé → Reçu**
  - **Soumis** is an intermediate locked status set automatically during a wave — not manually cyclable
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
- **Optimised mode**: heuristic that consolidates small baskets when shipping savings justify it
- Manual shipping override with a guided selector for edge cases
- Mark an entire vendor's basket as ordered in one click
- Export plan as CSV (detail per card + vendor recap + global summary)

### Dashboard
- Global progress bars by status (Reçu / Commandé / À commander / Sans statut)
- Per-deck breakdown: cost estimate, price coverage, dominant vendor
- Top 5 most expensive cards
- Vendor summary table: best deal count, coverage, total catalogue cost

### Group ordering — Waves
- Admin creates a **wave** with a name, deadline, and designated sellers
- Active wave shown as a banner at the top of the tracker and the hub
- Users submit their **À commander** list — prices are snapshotted at submission time
- Admin views a full **consolidation** panel: by submission, by card, by seller — exportable as CSV
- Wave transitions: `open → frozen → ordered → delivered`
  - **Frozen**: submissions closed, admin reviews and consolidates
  - **Ordered**: all submitted entries automatically move to **Commandé**
  - **Delivered**: all ordered entries automatically move to **Reçu**
- Users can withdraw and re-submit while the wave is still open
- Wave banner is dismissable per-wave (persisted in localStorage)

### Notifications
- In-app notification bell with unread badge (polling every 30 s)
- One notification per wave event: opened, frozen, ordered, delivered, 48h reminder
- Admin receives a notification when a user submits
- Auto-marked as read after 1 s when the panel is opened

### Email notifications (Resend)
- Wave opened → all active users
- Wave ordered / delivered → submitters only
- Admin notified when a user submits
- 48h deadline reminder → users who haven't submitted yet (sent once, no duplicates)
- Dark-themed HTML templates; silently disabled if `RESEND_API_KEY` is not set

### Import / Export
- Import a `.ydk` deck file — cards matched against local DB, unrecognised IDs flagged
- Export watchlist as CSV (UTF-8 BOM for Excel compatibility)
- Export purchase plan as structured CSV with shipping breakdown
- Export wave consolidation as CSV

### Sync
- YGOProDeck card database synced automatically every night at 03:00 via `node-cron`
- Manual sync available via the API at any time

### Admin panel
- User management: list, ban/unban, view individual watchlist (read-only)
- Wave management: create, transition, view submissions and consolidation, manage sellers
- Wave history: aggregated stats for all delivered waves (by wave, by user, by seller)

### Authentication
- Auth.js v5 — email/password, session-based
- Roles: `USER` (default) and `ADMIN`
- `/login`, `/register`, `/forgot-password`, `/account` pages

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router) |
| UI | React 19.2.4 + TypeScript 5.x |
| Styling | Tailwind CSS v4 (CSS-native, no config file) |
| Components | shadcn/ui 4.1.1 (based on `@base-ui/react`) |
| Database | Prisma 6.19.2 + SQLite |
| Auth | Auth.js v5 |
| Email | Resend |
| Validation | zod 3.x |
| Scheduling | node-cron 3.x |

---

## Data model

```
Card              id (YGOProDeck), name, type, imageUrl, cardFormat (TCG|OCG|BOTH)
CardSet           cardId × setCode × setRarity (unique)
Seller            name (unique), shippingProfile, platform (cardmarket|taobao|autre)
WatchlistEntry    deck, cardId, quantity, setName?, rarity?, status, notes, format (TCG|OCG)
Price             watchlistEntryId × sellerId (unique), price?, previousPrice?, previousUpdatedAt?

User              id, email, name, role (USER|ADMIN), banned
Wave              id, name, status (open|frozen|ordered|delivered), deadline, createdById
WaveSeller        waveId × sellerId
OrderSubmission   userId × waveId (unique), status (submitted|confirmed)
OrderSubmissionItem  submissionId, cardId, cardName, setName, rarity, quantity,
                     snapshotPrice (locked at submission), preferredSellerId
Notification      userId, type, title, body, payload, waveId, readAt
```

---

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Environment

Copy `.env.example` to `.env` and fill in the required values:

```bash
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Optional — emails are silently skipped if absent
RESEND_API_KEY=
EMAIL_FROM="YGO Tracker <noreply@example.com>"
EMAIL_BASE_URL=http://localhost:3000
```

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

Open [http://localhost:3000](http://localhost:3000) — you will land on the format hub.

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
  page.tsx                      # Hub — loads TCG+OCG stats, passes to HubClient
  layout.tsx                    # Forced dark mode, Cinzel + Geist fonts
  globals.css                   # Tailwind v4 tokens (@theme inline), custom CSS
  tracker/
    [format]/page.tsx           # Format tracker (TCG or OCG)
  admin/
    layout.tsx                  # Admin nav
    users/page.tsx              # User list + ban/unban
    users/[id]/watchlist/       # Read-only user watchlist
    waves/page.tsx              # Wave management
    waves/[id]/page.tsx         # Wave detail (submissions, consolidation, sellers)
    waves/stats/page.tsx        # Delivered waves history
  api/
    cards/…                     # Search, sets, rarities, image cache, batch
    sellers/…                   # CRUD sellers
    watchlist/…                 # CRUD watchlist entries
    prices/                     # Upsert prices with history shift
    sync/                       # DB status + manual YGOProDeck sync
    waves/…                     # Wave CRUD + submission + consolidation
    notifications/…             # In-app notifications
    admin/…                     # Admin-only endpoints

components/
  hub/
    HubClient.tsx               # Hub page client component
    HubHeader.tsx               # Hub header with admin nav + UserMenu
    FormatCard.tsx              # TCG/OCG card with 3D tilt, stats, logos
    HubWaveBanner.tsx           # Active wave banner on hub (dismissable)
  tracker/
    TrackerClient.tsx           # Main tracker — all UI state, TCG/OCG switcher
    CardAutocomplete.tsx        # Debounced card search (280 ms)
    SellerDialog.tsx            # Add/remove sellers
    ImportDialog.tsx            # .ydk file import
    PurchasePlan.tsx            # Purchase plan with shipping engine
    Dashboard.tsx               # Stats dashboard
    NotificationBell.tsx        # Bell icon, red badge, popover (30 s poll)
    WaveBanner.tsx              # Active wave banner in tracker (submit/withdraw)
    types.ts                    # Shared TypeScript types

lib/
  prisma.ts                     # PrismaClient singleton
  sync.ts                       # YGOProDeck sync logic
  cron.ts                       # node-cron: daily sync + hourly reminder check
  notifications.ts              # In-app notification helpers
  email.ts                      # Resend email templates + send functions
  reminders.ts                  # 48h deadline reminder logic
  auth.ts                       # Auth.js config

prisma/
  schema.prisma
  seed.ts

public/
  logos/ygo-tcg.png             # TCG logo (place manually)
  logos/ocg.png                 # OCG logo (place manually)
  cards/{id}.jpg                # Cached card images
```

---

## Design

- Permanent dark theme — no light mode
- Colour palette: background `#0d0e12`, gold accent `#c9a227`, surface `#13151c`, night hover `#1c2035`
- Typefaces: Cinzel (headings), Geist Sans (body), Geist Mono (prices/numbers)
- No chart libraries — progress bars and stats are pure CSS / Tailwind
