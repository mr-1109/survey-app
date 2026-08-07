'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';

const SELECT_SX = {
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  minWidth: 110,
  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
  '.MuiSvgIcon-root': { color: '#fff' },
};

export default function HouseFilterBar({ ward, part, wardList, bhagList, q, onWardChange, onPartChange, onQChange }) {
  const [searchOpen, setSearchOpen] = useState(Boolean(q));
  const [term, setTerm] = useState(q);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed === q) return undefined;
    const id = setTimeout(() => onQChange(trimmed), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  function toggleSearch() {
    if (searchOpen) { setTerm(''); onQChange(''); }
    setSearchOpen(v => !v);
  }

  return (
    <Box sx={{ bgcolor: colors.orange, px: 1.25, pb: 1, pt: 0.75 }}>
      {/* वार्ड + भाग dropdowns + search toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Select
          value={ward}
          onChange={e => onWardChange(e.target.value)}
          size="small"
          sx={SELECT_SX}
          displayEmpty
        >
          <MenuItem value="all">सभी वार्ड</MenuItem>
          {wardList.map(w => (
            <MenuItem key={w.ward} value={w.ward}>वार्ड {w.ward}</MenuItem>
          ))}
        </Select>

        <Select
          value={part}
          onChange={e => onPartChange(e.target.value)}
          size="small"
          sx={{ ...SELECT_SX, minWidth: 90 }}
          displayEmpty
        >
          <MenuItem value="all">सभी भाग</MenuItem>
          {bhagList.map(b => (
            <MenuItem key={b.bhag} value={b.bhag}>भाग {b.bhag}</MenuItem>
          ))}
        </Select>

        <Box sx={{ flex: 1 }} />

        <IconButton
          onClick={toggleSearch}
          size="small"
          aria-label={searchOpen ? 'खोज बंद करें' : 'खोजें'}
          sx={{ color: '#fff' }}
        >
          {searchOpen ? <CloseIcon /> : <SearchIcon />}
        </IconButton>
      </Box>

      {searchOpen && (
        <TextField
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="घर नं / परिवार मुखिया / सदस्य खोजें..."
          size="small"
          fullWidth
          autoFocus
          sx={{
            mt: 0.75,
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
