'use client';

import { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';
import { FirstUserModal } from '@/components/demo/FirstUserModal';

export default function TestModalPage() {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Modal Test Page
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Click the button below to see the FirstUserModal in action
      </Typography>
      
      <Button 
        variant="contained" 
        size="large"
        onClick={() => setOpen(true)}
      >
        Show FirstUserModal
      </Button>

      <FirstUserModal 
        open={open} 
        onClose={() => setOpen(false)} 
      />
    </Box>
  );
} 