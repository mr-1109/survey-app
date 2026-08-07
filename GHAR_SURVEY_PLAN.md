# घर (मकान) survey module — implementation plan

Plan only. No code has been written yet.

This revision replaces the earlier tab-based घर विवरण flow with the new
16-screen flow from `all-in-one-mobile-ui-full-hd-*.png` (डैशबोर्ड landing +
त्वरित कार्य action-sheet + dedicated edit screens for हर field group). The
household grouping / import logic from `SUKET excel combine.xlsx` (§2–§4)
is unchanged and still applies underneath this new UI.

---

## 0. New flow — screen map & navigation (this revision)

App name shown in the header: **सर्वेक्षण ऐप**.

### 0.1 Screen list (numbers match the reference mock)

| # | Screen | Route (proposed) |
|---|---|---|
| 1 | डैशबोर्ड (होम) — new landing page after login | `/dashboard` |
| 2 | घर सूची (वार्ड) | `/houses` |
| 3 | घर विवरण (no tabs) | `/houses/[id]` |
| 4 | त्वरित कार्य (विकल्प) — full-page action popup | modal over `/houses/[id]` |
| 5 | घर की जानकारी संपादित करें | `/houses/[id]/edit` |
| 6 | प्रभावशाली व्यक्ति सूची | `/houses/[id]/influencers` |
| 7 | प्रभावशाली व्यक्ति जोड़ें / संपादित करें | `/houses/[id]/influencers/new`, `/houses/[id]/influencers/[pid]` |
| 8 | परिवार सर्वेक्षण (एडिट) — पृष्ठ 1 | `/houses/[id]/survey?step=1` |
| 9 | परिवार सर्वेक्षण (एडिट) — पृष्ठ 2 | `/houses/[id]/survey?step=2` |
| 10 | सदस्य सूची (एडिट) | `/houses/[id]/members` |
| 11 | नया सदस्य जोड़ें | `/houses/[id]/members/new` |
| 12 | सदस्य संपादित करें | `/houses/[id]/members/[mid]` |
| 13 | सारांश (एडिट स्क्रीन) | `/houses/[id]/summary` |
| 14 | ड्राफ्ट सहेजा गया (success confirmation) | modal over `/houses/[id]/summary` |
| 15/16 | घर सूची (variant, legend reference only) | same as #2 |

### 0.2 Navigation graph

```
लॉगिन
  └─> 1. डैशबोर्ड (होम)
        ├─ "सर्वे शुरू करें" ──────────────► 2. घर सूची
        ├─ त्वरित कार्य: सिंक करें / रिपोर्ट / सेटिंग / सहायता
        └─ (sidebar, existing) ──────────────► other modules

2. घर सूची
  ├─ "+ नया घर जोड़ें" ─────────────────────► घर जोड़ें फॉर्म (reuses screen 5 layout, empty) ─ save ─► 2. घर सूची
  └─ tap a house card ─────────────────────► 3. घर विवरण

3. घर विवरण
  ├─ "..." / edit icon (top bar) ───────────► 4. त्वरित कार्य (popup)
  └─ "+ नया सदस्य जोड़ें" ───────────────────► 11. नया सदस्य जोड़ें ─ save ─► 4. त्वरित कार्य

4. त्वरित कार्य (popup) — 8 options:
  ├─ घर की जानकारी संपादित करें ────────────► 5 ─ सहेजें ─► वापस 4. त्वरित कार्य
  ├─ प्रभावशाली व्यक्ति देखें / जोड़ें ───────► 6 ─┬─ "+ जोड़ें" / "संपादित करें" ─► 7 ─ सहेजें ─► वापस 6
  │                                              └─ (कोई और action नहीं) back arrow ─► वापस 4. त्वरित कार्य
  ├─ परिवार सर्वेक्षण (एडिट) ────────────────► 8 ─ अगला ─► 9 ─ सहेजें ─► वापस 4. त्वरित कार्य
  ├─ सदस्य (एडिट / जोड़ें) ──────────────────► 10 ─┬─ "+ जोड़ें" ─► 11 ─ सहेजें ─► वापस 10
  │                                               └─ "संपादित करें" ─► 12 ─ सहेजें ─► वापस 10
  │                                               (10 खुद भी वापस 4 पर आता है, back arrow से)
  ├─ सारांश (एडिट स्क्रीन) ──────────────────► 13 ─ "सहेजें और आगे बढ़ें" ─► 14 (सफलता मोडल)
  │                                                                          ├─ "जारी रखें" ──► वापस 4. त्वरित कार्य
  │                                                                          └─ "घर सूची पर जाएँ" ──► 2. घर सूची
  ├─ कॉल करें ─────────────────────────────► native dialer (tel: लिंक), कोई screen change नहीं
  ├─ WhatsApp करें ────────────────────────► wa.me लिंक, कोई screen change नहीं
  └─ घर हटाएँ ─────────────────────────────► confirm dialog ─ हटाएँ ─► 2. घर सूची
```

**Hard rule (explicit from requirements):** the save action on every one of these
five screens/flows —

1. घर की जानकारी संपादित करें (5)
2. प्रभावशाली व्यक्ति देखें / जोड़ें (6/7)
3. परिवार सर्वेक्षण (एडिट) (8/9)
4. सदस्य (एडिट / जोड़ें) (10/11/12)
5. सारांश (एडिट स्क्रीन) (13)

— must return the user to **screen 4, त्वरित कार्य**, not to screen 3
(घर विवरण). Screen 13 is the one exception in appearance only: its save
button first shows the screen 14 success modal, whose "जारी रखें" action is
what lands back on screen 4 (net effect: same rule, one extra confirmation
step because 13 is the terminal step of the whole edit flow).

Implementation approach: त्वरित कार्य is not a route change but an overlay
(bottom-sheet/full-screen modal) rendered on top of `/houses/[id]`. Every
child editor is opened by pushing a route on top of that overlay; on save,
`router.back()` twice (child → त्वरित कार्य) or, simpler, each editor's save
handler navigates directly to `/houses/[id]#action-sheet=open` so the
overlay re-opens deterministically regardless of navigation depth.

### 0.3 डैशबोर्ड (होम) — screen 1

New landing page after login, replacing whatever route currently loads first
for field-survey users.

- Header: **सर्वेक्षण ऐप**
- Sub-header: वार्ड: 65, कृष्णा विहार (from user's bound scope)
- Stat grid (4 tiles): कुल घर, पूर्ण, ड्राफ्ट, शेष
- आज के सर्वे: 12 (houses whose `survey_status` changed today, or created
  today — see §5 API)
- समन्वयन स्थिति: ऑनलाइन / ऑफलाइन (network/online indicator, reuses existing
  connectivity check if the app has one; otherwise `navigator.onLine`)
- प्रगति (वार्ड 65): progress bar, 37%, "69 / 256" — `पूर्ण / कुल घर`
- Primary button: **सर्वे शुरू करें** → `/houses`
- त्वरित कार्य grid (4 icons): सिंक करें, रिपोर्ट, सेटिंग, सहायता
- Footer: अंतिम सिंक: 20 मई 2025, 10:30 AM

Data needed: `GET /api/dashboard/stats?ward=` (see §5). "शेष" = कुल घर −
पूर्ण − ड्राफ्ट. "अंतिम सिंक" needs a small `app_meta` key/value row
(`last_sync_at`) — new, see §3.4.

### 0.4 घर सूची — screen 2 (update from previous plan)

Same as old §6.1, plus:

- New button **"+ नया घर जोड़ें"** in the app bar (or as a floating action
  button) → opens a "घर जोड़ें" form using the same fields as screen 5
  (घर संख्या, परिवार प्रमुख, पता/मोहल्ला, मोबाइल नंबर, जाति, उपजाति, कुल
  सदस्य, मतदाताओं की संख्या), but empty and creating a **new** house not tied
  to any imported roll row (`source = 'manual'` on the `houses` row). Needed
  because field workers will find houses missing from the SUKET roll
  entirely.
- On save → new house created → land on its घर विवरण (screen 3).

### 0.5 घर विवरण — screen 3 (redesigned, no tabs)

Removes the old सर्वेक्षण जानकारी tab entirely. Single scroll screen:

- Top app bar: back arrow, **घर विवरण: 101**, **edit icon** (pencil, new)
  next to the existing "..." menu — tapping either opens screen 4
  (त्वरित कार्य).
- Status chip: पूर्ण / ड्राफ्ट / लंबित (green/amber/grey, same semantics as
  `survey_status`).
- घर विवरण card (read-only here — editing happens via screen 4→5 only):
  परिवार प्रमुख, मोबाइल नंबर (+ WhatsApp icon), पता/मोहल्ला, मकान संख्या,
  कुल सदस्य, मतदाताओं की संख्या.
- जाति / उपजाति row.
- "घर के मुख्य सदस्य" list — compact rows (avatar, name, M/age, HEAD badge)
  — read-only preview, not the full editable list (that's screen 10).
- Button: **+ नया सदस्य जोड़ें** → screen 11, save returns to screen 4 (not
  screen 3) per the hard rule above.

### 0.6 त्वरित कार्य — screen 4 (new)

Full-page popup / bottom sheet, opened from screen 3's edit icon or "...".
List of 8 rows, each with an icon and label, per the requirements:

1. ✏️ घर की जानकारी संपादित करें → screen 5
2. 👥 प्रभावशाली व्यक्ति देखें / जोड़ें → screen 6
3. 📋 परिवार सर्वेक्षण (एडिट) → screen 8
4. 🧑‍🤝‍🧑 सदस्य (एडिट / जोड़ें) → screen 10
5. 📄 सारांश (एडिट स्क्रीन) → screen 13
6. 📞 कॉल करें → `tel:` link to head's mobile
7. 💬 WhatsApp करें → `wa.me` link to head's mobile
8. 🗑️ घर हटाएँ → confirm dialog → soft-delete house → back to screen 2

This is a shared component (`QuickActionsSheet`) mounted once per
`/houses/[id]` page, reusable from both the edit icon and the "..." menu so
there is exactly one implementation of the hard-rule navigation.

### 0.7 घर की जानकारी संपादित करें — screen 5

Form fields (replaces/extends old §6.3):

- घर संख्या* — text (maps to `house_no`)
- परिवार प्रमुख* — text (maps to `head_name`, or a picker over
  `house_members` if a head already exists)
- पता / मोहल्ला* — text (`area`)
- मोबाइल नंबर* — tel, 10-digit validated (`mobile`)
- जाति* — select (new field, see §3.1)
- उपजाति — text (new field, see §3.1)
- कुल सदस्य (परिवार में) — number (`total_members`)
- मतदाताओं की संख्या — number, read-only-ish but shown editable per mock
  (`voter_count` — note: previously read-only/derived; the mock now shows it
  as an editable field on this form. **Decision:** keep it derived from the
  roll by default but allow manual override, matching "कुल सदस्य" already
  being editable. Track this as an explicit override flag if precision
  matters later.)
- प्रभावशाली व्यक्ति (3) — read-only summary row/pill showing count, tap
  navigates to screen 6 (not a field on this form, just a shortcut)
- Buttons: रद्द करें / सहेजें → **on सहेजें, return to screen 4**

### 0.8 प्रभावशाली व्यक्ति सूची — screen 6

- Header: प्रभावशाली व्यक्ति (कुल {n})
- Button: + जोड़ें → screen 7 (empty form)
- List rows: क्रमांक, नाम, पार्टी, पद, संपादित करें (pencil) → screen 7
  (pre-filled), हटाएँ (trash) → confirm → remove from list, stay on screen 6
- Footer: कुल: {n} व्यक्ति
- Back arrow → screen 4 (त्वरित कार्य), consistent with the hard rule (this
  screen has no "save" of its own — it's a list, so back always goes to 4).

### 0.9 प्रभावशाली व्यक्ति जोड़ें / संपादित करें — screen 7

Form fields (maps to new `influential_persons` table, §3.2):

- व्यक्ति का नाम* — text
- पार्टी / विचारधारा* — text/select
- पद / पहचान — text
- मोबाइल नंबर — tel
- पता — text (defaults to house's पता/मोहल्ला, editable)
- प्रभाव / विशेष विवरण* — textarea, 250 char limit with live counter
  ("अक्षर संख्या: 49 / 250")
- Buttons: रद्द करें / सहेजें → **on सहेजें, return to screen 4** (per the
  hard rule — not back to screen 6, even though this screen was opened from
  6. Confirmed by the requirement list explicitly naming "प्रभावशाली व्यक्ति
  देखें / जोड़ें" as one of the five flows whose save must land on 4.)

### 0.10 परिवार सर्वेक्षण (एडिट) — screens 8 & 9

Two-step wizard (visual stepper "1 → 2 → 3 → 4", but only 2 data-entry
pages are specified — see the open question in §8 about the remaining
steps). Maps to the extended `house_surveys` table (§3.3).

**पृष्ठ 1 (screen 8):**

1. इस परिवार का राजनीतिक झुकाव किस पार्टी की ओर है?* — single-select radio:
   भाजपा / कांग्रेस / अन्य (party name text input for अन्य) / किसी भी पार्टी
   से नहीं
2. विकास कार्यों के लिए (एक या अधिक चुनें) — multi-select checkboxes:
   सड़क अच्छी हुई है / बिजली कटौती कम हुई है / साफ-सफाई अच्छी हुई है /
   पेयजल आपूर्ति में सुधार हुआ है, + अन्य (free text)

Buttons: ← पिछला (disabled on step 1) / अगला → (goes to screen 9, no save
yet — local component state only).

**पृष्ठ 2 (screen 9):**

3. मुख्यमंत्री के कार्यों से आप कितने संतुष्ट हैं? — single-select radio:
   बहुत संतुष्ट / संतुष्ट / सामान्य / असंतुष्ट / बहुत असंतुष्ट
4. स्थानीय वार्ड ... कॉलोनी में कार्यकर्ता — textarea, 250 char limit
5. स्थानीय वार्ड ... ब्लॉक में कार्यकर्ता — textarea, 250 char limit
6. सर्वेक्षण टिप्पणी — textarea, 250 char limit

Buttons: ← पिछला (back to screen 8, state preserved) / अगला → — on step 2
this button is the actual **save** (label may read अगला → or सहेजें
depending on final copy) and **returns to screen 4**, per the hard rule.

### 0.11 सदस्य सूची (एडिट) — screen 10

- Header: सदस्य सूची (कुल {n})
- Button: + जोड़ें → screen 11
- Rows: avatar, नाम (लिंग-आद्याक्षर/आयु), HEAD badge if applicable, रिश्ता
  line (मुखिया / पति / पिता — derived from `relation` + `relative_name`),
  संपादित करें → screen 12 (pre-filled), हटाएँ → confirm → soft-delete
  member, stay on screen 10
- Footer: कुल सदस्य: {n}
- Back arrow → screen 4.

### 0.12 नया सदस्य जोड़ें — screen 11

Fields: नाम*, लिंग* (पुरुष/महिला/अन्य), आयु*, पिता/पति का नाम*,
वैवाहिक स्थिति (select), मोबाइल नंबर, शिक्षा, मतदाता ID (यदि हो).
Buttons: रद्द करें / सहेजें → **return to screen 4** (not screen 10 — a
member added from the घर विवरण "+ नया सदस्य जोड़ें" button also lands on 4,
consistent with the hard rule covering "सदस्य (एडिट / जोड़ें)" as one flow).

### 0.13 सदस्य संपादित करें — screen 12

Same fields as screen 11, pre-filled. Buttons: रद्द करें / सहेजें →
**return to screen 4**.

### 0.14 सारांश (एडिट स्क्रीन) — screen 13

Read-aggregate of everything entered so far, grouped in two cards:

- **घर जानकारी**: घर संख्या, परिवार प्रमुख, क्षेत्र/मोहल्ला, कुल सदस्य,
  मतदाताओं की संख्या
- **परिवार सर्वेक्षण सारांश**: राजनीतिक झुकाव, विकास कार्य के लिए
  ("{n} चयनित"), CM से संतुष्टि, कॉलोनी कार्यकर्ता, ब्लॉक कार्यकर्ता,
  सर्वेक्षण टिप्पणी (quoted)

Step indicator shown at top (cosmetic, mirrors screens 8/9's stepper).
Buttons: ← पिछला / **सहेजें और आगे बढ़ें** →

- Marks `house_surveys` + `houses` as finalized for this pass
  (`survey_status = 'done'` if all required sections are filled, else stays
  `partial`), then shows screen 14.

### 0.15 ड्राफ्ट सहेजा गया — screen 14

Success modal (checkmark icon), message: "ड्राफ्ट सफलतापूर्वक सहेज दिया
गया है।"

Buttons:

- **जारी रखें** → dismiss modal, return to screen 4 (त्वरित कार्य) — this
  is what satisfies the hard rule for the सारांश flow.
- **घर सूची पर जाएँ** → dismiss modal, navigate to screen 2 (घर सूची)

### 0.16 Legend / reference boxes (bottom of the mock)

Not app screens — these are annotations in the design file for the
implementer: स्टेटस colors (पूर्ण=green, ड्राफ्ट=amber, नोट सूक्ष्म/pending
=grey/yellow dot), आइकॉन गाइड (संपादित करें pencil, हटाएँ trash, WhatsApp,
कॉल करें), फ्लो diagram (डैशबोर्ड → घर सूची → घर विवरण → संपादन/(पर विवरण) /
सर्वे/संपादन → सहेजें → अगला घर), रंग गाइड (primary orange `#F97316`,
success green, info blue, warning amber). These should become the shared
design tokens / status-chip component used across all screens above, not
re-derived per screen.

---

## 1. What the Excel actually contains

Verified by reading the file, not assumed.

| | |
|---|---|
| Sheet | `Combined OCR Results` (single sheet) |
| Rows | 18,200 data rows + header |
| Columns | `WARD_NO, PART_NO, Page, List Type, Action, Serial, EPIC, Name, Relation, F_NAME, House Number, Age, Gender` |
| Wards | 25 (`001`–`025`) |
| Parts | 2 (`001`, `002`) — 27 distinct ward×part combos |
| Pages | 50 |

Column profile:

| Column | Nulls | Distinct | Notes |
|---|---|---|---|
| `WARD_NO` | 0 | 25 | zero-padded strings |
| `PART_NO` | 0 | 2 | zero-padded strings |
| `Page` | 0 | 50 | integer |
| `List Type` | 0 | 3 | Main 16,841 · Deletion 769 · Addition 590 |
| `Action` | 17,432 | 4 | only on Deletion rows: S 262, R 258, E 246, O 2 |
| `Serial` | 0 | 1,242 | per page, not unique |
| `EPIC` | 348 | 17,525 | 291 EPICs repeat across 618 rows |
| `Name` | 0 | 8,303 | Devanagari |
| `Relation` | 2 | 4 | father 10,881 · husband 7,208 · mother 72 · other 37 |
| `F_NAME` | 2 | 6,096 | father/husband name |
| `House Number` | 0 | 2,247 raw | **1,137 non-numeric OCR values** |
| `Age` | 0 | 87 | stored as text |
| `Gender` | 4 | 2 | पुरूष 9,272 · स्त्री 8,924 |

### This is a different dataset from the current app

The existing app reads `SIR_RJ188_F` — AC 188 सांगोद, 201,002 voters, keyed on
`BHAG` 1–266. The SUKET file is **municipal ward data**: 18,200 voters, wards
001–025, `PART_NO`, `Page`. There is no overlap in keys or scale.

**Decision:** SUKET goes into the **local SQLite** store (`data/app.db`), same
as users/follow-ups/survey entries. Nothing is written to the remote MariaDB —
consistent with the standing rule for this project.

---

## 2. The घर / मकान grouping logic

### Key

```
house_key = WARD_NO + PART_NO + Page + normalise(House Number)
```

### Leading-zero normalisation (required)

`1` and `01` are the same house. Normalisation strips leading zeros, with `0`
preserved when the value is all zeros:

```
"1"    -> "1"
"01"   -> "1"
"001"  -> "1"
"0"    -> "0"
"00"   -> "0"
"000"  -> "0"
"0000" -> "0"
"0786" -> "786"
```

Values in the file carrying a leading zero: `00, 000, 0000, 01, 02, 03, 04, 06,
0786, 09`.

**Measured impact:** grouping on the raw string yields 4,646 houses; after
normalisation, 4,631 — normalisation correctly merges **15 households** that
would otherwise be split in two.

### Verified against the user's example

Ward `001`, part `001`, page `2`, house `1`:

| Serial | EPIC | Name | Relation | F_NAME | raw House Number |
|---|---|---|---|---|---|
| 2 | UEL0579383 | हेमराजनाथ | father | रमेशचन्दनाथ | `1` |
| 3 | UEL0863092 | रोशन | husband | हेमराज | `1` |
| 4 | UEL0260687 | धन्नालाल | father | अमरलाल | `1` |
| 5 | UEL2175552 | माया | husband | हरीश | `01` |
| 6 | UEL1790625 | हरीश | father | हेमराज नाथ | `01` |
| 7 | UEL1968023 | काजल योगी | father | हेमराज नाथ | `1` |

Grouping produces exactly these 6 members in one घर — the `01` rows land with
the `1` rows. Matches the requirement.

### Why `Page` must stay in the key

Dropping `Page` collapses to 3,209 houses with a largest household of **168**
members — clearly wrong. House numbers restart per page, so `Page` is load
bearing. Keeping it is correct.

### Full House Number normalisation

Leading zeros are only part of the problem. Of 2,247 distinct raw values, 1,137
are not plain digits. Breakdown by pattern:

| Pattern | Distinct | Rows | Example | Treatment |
|---|---|---|---|---|
| pure digits | 1,110 | 15,678 | `479` | strip leading zeros |
| digits + Devanagari suffix | 382 | 1,176 | `9क`, `34ख`, `36ए` | **keep — real sub-house numbers** |
| digits + space + Devanagari | 284 | 576 | `102 क` | remove space → `102क` |
| digits + punctuation | 79 | 84 | `09 \|`, `1641 '` | strip the punctuation |
| digits + Latin suffix | 8 | 14 | `102A`, `661K` | keep as-is |
| digits + space + digits | 31 | 32 | `20 1`, `1 4` | **ambiguous — flagged, not guessed** |
| no leading digit | 83 | 157 | `कोटा रोड`, `Oh` | not a house number |
| mixed / other | 270 | 483 | `1699(क)`, `30-क`, `एच.नं. 1041` | see rules below |

**Confirmed by you:** `9क`, `34ख`, `36ए` are genuine house numbers. So suffixes
are preserved, never stripped. `102 क` and `102क` are the *same* house — only
the space differs.

**Normalisation rules, in order:**

```
1. strip OCR punctuation noise         " " ' ' " ' | [ ] % _
2. strip a leading "house no." prefix  एच.नं. / एचएनओ / एम.के. / मकान नं / HN / H.No
                                       "एच.नं. 1041" -> "1041"
3. join dash/bracket suffixes          "30-क" -> "30क" ; "1699(क)" -> "1699क"
4. join space before a suffix          "102 क" -> "102क"   (ONLY before Devanagari)
5. strip leading zeros from the number  "01" -> "1" ; "0000" -> "0"
6. drop trailing address words          "1684के कोटा रोड" -> "1684के"
```

Rule 4 deliberately does **not** touch `20 1` (digits after the space) — that
could be house 201 or a mis-split of 20 and 1, so those 35 rows are flagged for
review rather than guessed.

**Measured effect of each stage:**

| Rule set | Houses | Avg members | Max |
|---|---|---|---|
| raw string, no normalisation | 4,646 | 3.92 | 27 |
| leading zeros only | 4,631 | 3.93 | 27 |
| **full rules above** | **4,408** | **4.13** | 27 |

Full normalisation merges **238 additional households** that would otherwise be
split. Verified samples: `36 क`+`36क`, `48 क`+`48क`, `1712 क`+`1712क`,
`337 के`+`337के`, `53`+`53 |`, `1641`+`1641 '`, `1761`+`1761 |`.

**Row outcomes:** 17,655 clean (97.0%) · 510 unusable text (2.8%) · 35 ambiguous
(0.2%).

### Rows where House Number is not a house number

510 rows carry something else in that column. Dominated by the ward number
duplicated into the wrong field — `वार्ड नं 1` (50), `वार्ड नं. 01` (17),
`वार्ड नं 01` (16) — plus locality names: `सुकेत`, `नाले का किनारा`,
`जामा मस्जिद`, `नयापुरा`, `मोहर्म चौक`, `सहकारी समिती`.

These are **not** house numbers and must not be keyed on. Proposal:

- `house_no = NULL`, original string preserved in `house_no_raw`
- locality strings seed the `area` (ग्राम/मोहल्ला) field, where they belong
- grouped into one `बिना मकान संख्या` bucket per (ward, part, page)
- flagged `needs_review = 1` so field workers can assign the real number

### Resulting shape

| | |
|---|---|
| Houses | **4,408** |
| Average members per house | 4.13 |
| Largest household | 27 |
| Rows needing review | 545 (3.0%) |

### List Type handling

- `Main` (16,841) and `Addition` (590) → active voters in the house.
- `Deletion` (769) → voters removed from the roll. Imported but flagged
  `is_deleted = 1`, hidden from house member counts by default, still visible
  under a "हटाए गए" toggle so field workers can see who left.
- Only 2 Deletion EPICs also appear in Main, so Deletion is largely a separate
  set, not duplicates of live rows.

### Duplicate EPIC handling

291 EPICs appear more than once (618 rows). Import keeps every row — the
natural key is `(ward, part, page, list_type, serial)`, not EPIC. EPIC gets a
non-unique index for lookup.

### परिवार मुखिया (head of household)

The Excel has no head flag. Inference: within a house, the member whose `Name`
appears as another member's `F_NAME` is the head. **This resolves 64% of
multi-member houses** (1,616 of 2,515). Fallback chain:

1. Member named as another member's `F_NAME`
2. Oldest male member
3. Oldest member
4. First by `Serial`

Head is stored as a real editable column, seeded by inference — the field
worker corrects it on screen 5 (घर की जानकारी संपादित करें).

---

## 3. Local database schema

New tables in `data/app.db` (SQLite), added via the existing
`SCHEMA` + `SCHEMA_VERSION` migration mechanism in `src/server/db/local.js`.

```sql
CREATE TABLE IF NOT EXISTS houses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  ward_no          TEXT    NOT NULL,
  part_no          TEXT,                -- NULL for manually added houses (screen 2 "+ नया घर जोड़ें")
  page             INTEGER,             -- NULL for manually added houses
  house_no         TEXT    NOT NULL,   -- normalised
  house_no_raw     TEXT,               -- first raw spelling seen, for audit (NULL if manual)
  head_member_id   INTEGER REFERENCES house_members(id),
  head_name        TEXT,               -- denormalised for list rendering
  mobile           TEXT,
  area             TEXT,               -- ग्राम / मोहल्ला / एरिया / पता
  caste            TEXT,               -- जाति — NEW (screen 5)
  subcaste         TEXT,               -- उपजाति — NEW (screen 5)
  total_members    INTEGER,            -- editable, seeded = voter count
  voter_count      INTEGER NOT NULL DEFAULT 0, -- derived from roll; manually overridable per screen 5
  note             TEXT,
  survey_status    TEXT NOT NULL DEFAULT 'pending',  -- pending|partial|done
  source           TEXT NOT NULL DEFAULT 'roll',      -- roll|manual — NEW, for "+ नया घर जोड़ें"
  is_deleted       INTEGER NOT NULL DEFAULT 0,        -- NEW, for "घर हटाएँ" (soft delete)
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at       TEXT,
  UNIQUE (ward_no, part_no, page, house_no)
);

CREATE TABLE IF NOT EXISTS house_members (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id      INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  serial        TEXT,
  epic          TEXT,
  name          TEXT NOT NULL,
  relation      TEXT,          -- father|husband|mother|other
  relative_name TEXT,          -- F_NAME
  gender        TEXT,          -- M|F|O, mapped from पुरूष/स्त्री
  age           INTEGER,
  marital_status TEXT,         -- NEW (screens 11/12)
  mobile        TEXT,
  education     TEXT,          -- NEW (screens 11/12)
  voter_id      TEXT,          -- NEW — मतदाता ID field on screens 11/12 (distinct from EPIC on roll rows)
  occupation    TEXT,
  voter_category TEXT,
  note          TEXT,
  is_head       INTEGER NOT NULL DEFAULT 0,
  is_verified   INTEGER NOT NULL DEFAULT 0,
  is_deleted    INTEGER NOT NULL DEFAULT 0,   -- List Type = Deletion, or soft-deleted via screen 10
  list_type     TEXT,
  source        TEXT NOT NULL DEFAULT 'roll', -- roll|manual
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at    TEXT
);

-- REVISED for the new family-survey questions (screens 8 & 9)
CREATE TABLE IF NOT EXISTS house_surveys (
  house_id          INTEGER PRIMARY KEY REFERENCES houses(id) ON DELETE CASCADE,
  political_party   TEXT,     -- bjp|congress|other|none
  political_party_other TEXT, -- free text when political_party = 'other'
  development_works TEXT,     -- JSON array: ["road","electricity","cleanliness","water"]
  development_other TEXT,     -- free text for "अन्य"
  cm_satisfaction   TEXT,     -- very_satisfied|satisfied|neutral|dissatisfied|very_dissatisfied
  colony_workers    TEXT,     -- free text, 250 char
  block_workers     TEXT,     -- free text, 250 char
  remarks           TEXT,     -- सर्वेक्षण टिप्पणी, 250 char
  surveyed_by       INTEGER REFERENCES users(id),
  surveyed_at       TEXT,
  updated_at        TEXT
);

-- NEW table for screens 6 & 7
CREATE TABLE IF NOT EXISTS influential_persons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id     INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  party        TEXT NOT NULL,       -- पार्टी / विचारधारा
  position     TEXT,                -- पद / पहचान
  mobile       TEXT,
  address      TEXT,
  description  TEXT NOT NULL,       -- प्रभाव / विशेष विवरण, 250 char
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT
);

-- NEW: small key/value table for dashboard footer ("अंतिम सिंक: ...") and similar app-level state
CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_houses_ward         ON houses (ward_no, part_no);
CREATE INDEX IF NOT EXISTS idx_houses_status       ON houses (survey_status);
CREATE INDEX IF NOT EXISTS idx_members_house       ON house_members (house_id);
CREATE INDEX IF NOT EXISTS idx_members_epic        ON house_members (epic);
CREATE INDEX IF NOT EXISTS idx_members_name        ON house_members (name);
CREATE INDEX IF NOT EXISTS idx_influencers_house   ON influential_persons (house_id);
```

**Why `total_members` and `voter_count` are separate:** the reference screens
show both `कुल सदस्य (परिवार में): 5` and `मतदाताओं की संख्या: 4`. The roll
only knows voters; the household may include children. `voter_count` is
derived by default; screen 5 now allows a manual override (see §0.7 note).

**Migration note:** this is an additive change to the previous plan's schema
(add `caste`, `subcaste`, `source`, `is_deleted` to `houses`; add
`marital_status`, `education`, `voter_id` to `house_members`; replace the old
`kisan_benefits`/`kisan_other` columns on `house_surveys` with
`development_works`/`development_other` and add `colony_workers`/
`block_workers`; add the two new tables). Since no code exists yet, this can
simply be written as the schema from the start rather than a two-step
migration.

---

## 4. Import script

`scripts/import-suket.mjs`, run once:

```bash
npm run import:suket -- "/Users/rahul/Desktop/SUKET excel combine.xlsx"
```

Steps:

1. Read the sheet with a streaming XLSX reader (needs one new dev dependency —
   `xlsx` or `exceljs`; ~18k rows so memory is not a concern).
2. Normalise each row: house number (§2), gender (पुरूष→M, स्त्री→F), age to
   integer, trim all strings.
3. Group by `(ward, part, page, normalised house)`.
4. Insert `houses` (with `source = 'roll'`), then `house_members`, in a
   single transaction.
5. Infer and set `is_head` / `head_name` per §2.
6. Set `voter_count` = count of non-deleted members.
7. Print a summary: houses created, members, heads inferred, rows skipped, and
   a list of every house number that failed clean normalisation, for review.

Idempotent: re-running wipes and rebuilds `houses`/`house_members` rows with
`source = 'roll'` only — manually added houses (`source = 'manual'`),
`influential_persons`, and `house_surveys` field data must survive a
re-import (see open question §8.6).

---

## 5. API routes

All under the existing auth + scope guards. Scope maps `ward_no` to the
existing scope ladder (see §7).

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/dashboard/stats?ward=` | **NEW** — screen 1 tiles: total/done/draft/remaining, आज के सर्वे count, प्रगति % |
| GET | `/api/houses?ward=&status=&q=&limit=&offset=` | घर सूची (screen 2), paginated |
| GET | `/api/houses/facets` | ward list, per-ward totals and survey % |
| POST | `/api/houses` | **NEW** — "+ नया घर जोड़ें" (screen 2), `source='manual'` |
| GET | `/api/houses/:id` | house + members + survey + influencers, one payload (screen 3) |
| PATCH | `/api/houses/:id` | घर की जानकारी संपादित करें (screen 5) |
| DELETE | `/api/houses/:id` | **NEW** — घर हटाएँ (screen 4 item 8), soft delete |
| GET | `/api/houses/:id/members` | सदस्य सूची (screen 10) |
| POST | `/api/houses/:id/members` | नया सदस्य जोड़ें (screen 11) |
| PATCH | `/api/members/:id` | सदस्य संपादित करें (screen 12) |
| DELETE | `/api/members/:id` | हटाएं (soft delete, `is_deleted = 1`) |
| GET | `/api/houses/:id/influencers` | **NEW** — प्रभावशाली व्यक्ति सूची (screen 6) |
| POST | `/api/houses/:id/influencers` | **NEW** — जोड़ें (screen 7) |
| PATCH | `/api/influencers/:id` | **NEW** — संपादित करें (screen 7) |
| DELETE | `/api/influencers/:id` | **NEW** — हटाएँ (screen 6) |
| PUT | `/api/houses/:id/survey` | परिवार सर्वेक्षण save (screens 8/9 combined submit) |
| POST | `/api/houses/:id/finalize` | **NEW** — सारांश "सहेजें और आगे बढ़ें" (screen 13 → 14); recomputes `survey_status` |

Validation mirrors existing routes: whitelist enums server-side
(`political_party`, `cm_satisfaction`, `gender`, `marital_status`), reject
unknown values with 400, mobile must be 10 digits, description/remarks
textareas capped server-side at 250 chars to match the UI counters.

`survey_status` recomputed after every survey/finalize save: `done` when the
family survey (screens 8/9) and घर जानकारी are both complete, `partial` when
some sections are filled, `pending` when none.

---

## 6. Screens — implementation notes

Superseded by the numbered screen specs in §0.3–§0.15 above. This section
now only lists cross-cutting UI notes that apply to more than one screen.

- New feature directory `src/features/houses/`, routed under `/houses` (and
  `/dashboard` for screen 1). Reuses `AppChrome` so the existing sidebar and
  auth wrap it for free — **the mock's bottom nav bar is not implemented**;
  same call as before, tracked in §8.2.
- `QuickActionsSheet` (screen 4) is a single shared component mounted on the
  घर विवरण page; every child editor's save handler returns to it via the
  hard rule in §0.2, not via `router.back()`, so the destination is
  deterministic regardless of how deep the user navigated.
- Character-count fields (250 char, seen on screens 7, 8/9's textareas)
  share one `LimitedTextarea` component with the "अक्षर संख्या: n / 250"
  footer.
- Step indicators (screens 8, 9, 13) share one `StepIndicator` component.
- WhatsApp/call icons reuse the existing `VoterActions` logic. The SUKET roll
  has no mobile column — every `mobile` starts NULL and is field-entered, so
  these affordances stay disabled until a number is typed, same honest
  treatment as the existing voter card.
- Photo upload shown in some mocks for members is **not in scope for phase
  1** — see §8.4.

---

## 7. Scope integration

The existing scope ladder is `संभाग → जिला → लोकसभा → विधानसभा → तहसील → शहर →
भाग/वार्ड`. SUKET is ward-based, and the ladder's last level is already labelled
`भाग / वार्ड`.

Mapping: `houses.ward_no` filters against a user's `bhag` scope value when the
user is bound at that level; ward-level users see only their ward. Users bound
above ward see all 25. This reuses `voterPredicate` / `allowedBhags` patterns
without new concepts.

**Caveat:** SUKET wards (001–025) and AC 188 भाग (1–266) are different
numbering systems in different constituencies. A user scoped to भाग 7 of AC 188
should *not* automatically see SUKET ward 7. The house queries need their own
scope resolution keyed on a `dataset` discriminator, or SUKET needs its own
assembly value in the ladder. Flagged in §8.5.

---

## 8. Open questions

1. **The 35 ambiguous `digits space digits` values** — `20 1`, `1 4`, `193 8`,
   `471 9`, `893 7`, `1712 4` … Is the space noise (so `20 1` = house 201), or
   a mis-split? Plan currently flags them for review rather than guessing.

2. **Bottom navigation** — the mock's legend shows a flow diagram, not a
   persistent bottom bar, but earlier mocks did show one. The app already
   has a sidebar with the same destinations. Confirm: sidebar only (assumed),
   or add a bottom bar for this module?

3. **परिवार सर्वेक्षण stepper shows 4 steps, only 2 pages of questions were
   specified** (screens 8 and 9, covering questions 1–6). Screen 13's
   stepper also shows 4 positions. Is step 3 members review and step 4 the
   सारांश itself (i.e. the "4 steps" are 1=page1, 2=page2, 3=सदस्य review,
   4=सारांश), or are pages 8/9 both "step 1" and "step 2" of a 4-step form
   with two more question pages not yet designed? **Plan currently assumes**
   the wizard has exactly the two content pages given, and सारांश (13) is a
   separate screen reached only via त्वरित कार्य, not the automatic next step
   after page 2 — needs confirmation before building the stepper component.

4. **Member photos** — some mocks show a camera avatar on member forms. In
   scope? If yes, where should images be stored (local disk under `data/`,
   or base64 in SQLite)?

5. **Scope for SUKET** — is SUKET a separate constituency from AC 188 सांगोद?
   If so it needs its own `assembly` value so ward scoping doesn't collide with
   AC 188's भाग numbering.

6. **Re-import behaviour** — if the Excel is re-imported after field edits,
   should edits be preserved (merge on house key) or wiped (clean rebuild)?
   Plan assumes merge-preserve for `source='manual'` houses and all
   `influential_persons`/`house_surveys` rows, rebuild only for
   `source='roll'` houses/members.

7. **Relationship to the existing call list** — should `/houses` be a new
   sidebar entry alongside कॉल सूची, or replace it? They are different
   constituencies, so both can coexist, but the sidebar will need a clear
   label.

8. **मतदाताओं की संख्या editability** — screen 5 shows it as a plain field
   alongside कुल सदस्य, but it's derived from the imported roll for
   `source='roll'` houses. Plan assumes it becomes editable-with-override
   (§0.7) rather than purely derived. Confirm this is acceptable, since it
   means the number can drift from the actual roll count.

9. **"घर हटाएँ" (screen 4) semantics** — soft delete (hidden from घर सूची,
   recoverable) vs hard delete. Plan assumes soft delete (`is_deleted = 1`)
   to match the pattern already used for members and roll deletions.

---

## 9. Phasing

| Phase | Deliverable |
|---|---|
| 1 | Schema migration (incl. new tables/columns from §3) + import script + verification queries. No UI. |
| 2 | `GET /api/houses`, `/facets`, `/:id`, `/api/dashboard/stats` + screen 1 (डैशबोर्ड) and screen 2 (घर सूची, incl. "+ नया घर जोड़ें") + screen 3 (घर विवरण, read-only). |
| 3 | Screen 4 (त्वरित कार्य) shell + screen 5 (घर की जानकारी संपादित करें) + screens 10/11/12 (सदस्य सूची/जोड़ें/संपादित करें) + घर हटाएँ, कॉल/WhatsApp links. |
| 4 | Screens 6/7 (प्रभावशाली व्यक्ति सूची/जोड़ें/संपादित करें) — new table + routes + UI. |
| 5 | Screens 8/9 (परिवार सर्वेक्षण एडिट) + screen 13/14 (सारांश + ड्राफ्ट सहेजा गया) + `survey_status` recomputation + finalize route. |
| 6 | Search, ward filter, scope enforcement, and wiring every save handler through the shared त्वरित कार्य return rule (§0.2) end-to-end. |

Each phase ends with lint, production build, and a browser pass at 375px, as
with the existing modules.
