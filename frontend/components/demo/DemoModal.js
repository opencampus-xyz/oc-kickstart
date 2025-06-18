import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Info as InfoIcon,
  School as SchoolIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { config } from "@/config";
import { useState } from "react";

export const DemoModal = ({ open, onClose }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const handleClose = () => {
    setShowTechnicalDetails(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        backgroundColor: 'primary.main',
        color: 'white'
      }}>
        <InfoIcon />
        <Typography variant="h6" component="div">
          {config.appTitle} - Demo Environment
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="medium">
            Welcome to the {config.appTitle} demo! This is a demonstration environment showcasing Open Credential (OC) management capabilities.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon color="primary" />
            What You Can Simulate in the Demo Environment
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Browse and search listings" 
                secondary="Explore available opportunities and filter by tags or status"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Sign up for opportunities" 
                secondary="Register your interest in various listings and track your applications"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="View your achievements" 
                secondary="See your earned credentials and certificates"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Admin functionality" 
                secondary="Create listings, manage users, and issue credentials (admin users)"
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="primary" />
            Demo Features
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip label="JWT Authentication" color="primary" variant="outlined" />
            <Chip label="IndexedDB Storage" color="primary" variant="outlined" />
            <Chip label="Credential Issuance" color="primary" variant="outlined" />
            <Chip label="Role-based Access" color="primary" variant="outlined" />
            <Chip label="Real-time Updates" color="primary" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            This demo uses client-side storage (IndexedDB) to simulate a real backend. 
            The frontend/UI is unchanged from the production version, we only intercept the API calls to the backend and return data from the client-side storage.
            All data is stored locally in your browser and will persist between sessions.
          </Typography>
        </Box>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Demo Data:</strong> This environment contains sample data for demonstration purposes. 
            Your actions will be saved locally but are not connected to any production system. The data used and created in this demo is not real and will only exist on this browser profile.
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            sx={{ textTransform: 'none' }}
          >
            {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
          </Button>
        </Box>

        {showTechnicalDetails && (
          <Box sx={{ 
            backgroundColor: 'grey.50', 
            p: 2, 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300'
          }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon color="primary" />
              Technical Implementation
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Frontend Framework" 
                  secondary="Next.js 14 with React 18"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="UI Library" 
                  secondary="Material-UI (MUI) with custom theming"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Data Storage" 
                  secondary="IndexedDB for client-side data persistence, production data is stored in the backend SQL database"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Authentication" 
                  secondary="JWT-based authentication with JWKS verification"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Credential Format" 
                  secondary="W3C Verifiable Credentials standard"
                />
              </ListItem>
            </List>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> This is a demonstration environment. For production use, please contact the development team.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} variant="contained" color="primary">
          I Understand!
        </Button>
      </DialogActions>
    </Dialog>
  );
};
