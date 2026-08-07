'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';

const selectSx = {
  flex: 1,
  minWidth: 0,
  bgcolor: '#fff',
  borderRadius: 1,
  fontSize: 13,
  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
  '& .MuiSelect-select': { py: 0.9, px: 1.25 },
};

const menuProps = { PaperProps: { sx: { maxHeight: 320 } } };

export default function FilterBar({
  bhag,
  kshetra,
  q,
  bhagList,
  kshetraList,
  bhagKshetra,
  onBhagChange,
  onKshetraChange,
  onQChange,
}) {
  const [open, setOpen] = useState(Boolean(q));
  const [term, setTerm] = useState(q);

  // Debounce so a booth-scoped LIKE query does not fire on every keystroke.
  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed === q) return undefined;
    const id = setTimeout(() => onQChange(trimmed.length >= 2 ? trimmed : ''), 350);
    return () => clearTimeout(id);
  }, [term, q, onQChange]);

  const searchDisabled = bhag === 'all';

  // Each booth sits in exactly one क्षेत्र, so once a zone is picked the other
  // zones' booths can only ever return zero rows — leave them out.
  const inZone = kshetra ? bhagList.filter((b) => bhagKshetra[b] === kshetra) : bhagList;

  // The page opens on भाग 1 before /facets has answered — keep the selected
  // value in the option list so MUI does not warn about an out-of-range value.
  const bhagOptions = bhag !== 'all' && !inZone.includes(bhag) ? [bhag, ...inZone] : inZone;
  const kshetraOptions =
    kshetra && !kshetraList.includes(kshetra) ? [kshetra, ...kshetraList] : kshetraList;

  function toggleSearch() {
    if (open) {
      setTerm('');
      onQChange('');
    }
    setOpen((prev) => !prev);
  }

  return (
    <Box sx={{ bgcolor: colors.orange, px: 1.25, pb: 1.25, pt: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>भाग</Typography>
          <Select
            value={bhag}
            onChange={(e) => onBhagChange(e.target.value)}
            size="small"
            sx={selectSx}
            MenuProps={menuProps}
          >
            <MenuItem value="all">सभी</MenuItem>
            {bhagOptions.map((b) => (
              <MenuItem key={b} value={b}>{b}</MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1.4, minWidth: 0 }}>
          <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>क्षेत्र</Typography>
          <Select
            value={kshetra}
            onChange={(e) => onKshetraChange(e.target.value)}
            size="small"
            displayEmpty
            sx={selectSx}
            MenuProps={menuProps}
          >
            <MenuItem value="">सभी</MenuItem>
            {kshetraOptions.map((k) => (
              <MenuItem key={k} value={k}>{k}</MenuItem>
            ))}
          </Select>
        </Box>

        <IconButton
          onClick={toggleSearch}
          size="small"
          aria-label={open ? 'खोज बंद करें' : 'खोजें'}
          sx={{ color: '#fff' }}
        >
          {open ? <CloseIcon /> : <SearchIcon />}
        </IconButton>
      </Box>

      {open && (
        <TextField
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={searchDisabled ? 'पहले भाग चुनें' : 'नाम या पिता/पति का नाम'}
          disabled={searchDisabled}
          size="small"
          fullWidth
          autoFocus={!searchDisabled}
          sx={{
            mt: 1,
            bgcolor: '#fff',
            borderRadius: 1,
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& .MuiInputBase-input': { fontSize: 13, py: 1 },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: colors.textMuted }} />
              </InputAdornment>
            ),
          }}
        />
      )}
    </Box>
  );
}
