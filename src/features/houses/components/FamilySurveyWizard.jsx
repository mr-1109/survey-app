'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchHouse, saveSurvey } from '../api';
import { POLITICAL_PARTY_OPTIONS, DEVELOPMENT_WORK_OPTIONS, CM_SATISFACTION_OPTIONS, parseJsonArray } from '../constants';
import FormActions from './shared/FormActions';
import LimitedTextarea from './shared/LimitedTextarea';
import StepIndicator from './shared/StepIndicator';

const EMPTY = {
  political_party: '',
  political_party_other: '',
  development_works: [],
  development_other: '',
  cm_satisfaction: '',
  colony_workers: '',
  block_workers: '',
  remarks: '',
};

/** परिवार सर्वेक्षण (एडिट) — screens 8 & 9, a 2-page wizard. */
export default function FamilySurveyWizard({ houseId }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHouse(houseId)
      .then((d) => {
        const s = d.survey;
        setForm({
          political_party: s?.political_party ?? '',
          political_party_other: s?.political_party_other ?? '',
          development_works: parseJsonArray(s?.development_works),
          development_other: s?.development_other ?? '',
          cm_satisfaction: s?.cm_satisfaction ?? '',
          colony_workers: s?.colony_workers ?? '',
          block_workers: s?.block_workers ?? '',
          remarks: s?.remarks ?? '',
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [houseId]);

  function toggleDevelopment(key) {
    setForm((f) => ({
      ...f,
      development_works: f.development_works.includes(key)
        ? f.development_works.filter((k) => k !== key)
        : [...f.development_works, key],
    }));
  }

  async function saveAndReturn() {
    setSaving(true);
    setError(null);
    try {
      await saveSurvey(houseId, form);
      router.push(`/houses/${houseId}?qa=1`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppChrome title={`परिवार सर्वेक्षण (एडिट) — पृष्ठ ${step}`}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <StepIndicator total={4} current={step} />

          <Box sx={{ flex: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {step === 1 && (
              <>
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 0.5 }}>
                    1. इस परिवार का राजनीतिक झुकाव किस पार्टी की ओर है?*
                  </Typography>
                  <RadioGroup
                    value={form.political_party}
                    onChange={(e) => setForm((f) => ({ ...f, political_party: e.target.value }))}
                  >
                    {POLITICAL_PARTY_OPTIONS.map((o) => (
                      <FormControlLabel key={o.value} value={o.value} control={<Radio size="small" />} label={o.label} />
                    ))}
                  </RadioGroup>
                  {form.political_party === 'other' && (
                    <TextField
                      placeholder="पार्टी का नाम लिखें..."
                      value={form.political_party_other}
                      onChange={(e) => setForm((f) => ({ ...f, political_party_other: e.target.value }))}
                      size="small"
                      fullWidth
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 0.5 }}>
                    2. विकास कार्यों के लिए (एक या अधिक चुनें)
                  </Typography>
                  {DEVELOPMENT_WORK_OPTIONS.map((o) => (
                    <FormControlLabel
                      key={o.value}
                      control={
                        <Checkbox
                          size="small"
                          checked={form.development_works.includes(o.value)}
                          onChange={() => toggleDevelopment(o.value)}
                        />
                      }
                      label={o.label}
                      sx={{ display: 'flex' }}
                    />
                  ))}
                  <TextField
                    placeholder="अन्य विवरण लिखें..."
                    value={form.development_other}
                    onChange={(e) => setForm((f) => ({ ...f, development_other: e.target.value }))}
                    size="small"
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                </Box>
              </>
            )}

            {step === 2 && (
              <>
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 0.5 }}>
                    3. मुख्यमंत्री के कार्यों से आप कितने संतुष्ट हैं?
                  </Typography>
                  <RadioGroup
                    value={form.cm_satisfaction}
                    onChange={(e) => setForm((f) => ({ ...f, cm_satisfaction: e.target.value }))}
                  >
                    {CM_SATISFACTION_OPTIONS.map((o) => (
                      <FormControlLabel key={o.value} value={o.value} control={<Radio size="small" />} label={o.label} />
                    ))}
                  </RadioGroup>
                </Box>

                <LimitedTextarea
                  label="4. स्थानीय वार्ड के अंतर्गत कॉलोनी में आप किन-किन कार्यकर्ताओं / पदाधिकारियों को जानते हैं?"
                  value={form.colony_workers}
                  onChange={(v) => setForm((f) => ({ ...f, colony_workers: v }))}
                  minRows={2}
                />
                <LimitedTextarea
                  label="5. स्थानीय वार्ड के अंतर्गत ब्लॉक में आप किन-किन कार्यकर्ताओं / पदाधिकारियों को जानते हैं?"
                  value={form.block_workers}
                  onChange={(v) => setForm((f) => ({ ...f, block_workers: v }))}
                  minRows={2}
                />
                <LimitedTextarea
                  label="6. सर्वेक्षण टिप्पणी"
                  value={form.remarks}
                  onChange={(v) => setForm((f) => ({ ...f, remarks: v }))}
                  minRows={3}
                />
              </>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Box>

          <FormActions
            cancelLabel="← पिछला"
            saveLabel={step === 1 ? 'अगला →' : saving ? 'सहेजा जा रहा…' : 'सहेजें'}
            onCancel={() => (step === 1 ? router.push(`/houses/${houseId}?qa=1`) : setStep(1))}
            onSave={() => (step === 1 ? setStep(2) : saveAndReturn())}
            saving={saving}
          />
        </Box>
      )}
    </AppChrome>
  );
}
