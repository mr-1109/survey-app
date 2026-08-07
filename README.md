# SIR RJ188 — कॉल सूची

Mobile-first Hindi voter call list over the single MySQL table `SIR_RJ188_F`.
The full specification is [SIR_CALL_LIST_CLAUDE.md](SIR_CALL_LIST_CLAUDE.md).

## Setup

1. Put the database password in `.env.local` (already created from
   `.env.local.example`, with `MYSQL_PASSWORD` left blank):

   ```
   MYSQL_PASSWORD=<the password>
   ```

   `.env.local` is gitignored. Never commit it.

2. Verify the connection returns Devanagari rather than `??????`:

   ```bash
   npm run db:check
   ```

3. Add the three indexes from §3.5 — **this writes DDL to the live table**, run
   it once:

   ```bash
   npm run db:indexes
   ```

   It skips indexes that already exist and prints the `EXPLAIN` for
   `WHERE BHAG = 7`, which should show `idx_bhag`.

4. Start the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — it redirects to `/call-list`.

## Two databases

| | Where | Used for |
|---|---|---|
| **rj188db** (remote MariaDB) | `216.69.171.204` | `SIR_RJ188_F` voter data only. Read, plus the one `FEEDBACK_STATUS` write. **No table is ever created there.** |
| **app.db** (local SQLite) | `data/app.db`, gitignored | Everything the app owns: users and follow-ups. |

The local store is created and migrated automatically on first request — no
setup step. To reset it, stop the server and delete `data/`.

Follow-ups reference a voter by `VLISTID` (the remote primary key) and cache the
name and booth, so a follow-up list renders with no MySQL round trip.

## Screens

| Route | What |
|---|---|
| `/` | redirects to `/dashboard` |
| `/dashboard` | landing page — voter/booth/worker totals, feedback progress, zone and gender breakdown, quick links |
| `/call-list` | booth-wise voter list with feedback radios |
| `/worker/search` | find a voter by name (booth-scoped) or by exact EPIC (whole AC), then schedule a follow-up |
| `/worker/followups/today` | follow-ups due today |
| `/worker/followups/overdue` | follow-ups past due, with days-late |
| `/users` | add karyakartas / booth incharges / admins, deactivate them |

## Layout

```
src/
  app/            routes + API handlers (no SQL here)
  features/       call-list UI, hooks, client fetch wrappers
  server/         'server-only' — mysql2 pool and every SQL string
  shared/         MobileShell, theme
```

Aliases: `@features/*`, `@shared/*`, `@server/*`. Client code never imports
`@server/*`; it reads through `/api/*` only (enforced by an ESLint rule).

## API

| Method | Route | Notes |
|---|---|---|
| GET | `/api/voters?bhag=7&kshetra=&feedback=all&q=&limit=25` | always `LIMIT`ed; `q` needs ≥2 chars **and** a `bhag` |
| GET | `/api/voters/facets` | `{ bhagList, kshetraList, bhagKshetra }` — cached 10 min |
| GET | `/api/voters?epic=RJ/14/109/243369` | exact EPIC match, no `bhag` needed (returns ~1 row) |
| GET | `/api/dashboard` | overview totals, cached 60 s; local counts always live |
| GET/POST | `/api/users` | local SQLite |
| PATCH | `/api/users/:id` | `{ active }` — deactivate, never hard-delete |
| GET/POST | `/api/followups` | `?scope=today\|overdue\|upcoming\|done\|all` |
| PATCH/DELETE | `/api/followups/:id` | mark done / remove |
| PATCH | `/api/voters/:vlistid` | `{ "feedback": "bjp" \| "congress" \| "other" \| "not_found" }` |

The PATCH updates `FEEDBACK_STATUS` on live production data — there is no
staging copy.

## Filters

Both dropdowns are built from the table, not from a hardcoded list:

- **भाग** — the 266 booths in `BHAG` (1–266, no gaps, no NULLs).
- **क्षेत्र** — the 3 `GENERALNOTES` zones: सांगोद (167 booths), सुल्तानपुर (77),
  न.पा. सांगोद (22).

Every booth belongs to exactly one zone, so choosing a क्षेत्र narrows the भाग
list to that zone's booths and moves the selection to the first of them —
otherwise most भाग × क्षेत्र pairs would return zero rows.

The feedback tabs बीजेपी / कांग्रेस / अन्य match nothing yet because no one has
recorded a preference; they fill in as karyakartas work. `पता नहीं` covers the
201,001 NULL rows plus the one stored `not_found`.

## Sidebar

The ☰ button in the app bar opens a drawer with:

- **कॉल सूची** — back to the list.
- **फीडबैक सारांश** — live tally of बीजेपी / कांग्रेस / अन्य / पता नहीं for the
  booth currently on screen (whole AC when भाग is सभी). One `GROUP BY` on
  `idx_feedback`, ~270 ms.
- **सेटिंग्स** — two settings, both of which change real behaviour:
  *एक बार में कितने मतदाता* (25 / 50 / 100, the `और देखें` page size) and
  *शुरुआती भाग* (the booth the app opens on). Stored in `localStorage`, since
  there is no user table to hang them off.
- **लॉगआउट** — pinned to the bottom.

**There is no session to log out of.** v1 has no login (§7), so this clears the
device's saved settings and filters and returns to a fresh list; the confirm
dialog says exactly that. Recorded feedback is untouched — it lives in MySQL.
When a real login is added, this button is where it hooks in.

## Card actions

`वोटर पर्ची भेजें` and the WhatsApp button build a Devanagari voter slip (name,
relation, age, EPIC, house, booth, locality) and open the OS share sheet or
WhatsApp. Both work without a stored number — WhatsApp's own contact picker
chooses the recipient.

**The call button is disabled on every row.** `PHONE1` and `PHONE2` are NULL for
all 201,002 voters, so there is nothing to dial. It reads `PHONE1 || PHONE2` and
turns into a live `tel:` link automatically if numbers are ever loaded — no code
change needed.

## Deployment

There is no login (§7). Keep this on localhost or behind network/basic auth;
do not expose the unauthenticated write endpoint on a public URL.
