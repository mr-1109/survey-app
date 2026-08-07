'use client';

import { memo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { colors } from '@shared/theme/colors';
import { FEEDBACK_OPTIONS, feedbackLabel, relationLabel } from '../constants';
import VoterActions from './VoterActions';

function Row({ icon: Icon, label, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.4 }}>
      <Icon sx={{ fontSize: 16, color: colors.orange, mt: '2px', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>
        {label} - <Box component="span" sx={{ fontWeight: 700, color: colors.text }}>{children}</Box>
      </Typography>
    </Box>
  );
}

function VoterCard({ voter, onFeedbackChange }) {
  const value = voter.FEEDBACK_STATUS ?? ''; // never undefined — keeps the RadioGroup controlled

  return (
    <Paper
      sx={{
        bgcolor: colors.cardBg,
        borderRadius: 2,
        p: 1.5,
        boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box
          sx={{
            bgcolor: colors.orangeTintStrong,
            color: colors.orangeDark,
            fontSize: 12,
            fontWeight: 600,
            px: 1,
            py: 0.4,
            borderRadius: 1,
          }}
        >
          वोटर क्रं : {voter.VOTERID}
        </Box>
        <Box
          sx={{
            bgcolor: colors.orange,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            px: 1,
            py: 0.4,
            borderRadius: 1,
          }}
        >
          {feedbackLabel(voter.FEEDBACK_STATUS)}
        </Box>
      </Box>

      <Row icon={PersonOutlineIcon} label="मतदाता का नाम">{voter.VNAME || '—'}</Row>
      <Row icon={GroupOutlinedIcon} label={relationLabel(voter.RELATION)}>{voter.FNAME || '—'}</Row>
      <Row icon={HomeOutlinedIcon} label="मकान संख्या">
        {voter.HNO || '—'}
        <Box component="span" sx={{ fontWeight: 400, color: colors.textMuted }}>
          {' '}[ भाग - <Box component="span" sx={{ fontWeight: 700, color: colors.text }}>{voter.BHAG}</Box> ]
        </Box>
      </Row>
      <Row icon={PlaceOutlinedIcon} label="क्षेत्र/अनुभाग">{voter.AREACOLONY || '—'}</Row>

      <VoterActions voter={voter} />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          mt: 1,
          pt: 1,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: colors.blue, mr: 1 }}>
          फीडबैक :
        </Typography>
        <RadioGroup
          row
          value={value}
          onChange={(event) => onFeedbackChange(voter.VLISTID, event.target.value)}
          sx={{ gap: 0 }}
        >
          {FEEDBACK_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio size="small" sx={{ p: 0.4 }} />}
              label={option.label}
              sx={{
                mr: 0.75,
                ml: 0,
                '& .MuiFormControlLabel-label': {
                  fontSize: 12,
                  color: value === option.value ? colors.orange : colors.textMuted,
                  fontWeight: value === option.value ? 700 : 400,
                },
              }}
            />
          ))}
        </RadioGroup>
      </Box>
    </Paper>
  );
}

export default memo(VoterCard);
