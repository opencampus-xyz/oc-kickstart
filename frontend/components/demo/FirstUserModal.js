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
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import configManager from "../../config/configManager";

const config = configManager.getConfigFromLocalStorage();

export const FirstUserModal = ({ open, onClose }) => {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      disableEscapeKeyDown={true}
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
        <AdminIcon />
        <Typography variant="h6" component="div">
          Welcome to {config.appTitle} - Master Admin Setup
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="success" sx={{ mb: 3, mt: 2 }}>
          <Typography variant="body1" fontWeight="medium">
            Congratulations! You are the first user to register on {config.appTitle}. 
            You have been automatically assigned the Master Admin role.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="primary" />
            Master Administrator Privileges
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Full System Access" 
                secondary="Complete control over all system features and data"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="User Management" 
                secondary="Create, edit, and manage all user accounts"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Listing Management" 
                secondary="Create, edit, and manage all opportunities and listings"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Credential Issuance" 
                secondary="Issue and manage verifiable credentials for achievements"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Make Admins" 
                secondary="Access to admin configs to create other admins"
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="primary" />
            What You Can Do Now
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip label="Create Listings" color="primary" variant="outlined" />
            <Chip label="Manage Users" color="primary" variant="outlined" />
            <Chip label="Issue Credentials" color="primary" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            As the master administrator, you have access to the admin dashboard where you can manage all aspects of the system.
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Getting Started:</strong> Navigate to the admin Listings page to make your first listing.
          </Typography>
        </Alert>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="body2" color="text.secondary">
            <strong>Demo Note:</strong> This will not happen in production, you must modify the env variable MASTER_ADMIN_OCID to your OCID to become master admin in production. (Your Master Admin status is currently stored in local storage.) 
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} variant="contained" color="primary">
          Get Started
        </Button>
      </DialogActions>
    </Dialog>
  );
};
