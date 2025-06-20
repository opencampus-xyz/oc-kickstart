"use client";
import { useEffect, useState } from 'react';
import { Button, TextField, Typography, Paper, Box, Alert, Chip, Divider, Stack } from '@mui/material';
import { Save, Download, Refresh, Info } from '@mui/icons-material';
import configManager from '../../config/configManager';

export default function ConfigEditorPage() {
  const [formData, setFormData] = useState({
    appTitle: '',
    logoUrl: '',
    theme: 'light'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [configSource, setConfigSource] = useState('loading');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await configManager.getConfig();
      setFormData(config);
      const source = await configManager.getConfigSource();
      setConfigSource(source);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    }
  };


  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const result = await configManager.saveConfig(formData);
      
      setMessage({
        type: 'success',
        text: result.source === 'backend' 
          ? 'Configuration saved to backend and localStorage.'
          : result.source === 'indexeddb'
          ? 'Configuration saved to localStorage (IndexedDB mode).'
          : 'Configuration saved to localStorage (backend not available).'
      });

      const newSource = await configManager.getConfigSource();
      setConfigSource(newSource);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const defaultConfig = configManager.resetConfig();
      setFormData(defaultConfig);
      await loadConfig();
      setMessage({ type: 'info', text: 'Configuration reset to default values.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset configuration' });
    }
  };

  const handleExport = () => {
    try {
      configManager.exportConfig(formData);
      setMessage({ type: 'success', text: 'Configuration exported as config.json' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export configuration' });
    }
  };

  const getSourceText = (source) => {
    switch (source) {
      case 'backend': return 'Backend API';
      case 'indexeddb': return 'IndexedDB Mode';
      case 'localStorage': return 'Local Storage';
      case 'default': return 'Default Config';
      default: return 'Loading...';
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'backend': return 'success';
      case 'indexeddb': return 'info';
      case 'localStorage': return 'warning';
      case 'default': return 'default';
      default: return 'default';
    }
  };

  if (configSource === 'loading') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading configuration...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            App Configuration
          </Typography>
          <Chip
            icon={<Info />}
            label={getSourceText(configSource)}
            color={getSourceColor(configSource)}
            variant="outlined"
          />
        </Box>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Edit your application configuration settings below. The system will automatically
          use the appropriate storage method based on your current setup.
        </Typography>

        <Stack spacing={3}>
          <TextField
            fullWidth
            label="App Title"
            value={formData.appTitle}
            onChange={(e) => setFormData({ ...formData, appTitle: e.target.value })}
            helperText="The title displayed in the browser tab and app header"
          />

          <TextField
            fullWidth
            label="Logo URL"
            value={formData.logoUrl}
            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            helperText="Path to your logo image (relative to public folder)"
          />

          <TextField
            fullWidth
            select
            label="Theme"
            value={formData.theme}
            onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
            helperText="The default theme for the application"
            SelectProps={{
              native: true,
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </TextField>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
          >
            Reset to Defaults
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export Config
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>
          Current Configuration
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <pre style={{ margin: 0, fontSize: '0.875rem' }}>
            {JSON.stringify(formData, null, 2)}
          </pre>
        </Paper>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>How it works:</strong><br/>
            • <strong>Backend Mode:</strong> When <code>NEXT_PUBLIC_BACKEND_URL</code> is set, config is saved to your backend API<br/>
            • <strong>IndexedDB Mode:</strong> When <code>NEXT_PUBLIC_DB_MODE=indexeddb</code>, config is saved to browser storage<br/>
            • <strong>Export:</strong> Download the config as a JSON file to manually update your config.json<br/>
            • <strong>Fallback:</strong> If backend is unavailable, config is automatically saved to localStorage
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
} 