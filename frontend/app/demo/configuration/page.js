"use client";
import { useEffect, useState } from 'react';
import { Button, TextField, Typography, Paper, Box, Alert, Chip, Divider, Stack } from '@mui/material';
import { Save, Download, Refresh, Info } from '@mui/icons-material';
import { isDemoMode } from '../../../utils';
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { useUser } from "@/providers/UserProvider";
import { useRouter } from "next/navigation";
import { configManager } from '../../../config/configManager';

export default function ConfigEditorPage() {
  const [formData, setFormData] = useState({
    appTitle: '',
    logoUrl: '',
    theme: 'light'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [logoUrlError, setLogoUrlError] = useState('');
  const { isInitialized, isMasterAdmin } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    
    if (!isDemoMode() || !isMasterAdmin) {
      router.push("/home");
      return;
    }
    
    if (!isMasterAdmin) {
      router.push("/home");
    }
  }, [isMasterAdmin, router, isInitialized]);

  useEffect(() => {
    if (isMasterAdmin && isInitialized && isDemoMode()) {
      loadConfig();
    }
  }, [isMasterAdmin, isInitialized]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const storedConfig = localStorage.getItem('appConfig');
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        setFormData(config);
      } else {
        const defaultConfig = {
          appTitle: "OC Kickstart",
          logoUrl: "/assets/logo.svg",
          theme: "light"
        };
        setFormData(defaultConfig);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      setMessage({ type: 'error', text: `Failed to load configuration: ${error.message}` });
      setFormData({
        appTitle: "OC Kickstart",
        logoUrl: "/assets/logo.svg",
        theme: "light"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateLogoUrl = (url) => {
    if (!url) return '';
    
    if (url.startsWith('/')) {
      return '';
    }
    
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        return '';
      } else {
        return 'URL must use HTTP or HTTPS protocol';
      }
    } catch (error) {
      return 'Please enter a valid URL or relative path (starting with /)';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      localStorage.setItem('appConfig', JSON.stringify(formData));
      setMessage({
        type: 'success',
        text: 'Configuration saved to localStorage (Demo mode).'
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setMessage({ type: 'error', text: `Failed to save configuration: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      localStorage.removeItem('appConfig');
      const defaultConfig = {
        appTitle: "OC Kickstart",
        logoUrl: "/assets/logo.svg",
        theme: "light"
      };
      setFormData(defaultConfig);
      setMessage({ type: 'info', text: 'Configuration reset to default values.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset configuration' });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Box sx={{ p: 3 }}>
          <Typography>Loading configuration...</Typography>
        </Box>
      </ProtectedRoute>
    );
  }

  // Don't render if not in demo mode
  if (!isDemoMode()) {
    return null;
  }

  return (
    <ProtectedRoute>
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              App Configuration
            </Typography>
            <Chip
              icon={<Info />}
              label="Demo Mode - LocalStorage"
              color="info"
              variant="outlined"
            />
          </Box>

          {message && (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Edit your application configuration settings below. In demo mode, all changes are saved to your browser's localStorage.
          </Typography>

          <Stack spacing={3}>
            <TextField
              fullWidth
              label="App Title"
              value={formData.appTitle}
              onChange={(e) => setFormData({ ...formData, appTitle: e.target.value })}
              helperText="The title displayed in the browser tab and app header"
              disabled={loading || saving}
            />

            <TextField
              fullWidth
              label="Logo URL"
              value={formData.logoUrl}
              onChange={(e) => {
                const url = e.target.value;
                setFormData({ ...formData, logoUrl: url });
                setLogoUrlError(validateLogoUrl(url));
              }}
              helperText={logoUrlError || "Enter a relative path (e.g., /assets/logo.svg) or full URL (e.g., https://example.com/logo.png)"}
              placeholder="/assets/logo.svg or https://example.com/logo.png"
              disabled={loading || saving}
              error={!!logoUrlError}
            />

            <TextField
              fullWidth
              select
              label="Theme"
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              helperText="The default theme for the application"
              disabled={loading || saving}
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
              onClick={() => configManager.exportConfig(formData)}
            >
              Export Config
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Current Configuration
          </Typography>

          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <pre
              style={{ 
                margin: 0, 
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                hyphens: 'auto',
                color: 'inherit'
              }}
            >
              {JSON.stringify(formData, null, 2)}
            </pre>
          </Paper>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Demo Mode:</strong><br/>
              • Configuration is saved to your browser's localStorage<br/>
              • Changes persist between sessions but are local to this browser<br/>
              • Export the config to manually update your config.js file<br/>
              • This page is only available in demo mode
            </Typography>
          </Box>
        </Paper>
      </Box>
    </ProtectedRoute>
  );
} 