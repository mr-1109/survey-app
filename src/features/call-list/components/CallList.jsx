'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { useSettingsContext } from '@shared/settings/SettingsContext';
import FilterBar from './FilterBar';
import FeedbackTabs from './FeedbackTabs';
import VoterCard from './VoterCard';
import { useVoters } from '../hooks/useVoters';
import { fetchFacets } from '../api/voters';

const DEFAULT_BHAG = 1; // never open on an unfiltered 201k-row list

export default function CallList() {
  const [bhag, setBhag] = useState(DEFAULT_BHAG);
  const [kshetra, setKshetra] = useState('');
  const [feedback, setFeedback] = useState('all');
  const [q, setQ] = useState('');
  const [facets, setFacets] = useState({ bhagList: [], kshetraList: [], bhagKshetra: {} });
  const [facetsError, setFacetsError] = useState(null);

  const { settings, loaded: settingsLoaded } = useSettingsContext();

  useEffect(() => {
    fetchFacets().then(setFacets).catch((err) => setFacetsError(err.message));
  }, []);

  // Open on the booth chosen in settings, once localStorage has been read.
  useEffect(() => {
    if (settingsLoaded) setBhag(settings.defaultBhag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  const {
    voters,
    hasMore,
    loading,
    error,
    showMore,
    setFeedback: saveFeedback,
    clearError,
  } = useVoters({ bhag, kshetra, feedback, q, pageSize: settings.pageSize });

  const handleBhagChange = useCallback((next) => {
    setBhag(next);
    if (next === 'all') setQ(''); // search requires a booth
  }, []);

  /** A booth belongs to one क्षेत्र only, so changing zone may orphan it. */
  const handleKshetraChange = useCallback(
    (next) => {
      setKshetra(next);
      if (!next || bhag === 'all' || facets.bhagKshetra[bhag] === next) return;
      const firstInZone = facets.bhagList.find((b) => facets.bhagKshetra[b] === next);
      if (firstInZone !== undefined) {
        setBhag(firstInZone);
        setQ('');
      }
    },
    [bhag, facets],
  );

  const subHeader = (
    <>
      <FilterBar
        bhag={bhag}
        kshetra={kshetra}
        q={q}
        bhagList={facets.bhagList}
        kshetraList={facets.kshetraList}
        bhagKshetra={facets.bhagKshetra}
        onBhagChange={handleBhagChange}
        onKshetraChange={handleKshetraChange}
        onQChange={setQ}
      />
      <FeedbackTabs value={feedback} onChange={setFeedback} />
    </>
  );

  return (
    <AppChrome title="कॉल सूची : विधानसभा - सांगोद" subHeader={subHeader}>
      <Box sx={{ flex: 1, px: 1, py: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {loading && voters.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {/* An empty list after an error means "not connected", not "no voters". */}
        {!loading && voters.length === 0 && (
          <Typography
            sx={{
              textAlign: 'center',
              color: error ? '#c62828' : colors.textMuted,
              fontSize: 14,
              py: 6,
              px: 2,
            }}
          >
            {error || 'कोई मतदाता नहीं मिला'}
          </Typography>
        )}

        {voters.map((voter) => (
          <VoterCard key={voter.VLISTID} voter={voter} onFeedbackChange={saveFeedback} />
        ))}

        {hasMore && (
          <Button
            onClick={showMore}
            disabled={loading}
            variant="contained"
            sx={{ alignSelf: 'center', my: 1.5, px: 3, borderRadius: 5, textTransform: 'none' }}
          >
            {loading ? 'लोड हो रहा है…' : 'और देखें'}
          </Button>
        )}
      </Box>

      <Snackbar
        open={Boolean(error || facetsError)}
        autoHideDuration={5000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError} sx={{ width: '100%' }}>
          {error || facetsError}
        </Alert>
      </Snackbar>
    </AppChrome>
  );
}
