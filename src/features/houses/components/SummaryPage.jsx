'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchHouse, finalizeHouse } from '../api';
import { politicalPartyLabel, cmSatisfactionLabel, developmentSummary } from '../constants';
import FormActions from './shared/FormActions';

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.6 }}>
      <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.text, textAlign: 'right' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

/** सारांश (एडिट स्क्रीन) — screen 13 — and ड्राफ्ट सहेजा गया — screen 14. */
export default function SummaryPage({ houseId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchHouse(houseId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [houseId]);

  async function saveAndContinue() {
    setSaving(true);
    setError(null);
    try {
      await finalizeHouse(houseId);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const house = data?.house;
  const survey = data?.survey;

  return (
    <AppChrome title="सारांश (एडिट स्क्रीन)">
      {!data && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {data && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange, mb: 0.5 }}>
                घर जानकारी
              </Typography>
              <Row label="घर संख्या" value={house.house_no ?? house.house_no_raw} />
              <Row label="परिवार प्रमुख" value={house.head_name} />
              <Row label="क्षेत्र / मोहल्ला" value={house.area} />
              <Row label="कुल सदस्य" value={house.total_members ?? house.voter_count} />
              <Row label="मतदाताओं की संख्या" value={house.voter_count} />
            </Paper>

            <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange, mb: 0.5 }}>
                परिवार सर्वेक्षण सारांश
              </Typography>
              <Row label="राजनीतिक झुकाव" value={politicalPartyLabel(survey?.political_party)} />
              <Row label="विकास कार्य के लिए" value={developmentSummary(survey?.development_works)} />
              <Row label="CM से संतुष्टि" value={cmSatisfactionLabel(survey?.cm_satisfaction)} />
              <Row label="कॉलोनी कार्यकर्ता" value={survey?.colony_workers} />
              <Row label="ब्लॉक कार्यकर्ता" value={survey?.block_workers} />
              {survey?.remarks && (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: 12, color: colors.textMuted }}>सर्वेक्षण टिप्पणी:</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, fontStyle: 'italic' }}>
                    “{survey.remarks}”
                  </Typography>
                </Box>
              )}
            </Paper>

            {error && <Alert severity="error">{error}</Alert>}
          </Box>

          <FormActions
            cancelLabel="← पिछला"
            saveLabel="सहेजें और आगे बढ़ें"
            onCancel={() => router.push(`/houses/${houseId}?qa=1`)}
            onSave={saveAndContinue}
            saving={saving}
          />
        </Box>
      )}

      <Dialog open={saved} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: '#2e7d32', mb: 1.5 }} />
          <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2.5 }}>
            ड्राफ्ट सफलतापूर्वक सहेज दिया गया है।
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => router.push(`/houses/${houseId}?qa=1`)}
              variant="contained"
              fullWidth
              sx={{ textTransform: 'none' }}
            >
              जारी रखें
            </Button>
            <Button
              onClick={() => router.push('/houses/list')}
              variant="outlined"
              fullWidth
              sx={{ textTransform: 'none' }}
            >
              घर सूची पर जाएँ
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </AppChrome>
  );
}
