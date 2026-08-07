/**
 * House Number normalisation for the SUKET roll.
 *
 * Two houses are the same when WARD_NO + PART_NO + Page + normalised house
 * number match. The raw column is OCR output, so the same house is spelled
 * several ways: "1" / "01", "102क" / "102 क", "30-क", "1699(क)",
 * "एच.नं. 1041". Devanagari suffixes are real sub-house numbers — 9क is a
 * different house from 9 — so they are always preserved.
 */

/** "एच.नं. 1041", "एचएनओ 330", "HN 431", "एम.के. 294" — the number follows. */
const HOUSE_NO_PREFIX =
  /^(?:एच\s*\.?\s*नं\s*\.?|एचएनओ|एच\s*एन\s*ओ|एम\s*\.?\s*के\s*\.?|मकान\s*नं\s*\.?|एच\s*\.?\s*एन\s*\.?|HN|H\s*\.?\s*No\s*\.?)\s*[-.:]?\s*/i;

const OCR_PUNCTUATION = /[“”‘’"'|[\]%_]/g;
const DEVANAGARI = 'ऀ-ॿ';

/**
 * The roll spells the same number both ways — house १७ and house 17 are one
 * address, entered by different people. MySQL's collation folds these together
 * so a GROUP BY sees one house; SQLite compares bytes and would see two. Fold
 * every Devanagari digit to ASCII at the edges of the system so both stores
 * agree and a worker can type either form.
 *
 * Only digits (U+0966–U+096F) are folded — Devanagari *letters* are real
 * sub-house suffixes (9क is not 9) and must survive untouched.
 */
export function foldDigits(input) {
  if (input === null || input === undefined) return input;
  return String(input).replace(/[\u0966-\u096F]/g, (d) =>
    String(d.charCodeAt(0) - 0x0966),
  );
}

export const HOUSE_OK = 'ok';
export const HOUSE_AMBIGUOUS = 'ambiguous'; // "20 1" — could be 201 or a mis-split
export const HOUSE_TEXT = 'text'; // "वार्ड नं 1", "जामा मस्जिद" — not a house number

/**
 * @returns {{ status: string, value: string|null, raw: string }}
 * `value` is null when the cell holds no usable house number.
 */
export function normaliseHouseNumber(input) {
  const raw = String(input ?? '').trim();
  let s = foldDigits(raw).replace(OCR_PUNCTUATION, '').trim();
  s = s.replace(HOUSE_NO_PREFIX, '').trim();

  // "30-क" and "1699(क)" are the same shape as "30क" / "1699क".
  s = s.replace(new RegExp(`^(\\d+)\\s*-\\s*([${DEVANAGARI}])`), '$1$2');
  s = s.replace(new RegExp(`^(\\d+)\\s*\\(\\s*([${DEVANAGARI}]+)\\s*\\)`), '$1$2');
  // "102 क" -> "102क". Only before a Devanagari suffix; a digit after the space
  // is genuinely ambiguous and handled below.
  s = s.replace(new RegExp(`^(\\d+)\\s+(?=[${DEVANAGARI}])`), '$1');
  s = s.trim();

  const match = /^(\d+)(.*)$/.exec(s);
  if (!match) return { status: HOUSE_TEXT, value: null, raw };

  const digits = match[1];
  let suffix = match[2].trim();

  // "20 1" — the space may be noise or a mis-split. Never guessed.
  if (/^\d/.test(suffix)) return { status: HOUSE_AMBIGUOUS, value: null, raw };

  // "1684के कोटा रोड" -> "1684के": drop trailing address words.
  suffix = suffix.replace(/\s.*$/, '');

  const number = digits.replace(/^0+(?=\d)/, '') || '0';
  return { status: HOUSE_OK, value: number + suffix, raw };
}

/**
 * For a TEXT-status cell, does the raw string read as a locality name
 * ("जामा मस्जिद") rather than a duplicated ward number ("वार्ड नं 1")? Only the
 * former is worth copying into ग्राम/मोहल्ला — the latter is a data-entry slip
 * with no address information in it.
 */
export function looksLikeLocality(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return false;
  if (/^वार्ड\s*न/i.test(s)) return false;
  return true;
}
