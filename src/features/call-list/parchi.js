import { relationLabel, sexLabel } from './constants';

/** The voter slip text that gets shared. Keeps the fields the card no longer shows. */
export function parchiText(voter) {
  return [
    '*मतदाता पर्ची*',
    `मतदाता का नाम: ${voter.VNAME ?? '—'}`,
    `${relationLabel(voter.RELATION)}: ${voter.FNAME ?? '—'}`,
    `आयु: ${voter.AGE ?? '—'} | ${sexLabel(voter.SEX)}`,
    `पहचान पत्र क्रं: ${voter.IDCARD_NO ?? '—'}`,
    `मकान संख्या: ${voter.HNO ?? '—'}`,
    `भाग: ${voter.BHAG} | वोटर क्रं: ${voter.VOTERID}`,
    `क्षेत्र/अनुभाग: ${voter.AREACOLONY ?? '—'}`,
    'विधानसभा: सांगोद (188)',
  ].join('\n');
}

/** First usable number on the row, or null — today this is null for every voter. */
export function voterPhone(voter) {
  const raw = voter.PHONE1 || voter.PHONE2 || '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.length === 10 ? `91${digits}` : digits; // wa.me needs a country code
}

/**
 * Share the slip. Uses the OS share sheet when the browser has one, and falls
 * back to WhatsApp's contact picker (wa.me with no number) otherwise — both
 * work without a stored phone number.
 */
export async function shareParchi(voter) {
  const text = parchiText(voter);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'मतदाता पर्ची', text });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
      // Fall through to WhatsApp on any other share failure.
    }
  }
  openWhatsApp(voter);
  return 'whatsapp';
}

/** wa.me with a number opens that chat; without one, WhatsApp asks who to send to. */
export function openWhatsApp(voter) {
  const phone = voterPhone(voter);
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(parchiText(voter))}`
    : `https://wa.me/?text=${encodeURIComponent(parchiText(voter))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
