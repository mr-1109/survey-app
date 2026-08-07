# CLAUDE.md — SIR RJ188 Call List app

Build a mobile-first Hindi voter **call list** web app on top of a single
MySQL table. This file is the complete specification. Read it fully before
writing code.

Everything in the "Data reality" section was verified against the live table
on 2026-08-01 — trust it over assumptions, and re-verify with the queries in
that section before designing around any column.

---

## 1. Goal

One screen matters: **`/call-list`**. A karyakarta (field worker) opens it on a
phone, filters to a booth (भाग), scrolls voter cards, and records a party
preference per voter. Everything else exists to serve that screen.

Non-goals for v1: admin dashboards, imports/exports, PDF generation,
multi-constituency support, user management, WhatsApp slip generation.

---

## 2. Stack

- **Next.js 14.2.x, App Router, JavaScript (not TypeScript)** — `.js` / `.jsx`
- **React 18**
- **MUI v5** (`@mui/material`, `@mui/icons-material`, `@emotion/*`)
- **mysql2** (`mysql2/promise`) talking straight to MySQL — no ORM, no
  intermediate REST service
- Node 20

```bash
npx create-next-app@14.2.5 . --js --app --no-tailwind --no-src-dir --eslint
npm i @mui/material @mui/icons-material @emotion/react @emotion/styled mysql2 server-only
```

---

## 3. Data reality — read this before designing anything

**Connection:** host `216.69.171.204`, database `rj188db`, user `hlnagar`.
Credentials go in `.env.local` (see §9) — never hardcode them in source, and
never commit them.

**Only table in scope: `SIR_RJ188_F`.** Do not create, join to, or invent other
tables. It is MariaDB 10.11, collation `utf8mb4_unicode_ci`.

### 3.1 Schema

| Column | Type | Populated? |
|---|---|---|
| `VLISTID` | int PK auto_increment | 201,002 — **the only unique row id** |
| `VOTERID` | int | 201,002 — **per-booth serial, NOT unique** (see §3.3) |
| `BHAG` | int | 201,002 — booth number, range **1–266** |
| `VNAME` | varchar(255) | 200,994 — voter name (Hindi) |
| `FNAME` | varchar(255) | 200,994 — father/husband name (Hindi) |
| `RELATION` | varchar(10) | 201,002 — `F` 118135, `H` 81954, `M` 659, `O` 254 |
| `HNO` | varchar(255) | 200,912 — house number |
| `AREACOLONY` | varchar(255) | 200,969 — locality (Hindi), 1,211 distinct |
| `ADDRESS` | varchar(255) | 200,912 — mirrors `HNO`, low value |
| `SECTION_NO` | int | 200,863 |
| `CITY` | varchar(255) | 201,002 — 215 distinct (Hindi) |
| `TEHSIL` | varchar(255) | 201,002 — 74 distinct (Hindi) |
| `GENERALNOTES` | varchar(255) | 201,002 — **3 distinct**, actually a zone label |
| `SEX` | varchar(10) | 201,002 — `M` 104832, `F` 95912, `O` 231, `D` 27 |
| `AGE` | int | 200,952 — range 1–122 |
| `AREA_ID` | varchar(100) | 201,002 — format `188_<BHAG>_3_<VOTERID>` |
| `IDCARD_NO` | varchar(50) | 201,002 — EPIC number |
| `RESITYPE` | varchar(5) NOT NULL | 201,002 — **constant `AC188`**, do not overwrite |
| `CASTIDA` | varchar(255) | 201,002 — **constant `O`**, carries no information |
| `PROFIDA` | varchar(5) | 201,002 — **constant `O`**, carries no information |
| `FEEDBACK_STATUS` | varchar(25) | **1 row** — the app's write target (see §6.3) |
| `PHONE1`, `PHONE2` | varchar(50) | **0 — entirely NULL** |
| `MAINCAST`, `SUBCAST` | varchar | **0 — entirely NULL** |
| `WARD`, `DISTT`, `PROFESSION` | | **0 — entirely NULL** |
| `STATUSTYPE`, `DOB`, `WEDDATE`, `OLDBHAG`, `EDITED`, `ENTRYDATE` | | **0 — entirely NULL** |

### 3.2 Consequences you must design around

These are not edge cases — they change the screen:

1. **There are no phone numbers. At all.** `PHONE1` and `PHONE2` are NULL for
   every one of the 201,002 rows. Any "call" button, "WhatsApp" button, or
   "only voters with mobile" (मोबाइल वाले) filter would be dead on arrival.
   **Build the card without call/WhatsApp actions.** If a reference screenshot
   shows them, they belong to a different dataset. Do not add a mobile-only
   checkbox; it would return zero rows.
2. **There is no caste data.** `MAINCAST` is NULL and `CASTIDA` is the constant
   `'O'`. **Do not build a जाति (caste) filter** — it would have exactly one
   meaningless option. Use the geography facets in §5.2 instead.
3. **`RESITYPE` is not a status field here.** It holds the constant `'AC188'`
   (the constituency marker). Never write feedback into it.
4. **This is a single constituency** (AC 188). No AC picker, no AC-based access
   control, no `A_FIELD`-style claim parsing.
5. **utf8mb4 is mandatory on the connection.** All names are Devanagari. A
   client that connects without `charset: 'utf8mb4'` returns `??????` for every
   name. This is the single most likely way to ship a broken-looking app.

### 3.3 `VOTERID` is a per-booth serial

`VOTERID` runs 1…~1195 **within each `BHAG` and restarts** for the next booth.
201,002 rows, only 1,195 distinct `VOTERID` values, but `(BHAG, VOTERID)` is
unique across all 201,002 rows.

- Use **`VLISTID`** as the React key and for every write.
- `(BHAG, VOTERID)` is the natural business key.
- Displaying `वोटर क्रं : 1` on several cards at once is **correct** — it is the
  serial within that booth, not a duplicate-data bug.

### 3.4 Verify before you build

```sql
SELECT COUNT(*), COUNT(PHONE1), COUNT(MAINCAST), COUNT(DISTINCT BHAG) FROM SIR_RJ188_F;
SELECT VLISTID, VNAME, FNAME, AREACOLONY FROM SIR_RJ188_F LIMIT 3;  -- must render Devanagari
```

### 3.5 Indexes — add these first

The table ships with **only** `PRIMARY KEY (VLISTID)`. Every booth filter is a
201k-row full scan (~1–3 s). The connecting user has `ALL PRIVILEGES` on
`rj188db`, so run this once before building the UI:

```sql
CREATE INDEX idx_bhag        ON SIR_RJ188_F (BHAG);
CREATE INDEX idx_bhag_voter  ON SIR_RJ188_F (BHAG, VOTERID);
CREATE INDEX idx_feedback    ON SIR_RJ188_F (FEEDBACK_STATUS);
```

Confirm with `EXPLAIN SELECT ... WHERE BHAG = 7` that `idx_bhag` is used.

---

## 4. Architecture

Keep server-only code physically separated from client code. This is the one
structural rule; enforce it.

```
src/
  app/
    layout.js
    page.js                     redirect -> /call-list
    call-list/page.js           renders <MobileShell><CallList/></MobileShell>
    api/voters/route.js         GET  list (query params)
    api/voters/[vlistid]/route.js  PATCH feedback
    api/voters/facets/route.js  GET  filter options
  features/
    call-list/
      components/CallList.jsx
      components/VoterCard.jsx
      components/FilterBar.jsx
      hooks/useVoters.js
      api/voters.js             client fetch wrappers
      index.js                  barrel
  server/
    db/pool.js                  import 'server-only' — mysql2 pool
    db/voters.js                import 'server-only' — all SQL lives here
  shared/
    layouts/MobileShell.jsx
    theme/colors.js
```

`jsconfig.json` aliases: `@features/*`, `@shared/*`, `@server/*` → `src/*`.

**Import boundaries (hard rules):**

- Every file in `src/server/**` starts with `import 'server-only';`.
- Nothing under `features/` or `shared/` may import from `@server/*`. Client
  code reaches data only through `/api/*` routes.
- **All SQL string-building lives in `src/server/db/voters.js`.** No SQL in
  route handlers, none in components.

---

## 5. The screen

Mobile-first — design at 375×812 and let it scale up. Hindi (Devanagari) UI
labels throughout. Orange primary (`#e8590c`-ish), matching a saffron political
palette.

### 5.1 Layout, top to bottom

1. **App bar** (sticky, orange, white text): back arrow, title
   `कॉल सूची : विधानसभा - सांगोद`, home icon.
2. **Filter bar** (orange): `भाग` select, `क्षेत्र` select, search icon.
3. **Tabs** (light-orange, sticky): `सभी` · `बीजेपी` · `कांग्रेस` · `अन्य` ·
   `पता नहीं` — filters by `FEEDBACK_STATUS`.
4. **Voter cards**, then a `और देखें` (show more) button.

### 5.2 Filters

Replacements for the caste/mobile filters that this data cannot support:

- **`भाग`** — booth number. Options from `SELECT DISTINCT BHAG ORDER BY BHAG`
  (266 values, plus a `सभी` option). This is the primary filter.
- **`क्षेत्र`** — from `GENERALNOTES` (3 values: सांगोद, सुल्तानपुर,
  न.पा. सांगोद). Cheap, useful, low cardinality.
- Optional later: `TEHSIL` (74) or `AREACOLONY` (1,211, only after a भाग is
  chosen — never load 1,211 options unfiltered).
- Search box: matches `VNAME` or `FNAME`. Require ≥2 characters and always
  combine with a `BHAG` filter, or it scans the whole table.

**Never render an unfiltered list of all 201,002 rows.** Default the page to
either the first booth or an empty state prompting a booth choice, and cap every
query with `LIMIT` (page size 25, "और देखें" raises it).

### 5.3 Voter card

White rounded card, subtle shadow, ~8px gap between cards.

- Top-left chip (light orange): `वोटर क्रं : {VOTERID}`
- Top-right chip (solid orange, white text): current feedback label, or
  `पता नहीं` when `FEEDBACK_STATUS` is NULL
- Rows, each with a small orange MUI icon:
  - 👤 `मतदाता का नाम - **{VNAME}**`
  - 👥 `{relationLabel} - **{FNAME}**` where `relationLabel` is
    `पति का नाम` when `RELATION` is `H`, `पिता का नाम` when `F`,
    `माता का नाम` when `M`, otherwise `अन्य का नाम`
  - 🏠 `मकान संख्या - **{HNO}** [ भाग - **{BHAG}** ]`
  - 📍 `क्षेत्र/अनुभाग - **{AREACOLONY}**`
  - ℹ️ `आयु - **{AGE}** | {SEX === 'M' ? 'पुरुष' : 'महिला'} | {IDCARD_NO}`
- Bottom row: `फीडबैक :` label (blue, bold, 12px) followed by a radio group —
  `बीजेपी` `कांग्रेस` `अन्य` `पता नहीं`. Selected label turns orange.

**No call button, no WhatsApp button, no voter-slip button** — see §3.2.1.

---

## 6. Behaviour

### 6.1 List query

```sql
SELECT VLISTID, VOTERID, BHAG, VNAME, FNAME, RELATION, HNO, AREACOLONY,
       SECTION_NO, CITY, TEHSIL, GENERALNOTES, SEX, AGE, IDCARD_NO,
       FEEDBACK_STATUS
FROM SIR_RJ188_F
WHERE 1=1
  /* AND BHAG = ? */
  /* AND GENERALNOTES = ? */
  /* AND FEEDBACK_STATUS <=> ? */
  /* AND (VNAME LIKE ? OR FNAME LIKE ?) */
ORDER BY BHAG, VOTERID
LIMIT ?
```

**Every value goes through a mysql2 placeholder (`?`).** Never interpolate user
input into SQL — not even numbers, not even after a `Number()` check. Whitelist
`ORDER BY` columns against a fixed array; they cannot be parameterised.

### 6.2 Tabs

`सभी` = no feedback predicate. The other four filter `FEEDBACK_STATUS`, where
`पता नहीं` must match **both** the literal `'not_found'` and `NULL` (use
`(FEEDBACK_STATUS = 'not_found' OR FEEDBACK_STATUS IS NULL)`), since 201,001 of
201,002 rows are currently NULL.

### 6.3 Recording feedback — the one write

`PATCH /api/voters/[vlistid]` with `{ "feedback": "bjp" }`.

```sql
UPDATE SIR_RJ188_F SET FEEDBACK_STATUS = ? WHERE VLISTID = ?
```

Allowed values, validated against a server-side whitelist — reject anything else
with 400:

| UI label | stored value |
|---|---|
| बीजेपी | `bjp` |
| कांग्रेस | `congress` |
| अन्य | `other` |
| पता नहीं | `not_found` |

`not_found` is already present in the data, so keep that exact spelling.

Update optimistically in the UI and roll back on error. Initialise the radio
group with `FEEDBACK_STATUS ?? ''` — never `undefined`, or MUI logs
"changing the uncontrolled value state of RadioGroup to be controlled".

**This UPDATE writes to live production data.** There is no staging copy. Build
and test the read path first; wire the write last, and verify on a single known
`VLISTID` before enabling it across the list.

---

## 7. Authentication

v1 has **no login**. The dataset is a single constituency and there is no user
table, so a login screen would be theatre.

Because there is no auth, treat deployment as the security boundary: do not put
this on a public URL with an unauthenticated write endpoint. Keep it on
localhost or behind network/basic auth until a real login exists.

If you later add auth, wrap the page in a gate that can be disabled by an env
flag (`NEXT_PUBLIC_PREVIEW_NO_AUTH=1`) rather than by commenting the gate out —
a flag that is absent in production cannot be accidentally shipped open.

---

## 8. Build order

Do these in sequence; each is independently verifiable.

1. Scaffold + `jsconfig.json` aliases + MUI theme with the orange palette.
2. `src/server/db/pool.js` — mysql2 pool, `charset: 'utf8mb4'`. Prove it with a
   scratch script printing 3 Devanagari names.
3. Run the §3.5 `CREATE INDEX` statements.
4. `GET /api/voters/facets` → `{ bhagList, kshetraList }`. Verify with `curl`.
5. `GET /api/voters?bhag=7` → 25 rows. Verify with `curl` before any UI.
6. `MobileShell` + app bar + filter bar + tabs (static).
7. `VoterCard` + list rendering + `और देखें`.
8. Feedback radios wired to `PATCH`, last.

---

## 9. Environment

`.env.local` (gitignored — never commit, never paste into CLAUDE.md):

```
MYSQL_HOST=216.69.171.204
MYSQL_PORT=3306
MYSQL_USER=hlnagar
MYSQL_PASSWORD=<the password>
MYSQL_DATABASE=rj188db
```

Add `.env*.local` and `.env` to `.gitignore` in the first commit, before the
file exists.

```js
// src/server/db/pool.js
import 'server-only';
import mysql from 'mysql2/promise';

let pool;
export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      charset: 'utf8mb4',          // required — Devanagari breaks without it
      waitForConnections: true,
      connectionLimit: 5,          // shared host; keep this small
      enableKeepAlive: true,
    });
  }
  return pool;
}
```

Every API route that reads cookies or query params needs
`export const dynamic = 'force-dynamic';`.

---

## 10. Definition of done

- [ ] `/call-list` renders voter cards with Devanagari names — no `?????`
- [ ] `भाग` select lists 266 booths; choosing one filters the list
- [ ] `क्षेत्र` select lists the 3 zones and filters
- [ ] Tabs filter by feedback; `पता नहीं` includes NULL rows
- [ ] Selecting a feedback radio persists — verified by `SELECT FEEDBACK_STATUS
      FROM SIR_RJ188_F WHERE VLISTID = <id>` returning the new value
- [ ] The page never issues a query without a `LIMIT`
- [ ] Browser console is free of errors and MUI controlled/uncontrolled warnings
- [ ] `EXPLAIN` on the booth query shows `idx_bhag` in use
- [ ] No `@server/*` import anywhere under `features/` or `shared/`
- [ ] Layout is correct at 375px wide

---

## 11. Style

- JavaScript, not TypeScript. `.jsx` for components with markup.
- Function components, hooks, no class components.
- MUI `sx` for styling; no CSS modules, no Tailwind.
- Hindi strings inline in JSX — no i18n layer for v1.
- Small files. If a component passes ~200 lines, split it.
