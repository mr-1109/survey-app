'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import {
  LEVELS,
  LEVEL_KEYS,
  emptyGrant,
  lockedValues,
  normaliseScope,
  scopeSummary,
} from '@shared/scope';

/**
 * क्षेत्राधिकार picker.
 *
 * Each level is a multi-select, so one user can hold वार्ड 38, 40 and 42. A
 * whole ladder is one "grant", and more can be added — that is what keeps
 * भाग 1 of वार्ड 38 plus भाग 5 of वार्ड 40 from also granting भाग 5 of वार्ड 38,
 * which per-level sets alone would imply.
 *
 * Levels reveal one at a time: a level with no values in the roll shows blank
 * and lets the next through, while a level that has values holds the ladder
 * until something is picked. Options come from the server already bounded by
 * the creator's own scope, so an escalation cannot even be expressed here.
 */
/**
 * Shapes a stored scope for the form, keeping grants that are still empty.
 * `normaliseScope` drops those — right for storage, wrong here, where a grant
 * the user just added has nothing in it yet and would disappear on the spot.
 * Blank grants are dropped again server-side when the form is saved.
 */
function formGrants(scope) {
  const list = Array.isArray(scope) ? scope : normaliseScope(scope);
  const shaped = list.map((item) => {
    const grant = emptyGrant();
    for (const key of LEVEL_KEYS) {
      const raw = item?.[key];
      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      grant[key] = [...new Set(values.filter((v) => v !== null && v !== '').map(String))];
    }
    return grant;
  });
  return shaped.length ? shaped : [emptyGrant()];
}

export default function ScopeFields({
  scope,
  onScopeChange,
  viewerScope = [],
  viewerUnrestricted = true,
}) {
  const grants = useMemo(() => formGrants(scope), [scope]);

  // Levels the creator pins to a single value are theirs to keep, not to choose.
  const locked = useMemo(
    () => (viewerUnrestricted ? {} : lockedValues(viewerScope)),
    [viewerScope, viewerUnrestricted],
  );

  const setGrants = useCallback((next) => onScopeChange(next), [onScopeChange]);

  return (
    <Box
      sx={{
        mt: 2,
        pt: 1.5,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange }}>
          क्षेत्राधिकार (Scope)
        </Typography>
        <Typography sx={{ fontSize: 11, color: colors.textMuted }}>
          एक स्तर पर एक से अधिक विकल्प चुन सकते हैं। खाली छोड़ने पर उस स्तर की कोई सीमा नहीं लगेगी।
        </Typography>
        {!viewerUnrestricted && (
          <Typography sx={{ fontSize: 11, color: colors.orangeDark, mt: 0.25 }}>
            आपका क्षेत्र: {scopeSummary(viewerScope)} — इससे बाहर नहीं दे सकते
          </Typography>
        )}
      </Box>

      {grants.map((grant, i) => (
        <GrantBlock
          key={i}
          grant={grant}
          index={i}
          total={grants.length}
          locked={locked}
          onChange={(next) => setGrants(grants.map((g, j) => (j === i ? next : g)))}
          onRemove={() => setGrants(grants.filter((_, j) => j !== i))}
        />
      ))}

      <Button
        onClick={() => setGrants([...grants, emptyGrant()])}
        size="small"
        startIcon={<AddIcon />}
        sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: 12.5, color: colors.blue }}
      >
        और क्षेत्र जोड़ें
      </Button>
    </Box>
  );
}

function GrantBlock({ grant, index, total, locked, onChange, onRemove }) {
  const [facets, setFacets] = useState({});
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Refetch whenever a level that narrows the ones below it changes.
  const selectionKey = LEVEL_KEYS.map((k) => (grant[k] ?? []).join(',')).join('|');

  useEffect(() => {
    const params = new URLSearchParams();
    for (const key of LEVEL_KEYS) {
      for (const value of grant[key] ?? []) params.append(key, value);
    }

    let alive = true;
    fetch(`/api/scope/facets?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) setError(d.error);
        else {
          setFacets(d);
          setError(null);
        }
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  /**
   * Adding a value at one level only widens what the levels below may hold, so
   * their picks stay valid and are kept — otherwise adding a second वार्ड would
   * silently wipe a भाग the user had already chosen. Dropping a value can strand
   * the levels below it, so those are cleared.
   */
  function pick(key, values) {
    const next = { ...grant, [key]: values };
    const kept = (grant[key] ?? []).every((v) => values.includes(v));
    if (!kept) {
      for (const k of LEVEL_KEYS.slice(LEVEL_KEYS.indexOf(key) + 1)) next[k] = [];
    }
    onChange(next);
  }

  /**
   * The ladder is revealed a step at a time. A level with no values in the roll
   * can't be chosen from, so it lets the next level through immediately; a
   * level that does have values holds the ladder until one is picked.
   */
  const visible = useMemo(() => {
    const shown = [];
    for (const level of LEVELS) {
      shown.push(level);
      const hasOptions = (facets[level.key] ?? []).length > 0;
      // A locked level is already decided by the creator's own scope, so it
      // settles the ladder even though the grant carries no value for it — the
      // server fills it from the creator at save time.
      const settled = (grant[level.key] ?? []).length > 0 || locked[level.key] !== undefined;
      if (hasOptions && !settled) break;
    }
    return shown;
  }, [facets, selectionKey, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  function renderLevel({ key, label }) {
    const options = facets[key] ?? [];
    const values = grant[key] ?? [];
    const lockedValue = locked[key];

    if (lockedValue !== undefined) {
      return (
        <TextField
          key={key}
          label={label}
          value={lockedValue}
          size="small"
          fullWidth
          disabled
          helperText="आपके क्षेत्र से"
        />
      );
    }

    // No values in the roll for this level — leave it blank and hand-editable.
    if (!options.length) {
      return (
        <TextField
          key={key}
          label={label}
          value={values[0] ?? ''}
          onChange={(e) => pick(key, e.target.value ? [e.target.value] : [])}
          size="small"
          fullWidth
          helperText="डेटा में उपलब्ध नहीं"
        />
      );
    }

    return (
      <TextField
        key={key}
        select
        label={label}
        value={values.filter((v) => options.includes(v))}
        onChange={(e) =>
          pick(key, typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
        }
        size="small"
        fullWidth
        helperText={values.length ? `${values.length} चुने गए` : `${options.length} विकल्प`}
        SelectProps={{
          multiple: true,
          renderValue: (selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((v) => (
                <Chip key={v} label={v} size="small" sx={{ height: 20, fontSize: 11 }} />
              ))}
            </Box>
          ),
          MenuProps: { PaperProps: { sx: { maxHeight: 320 } } },
        }}
      >
        {options.map((o) => (
          <MenuItem key={o} value={o} dense>
            <Checkbox size="small" checked={values.includes(o)} sx={{ py: 0 }} />
            <ListItemText primaryTypographyProps={{ fontSize: 13 }} primary={o} />
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <Box
      sx={{
        border: `1px solid ${colors.border}`,
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        bgcolor: total > 1 ? colors.orangeTint : 'transparent',
      }}
    >
      {total > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: colors.textMuted, flex: 1 }}>
            क्षेत्र {index + 1}
          </Typography>
          <IconButton onClick={onRemove} size="small" aria-label="हटाएँ">
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      {error && <Typography sx={{ fontSize: 11, color: '#c62828' }}>{error}</Typography>}

      {/* Rendering before the first load would flash the whole ladder, since a
          level with no options yet looks the same as one the roll can't fill. */}
      {loaded ? (
        visible.map(renderLevel)
      ) : (
        <Typography sx={{ fontSize: 12, color: colors.textMuted }}>लोड हो रहा है…</Typography>
      )}
    </Box>
  );
}
