'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CallIcon from '@mui/icons-material/Call';
import { colors } from '@shared/theme/colors';
import { shareParchi, openWhatsApp, voterPhone } from '../parchi';

const WHATSAPP_GREEN = '#25d366';
const WHATSAPP_DARK = '#128c3e';

/**
 * पर्ची / call / WhatsApp row.
 *
 * पर्ची and WhatsApp work with no stored number — WhatsApp's own contact
 * picker chooses the recipient. Calling needs a number, and PHONE1/PHONE2 are
 * NULL on every row in this table, so the call button is disabled until one
 * exists rather than opening a `tel:` link that dials nothing.
 */
export default function VoterActions({ voter }) {
  const phone = voterPhone(voter);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25 }}>
      <Button
        onClick={() => shareParchi(voter)}
        variant="outlined"
        startIcon={<WhatsAppIcon sx={{ color: WHATSAPP_GREEN }} />}
        sx={{
          flex: 1,
          py: 0.6,
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'none',
          color: colors.text,
          borderColor: WHATSAPP_GREEN,
          '&:hover': { borderColor: WHATSAPP_DARK, bgcolor: 'rgba(37,211,102,0.06)' },
        }}
      >
        वोटर पर्ची भेजें
      </Button>

      <Tooltip title={phone ? `कॉल करें ${phone}` : 'इस मतदाता का मोबाइल नंबर उपलब्ध नहीं है'}>
        <Box component="span">
          <Button
            component={phone ? 'a' : 'button'}
            href={phone ? `tel:${phone}` : undefined}
            disabled={!phone}
            variant="outlined"
            aria-label="कॉल करें"
            sx={{
              minWidth: 56,
              py: 0.6,
              borderColor: colors.border,
              color: '#1e88e5',
              '&:hover': { borderColor: '#1e88e5', bgcolor: 'rgba(30,136,229,0.06)' },
            }}
          >
            <CallIcon sx={{ fontSize: 20 }} />
          </Button>
        </Box>
      </Tooltip>

      <Button
        onClick={() => openWhatsApp(voter)}
        variant="contained"
        aria-label="व्हाट्सएप पर भेजें"
        sx={{
          minWidth: 56,
          py: 0.6,
          bgcolor: WHATSAPP_DARK,
          '&:hover': { bgcolor: '#0f7433' },
        }}
      >
        <WhatsAppIcon sx={{ fontSize: 20, color: '#fff' }} />
      </Button>
    </Box>
  );
}
