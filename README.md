# सर्वेक्षण ऐप — Field Survey Application

A mobile-first Hindi survey application for field workers to conduct household surveys, manage family data, track influential persons, and record political feedback — all tied to a remote voter roll in MariaDB.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Database Design](#database-design)
5. [Setup & Installation](#setup--installation)
6. [Screens & User Flow](#screens--user-flow)
7. [API Reference](#api-reference)
8. [User Scope & Access Control](#user-scope--access-control)
9. [Authentication](#authentication)
10. [Project Structure](#project-structure)
11. [Scripts](#scripts)
12. [Environment Variables](#environment-variables)

---

## Overview

सर्वेक्षण ऐप is a survey management tool designed for political field workers. Field workers log in and are shown only the data within their assigned geographic scope (ward, bhag, etc.). They can:

- Browse the household list (घर सूची) from the voter roll
- Edit house and family information
- Conduct a family survey (political leaning, development work satisfaction, CM rating)
- Manage family members and influential persons
- View a summary and finalize the survey
- Track overall progress from the dashboard

All survey data is saved to a remote MySQL `SURVEY_DATA` table and also cached locally in SQLite for offline resilience.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Mobile)                   │
│         Next.js 14 App Router — React + MUI          │
└────────────────────┬────────────────────────────────┘
                     │  HTTP / API routes
┌────────────────────▼────────────────────────────────┐
│              Next.js Server (Node.js)                │
│   /api/*  →  server/db/*  →  SQLite + MySQL          │
└─────────┬──────────────────────────┬────────────────┘
          │                          │
┌─────────▼──────────┐   ┌──────────▼──────────────┐
│  Local SQLite       │   │  Remote MariaDB (nndb)   │
│  data/app.db        │   │  configured via .env.local          │
│                     │   │                          │
│  houses             │   │  EROLL_NN055 (voter roll)│
│  house_members      │   │  SURVEY_DATA             │
│  house_surveys      │   │  users                   │
│  influential_persons│   │  user_scope              │
│  sessions           │   │  accounts                │
└─────────────────────┘   └──────────────────────────┘
```

**Hybrid data model:**
- Master voter/house data lives in `nndb.EROLL_NN055` and is imported into local SQLite via `npm run import:mysql`
- Survey edits are written to both local SQLite (draft cache) and remote `nndb.SURVEY_DATA`
- User credentials and scope live exclusively in remote MariaDB
- Sessions are stored locally in SQLite with a scope snapshot for fast, synchronous lookups

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | Material UI (MUI) v5 + Emotion |
| Language | JavaScript (JSX) |
| Local DB | better-sqlite3 (SQLite) |
| Remote DB | mysql2/promise (MariaDB 10.11) |
| Auth | Scrypt password hashing, cookie-based sessions |
| Hosting | localhost / any Node server |

---

## Database Design

### Remote MariaDB — `nndb`

#### `EROLL_NN055` — Master Voter Roll (read-only)
| Column | Type | Notes |
|---|---|---|
| AREA_ID | VARCHAR | Unique area identifier e.g. `NN055_38_1_3` |
| WARD | VARCHAR | Ward number |
| BHAG | VARCHAR | Part/booth number |
| AREACOLONY | VARCHAR | Colony / neighbourhood (क्षेत्र) |
| HNO | TEXT | House number |
| VNAME | VARCHAR | Voter name |
| FNAME | VARCHAR | Father/husband name |
| SEX | VARCHAR | M / F |
| AGE | INT | Age |
| MAINCAST | VARCHAR | Main caste |
| SUBCAST | VARCHAR | Sub-caste |
| PHONE1/PHONE2 | VARCHAR | Mobile numbers |

#### `SURVEY_DATA` — Survey Results
```sql
CREATE TABLE SURVEY_DATA (
    ID         BIGINT AUTO_INCREMENT PRIMARY KEY,
    AREA_ID    VARCHAR(32) NOT NULL,
    HNO        TEXT NOT NULL,
    JSON_DATA  JSON,
    STATUS     TINYINT NOT NULL DEFAULT 0,  -- 0=Pending, 1=Partial, 2=Completed, 3=Verified
    SURVEY_DATE DATETIME DEFAULT NULL,
    SURVEY_BY  VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    CREATED_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_house (AREA_ID, HNO(64))
);
```

**`JSON_DATA` structure:**
```json
{
  "version": 1,
  "family": {
    "headName": "किशन लाल",
    "mobile": "9876543210",
    "caste": "सामान्य",
    "subcaste": "जाट",
    "totalMembers": 5,
    "voterCount": 4,
    "area": "कृष्णा विहार"
  },
  "members": [
    { "name": "किशन लाल", "gender": "M", "age": 54, "relation": "father",
      "relativeName": "रामलाल", "mobile": null, "epic": null, "isHead": true }
  ],
  "politics": {
    "party": "bjp",
    "partyOther": null,
    "cmSatisfaction": "satisfied"
  },
  "development": {
    "works": ["road", "water"],
    "other": "नालियों की सफाई"
  },
  "schemes": [],
  "knownWorkers": {
    "colony": "राजेश शर्मा, मोहन जी",
    "block": "इमरान खान",
    "bjp": [],
    "congress": []
  },
  "influential": [
    { "name": "राजेश शर्मा", "party": "भाजपा", "position": "मंडल अध्यक्ष",
      "mobile": "9876543210", "address": null, "description": null }
  ],
  "remarks": "परिवार भाजपा समर्थक है।"
}
```

#### `users` — App Users
| Column | Notes |
|---|---|
| id | Auto-increment PK |
| name | Display name |
| phone | Login mobile (UNIQUE) |
| is_super | 1 = super admin (unrestricted scope) |
| is_active | 0 = deactivated |
| created_by | FK → users.id (who added this user) |

#### `user_scope` — Geographic Scope Grants
Each row is one scope grant for a user. A user can have multiple grants (ORed together).
| Column | Notes |
|---|---|
| user_id | FK → users.id |
| sambhag, district, lok_sabha, assembly, tehsil, city | Geographic levels (comma-separated values) |
| ward, bhag | Ward/booth level (comma-separated values) |

#### `accounts` — Credentials
| Column | Notes |
|---|---|
| phone | FK → users.phone |
| hash | Scrypt password hash |

### Local SQLite — `data/app.db`

| Table | Purpose |
|---|---|
| `houses` | Household records imported from EROLL_NN055 |
| `house_members` | Family members |
| `house_surveys` | Draft survey data (political answers, workers, remarks) |
| `influential_persons` | Influential persons linked to a house |
| `sessions` | Login sessions with snapshotted scope |

The local DB is created and migrated automatically on first API call — no manual setup needed. To reset, stop the server and delete `data/`.

---

## Setup & Installation

### Prerequisites
- Node.js 20+
- Access to the remote MariaDB server (`nndb`)

### Steps

**1. Clone and install**
```bash
git clone https://github.com/mr-1109/survey-app.git
cd survey-app
npm install
```

**2. Configure environment**
```bash
cp .env.local.example .env.local
# Edit .env.local and fill in MYSQL_PASSWORD and correct credentials
```

**3. Verify DB connection**
```bash
npm run db:check
```

**4. Import voter roll into local SQLite**

This fetches all records from `nndb.EROLL_NN055` in batches, groups them by `(AREA_ID, HNO)` to form households, and populates the local SQLite `houses` and `house_members` tables. Run once (or whenever the remote roll is updated):
```bash
npm run import:mysql
```
> ⚠️ This wipes and recreates `houses` and `house_members`. Allow 5–10 minutes for a full import.

**5. Start development server**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) — redirects to `/dashboard` after login.

**6. First login**

A super admin named **AMIT** exists in `nndb` with full scope. Ask your administrator for the mobile number and password.

---

## Screens & User Flow

### Screen 1 — डैशबोर्ड (होम) `/dashboard`
Landing page after login. Shows:
- कुल घर / पूर्ण / ड्राफ्ट / शेष counts
- आज के सर्वे count
- Progress bar (% complete)
- Ward / Bhag filter dropdowns
- "सर्वे शुरू करें" button → घर सूची
- Quick tiles: सिंक, रिपोर्ट, सेटिंग्स, सहायता

### Screen 2 — घर सूची `/houses/list`
Paginated list of households (only houses with ≥ 2 members).
- Filter by वार्ड and भाग
- Status tabs: सभी / लंबित / ड्राफ्ट / पूर्ण
- Search by house number, head name, area, or member name/mobile
- "+ नया घर जोड़ें" button for manually adding a house

### Screen 3 — घर विवरण `/houses/[id]`
Compact household summary:
- House number, head name, area, member count
- Member preview (up to 3, with "और सदस्य देखें" link)
- Survey status badge
- Edit icon + MoreVert icon → both open Quick Actions Sheet (Screen 4)

### Screen 4 — त्वरित कार्य (Quick Actions Sheet)
Full-page bottom sheet with 8 options:
| Option | Navigates to |
|---|---|
| घर की जानकारी संपादित करें | Screen 5 |
| प्रभावशाली व्यक्ति देखें / जोड़ें | Screen 6 |
| परिवार सर्वेक्षण (एडिट) | Screens 8–9 |
| सदस्य (एडिट / जोड़ें) | Screen 10 |
| सारांश (एडिट स्क्रीन) | Screen 13 |
| कॉल करें | `tel:` link |
| WhatsApp करें | WhatsApp deep link |
| घर हटाएँ | Soft-delete with confirmation |

> **Navigation rule:** Saving any of the above returns to Screen 3 (घर विवरण) with the Quick Actions Sheet re-opened.

### Screen 5 — घर की जानकारी संपादित करें `/houses/[id]/edit`
Edit form with:
- घर संख्या, पता / मोहल्ला, मोबाइल, नोट
- परिवार प्रमुख — dropdown of all family members
- जाति — Autocomplete from `MAINCAST` values
- उपजाति — Autocomplete from `SUBCAST` values
- कुल सदस्य, मतदाताओं की संख्या
- "प्रभावशाली व्यक्ति" clickable link → Screen 6

### Screen 6 — प्रभावशाली व्यक्ति सूची `/houses/[id]/influencers`
List of influential persons with Edit / Delete per row. "+ जोड़ें" opens Screen 7.

### Screen 7 — प्रभावशाली व्यक्ति जोड़ें / संपादित करें
Form: नाम, पार्टी / विचारधारा, पद / पहचान, मोबाइल, पता, प्रभाव विवरण (max 250 chars).

### Screens 8–9 — परिवार सर्वेक्षण (एडिट) — 2-page wizard `/houses/[id]/survey`
**Page 1:**
1. राजनीतिक झुकाव (Radio: भाजपा / कांग्रेस / अन्य / कोई नहीं)
2. विकास कार्य (Checkboxes: सड़क / बिजली / सफाई / पेयजल + free text)

**Page 2:**
3. CM संतुष्टि (Radio: बहुत संतुष्ट → बहुत असंतुष्ट)
4. कॉलोनी कार्यकर्ता (text, 250 char)
5. ब्लॉक कार्यकर्ता (text, 250 char)
6. सर्वेक्षण टिप्पणी (text, 250 char)

Saves as `STATUS=1` (Partial) to `SURVEY_DATA`.

### Screen 10 — सदस्य सूची `/houses/[id]/members`
List all members. "+ जोड़ें" → Screen 11. Edit row → Screen 12.

### Screens 11–12 — सदस्य जोड़ें / संपादित करें
Fields: नाम, लिंग, आयु, पिता/पति, वैवाहिक स्थिति, मोबाइल, शिक्षा, मतदाता ID.

### Screen 13 — सारांश (एडिट स्क्रीन) `/houses/[id]/summary`
Read-only summary of all house + survey data. "सहेजें और आगे बढ़ें" finalizes the survey (`STATUS=2` Completed in `SURVEY_DATA`).

### Screen 14 — ड्राफ्ट सहेजा गया
Success message. "जारी रखें" → back to Screen 4. "घर सूची पर जाएँ" → Screen 2.

---

## API Reference

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with `{ phone, password }` |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Current session info |
| POST | `/api/auth/signup` | Bootstrap first super-admin (only works if zero accounts exist) |

### Houses
| Method | Route | Description |
|---|---|---|
| GET | `/api/houses?ward=&part=&status=&q=&limit=&offset=` | Paginated house list |
| POST | `/api/houses` | Create new house manually |
| GET | `/api/houses/[id]` | Full house detail (house + members + survey + influencers) |
| PATCH | `/api/houses/[id]` | Update house fields |
| DELETE | `/api/houses/[id]` | Soft-delete house |
| PUT | `/api/houses/[id]/survey` | Save partial survey → STATUS=1 in SURVEY_DATA |
| POST | `/api/houses/[id]/finalize` | Finalize survey → STATUS=2 in SURVEY_DATA |
| GET/POST | `/api/houses/[id]/members` | List or add members |
| GET/POST | `/api/houses/[id]/influencers` | List or add influential persons |
| GET | `/api/houses/dashboard?ward=&part=` | Dashboard stats (total/done/draft/pending/today) |
| GET | `/api/houses/facets?ward=` | Ward list + bhag list for filters |
| GET | `/api/houses/castes?caste=` | Caste/subcaste autocomplete options |

### Members & Influencers
| Method | Route | Description |
|---|---|---|
| PATCH | `/api/members/[id]` | Update member |
| DELETE | `/api/members/[id]` | Soft-delete member |
| PATCH | `/api/influencers/[id]` | Update influential person |
| DELETE | `/api/influencers/[id]` | Delete influential person |

### Users
| Method | Route | Description |
|---|---|---|
| GET | `/api/users` | List users created by current user |
| POST | `/api/users` | Create new user with scope |
| GET | `/api/users/[id]` | Get user detail |
| PATCH | `/api/users/[id]` | Update user (name, phone, scope, active status) |
| DELETE | `/api/users/[id]` | Delete user |
| GET | `/api/profile` | Current user + users they created |

### Scope
| Method | Route | Description |
|---|---|---|
| GET | `/api/scope/facets?ward[]=38&ward[]=40` | Available ward/bhag/area options for scope assignment |

---

## User Scope & Access Control

Every user has a **geographic scope** — a list of grants. Each grant specifies values at one or more levels:

```
Levels: sambhag → district → lok_sabha → assembly → tehsil → city → ward → bhag
```

**Super admin** (`is_super = 1`) has no restrictions — sees all data.

**Regular user** is restricted by their grants. Multiple grants are ORed:
```
Grant 1: ward=38, bhag=1
Grant 2: ward=40
→ user sees ward 38 bhag 1 AND all of ward 40
```

**Rules:**
- A user can only assign scope ≤ their own scope to new users
- Empty level = "no restriction at this level" within the grant
- Data APIs (`/api/houses/*`) enforce scope via SQL predicates on every query

---

## Authentication

**Hybrid model:**

1. **Remote MariaDB** owns user records, password hashes (Scrypt), and scope grants
2. **Local SQLite** stores the session cookie row with a snapshot of `{ id, phone, isSuper, scope }` captured at login

This means:
- Login verifies credentials against `nndb.accounts`
- Every subsequent request reads scope from the local session (no remote call)
- When a user is edited/deleted, all their local sessions are revoked immediately

**Session cookie:** `session_token` (HttpOnly, SameSite=Lax). Valid until logout or server restart clears it.

---

## Project Structure

```
src/
├── app/                     # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── auth/            # login, logout, me, signup
│   │   ├── houses/          # house CRUD, survey, finalize, facets, dashboard
│   │   ├── members/         # member CRUD
│   │   ├── influencers/     # influencer CRUD
│   │   ├── users/           # user management
│   │   ├── scope/           # scope facets
│   │   └── profile/         # current user profile
│   ├── dashboard/           # Screen 1 — डैशबोर्ड
│   ├── houses/              # Screens 2–14 — all survey flow pages
│   ├── settings/            # Settings + user list
│   └── users/               # Add user form
│
├── features/
│   ├── auth/                # Login page component
│   ├── houses/              # All house/survey React components + client API
│   │   ├── components/
│   │   │   ├── SurveyDashboard.jsx
│   │   │   ├── HouseList.jsx
│   │   │   ├── HouseCard.jsx
│   │   │   ├── HouseFilterBar.jsx
│   │   │   ├── HouseDetail.jsx
│   │   │   ├── QuickActionsSheet.jsx
│   │   │   ├── HouseFormPage.jsx
│   │   │   ├── InfluencerList.jsx
│   │   │   ├── InfluencerForm.jsx
│   │   │   ├── FamilySurveyWizard.jsx
│   │   │   ├── MemberList.jsx
│   │   │   ├── MemberForm.jsx
│   │   │   └── SummaryPage.jsx
│   │   ├── api.js           # Client-side fetch wrappers
│   │   └── constants.js     # Survey option lists, labels
│   ├── settings/            # Settings view
│   └── users/               # Add user form + confirmation dialog
│
├── server/                  # server-only — never imported by client
│   ├── auth.js              # apiViewer(), unauthorized()
│   ├── guards.js            # guardHouse(), guardMember(), guardInfluencer()
│   ├── scope.js             # scopeForAccount(), housePredicate()
│   └── db/
│       ├── local.js         # SQLite init + migrations (SCHEMA_VERSION)
│       ├── pool.js          # MySQL2 connection pool + withTransaction()
│       ├── houses.js        # All house/member/survey SQLite queries
│       ├── users.js         # User CRUD (async, remote MySQL)
│       ├── accounts.js      # Password hashing + verify (remote MySQL)
│       ├── sessions.js      # Session create/destroy/lookup (local SQLite)
│       ├── survey-remote.js # buildJsonData(), saveRemoteSurvey(), getRemoteSurvey()
│       ├── influencers.js   # Influencer CRUD (local SQLite)
│       └── voters.js        # Legacy voter queries (unused in survey flow)
│
└── shared/
    ├── components/          # ScopeFields, PasswordField, PasswordRules
    ├── layouts/             # AppChrome, AppSidebar, MobileShell, ProfilePanel, EditUserDialog
    ├── scope.js             # Scope normalisation, grant helpers (client-safe)
    ├── houseNumber.js       # foldDigits() — Devanagari↔ASCII numeral normalisation
    ├── settings/            # SettingsContext (page size etc.)
    ├── theme/               # MUI theme, colors
    └── validation/          # Password rules

scripts/
├── import-mysql.mjs         # Seed local SQLite from nndb.EROLL_NN055
├── check-db.mjs             # Verify MySQL connection
├── create-indexes.mjs       # Add MySQL indexes
└── env.mjs                  # Shared env helpers for scripts

sql/
├── 001_app_users.sql        # Initial user schema proposal (reference only)
└── 002_users_mirror.sql     # Final users/user_scope/accounts DDL for nndb
```

**Module aliases** (`jsconfig.json`):
- `@server/*` → `src/server/*` (server-only, never imported by client components)
- `@shared/*` → `src/shared/*`
- `@features/*` → `src/features/*`

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build (outputs to `.next-build/` to avoid clobbering dev cache) |
| `npm run start` | Start production server |
| `npm run import:mysql` | Batch-import voter roll from `nndb.EROLL_NN055` into local SQLite |
| `npm run db:check` | Verify MySQL connection and charset |
| `npm run db:indexes` | Create recommended indexes on MySQL (idempotent) |

---

## Environment Variables

Create `.env.local` (never commit this file — it is gitignored):

```env
MYSQL_HOST=your_db_host
MYSQL_PORT=3306
MYSQL_USER=your_db_user
MYSQL_PASSWORD=your_db_password
MYSQL_DATABASE=your_db_name
```

See `.env.local.example` for the template.

---

## Notes

- **Devanagari numerals** — house numbers and mobile numbers may be entered in either Devanagari (१, २, ३…) or ASCII (1, 2, 3…). The app normalises both to ASCII via `foldDigits()` before storing and searching, so `१७` and `17` always match.
- **Houses with < 2 members** are excluded from all lists and counts (likely data artifacts from the voter roll).
- **Survey STATUS codes** — `0` Pending (not started), `1` Partial (draft saved), `2` Completed (summary finalised), `3` Verified (admin sign-off).
- **SURVEY_DATA UPSERT** — saving always uses `INSERT ... ON DUPLICATE KEY UPDATE` on `(AREA_ID, HNO)`, so re-saving is always safe.
- **Local SQLite auto-migration** — the schema version is tracked in `houses_meta`. Running the app automatically applies any pending migrations; no manual `ALTER TABLE` is needed.
