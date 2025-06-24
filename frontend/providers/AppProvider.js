import { Loading } from "@/components/common/Loading";
import { DemoModal } from "@/components/demo/DemoModal";
import configManager from "../config/configManager";
import {
  Assignment,
  EmojiEvents,
  Home,
  Label,
  List,
  Logout as LogoutIcon,
  People,
  Person,
  Tune,
  Help as HelpIcon,
  Settings,
} from "@mui/icons-material";
import { Button, IconButton, Tooltip } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { DashboardLayout } from "@toolpad/core";
import { NextAppProvider } from "@toolpad/core/nextjs";
import { useRouter } from "next/navigation";
import React from "react";
import { useUser } from "./UserProvider";
import { useState, useEffect } from "react";
import { isDemoMode } from '../db/utils';

const Logout = () => {
  const { ocAuth, authState } = useOCAuth();

  if (!authState?.isAuthenticated) return null;

  const logout = () => {
    ocAuth.logout(`${window.location.origin}/home`);
  };

  return (
    <Button
      startIcon={<LogoutIcon />}
      onClick={logout}
      size="large"
      className="mb-8"
    >
      Logout
    </Button>
  );
};

export const AppProvider = ({ children }) => {
  const { authState } = useOCAuth();
  const { isRegisteredUser, isAdmin, isMasterAdmin, user } = useUser();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [clientConfig, setClientConfig] = useState(null);
  const isDemoUser = isDemoMode()

  useEffect(() => {
    setClientConfig(configManager.getConfig());
  }, []);

  useEffect(() => {
    if (isDemoUser) {
      const acknowledged = localStorage.getItem('demo_modal_acknowledged');
      if (!acknowledged) {
        setShowDemoModal(true);
      }
    }
  }, [isDemoUser]);

  const handleCloseDemoModal = () => {
    localStorage.setItem('demo_modal_acknowledged', 'true');
    setShowDemoModal(false);
  };

  const handleHelpClick = () => setShowDemoModal(true);

  if (!clientConfig) return null;

  const theme = createTheme({
    palette: {
      mode: clientConfig.theme,
    },
  });

  const CustomLogo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img
        src={configManager.getLogoUrl(clientConfig.logoUrl)}
        width={20}
        height={20}
        alt={clientConfig.appTitle}
        style={{ display: 'block' }}
      />
      {isDemoUser && (
        <Tooltip title="Demo Information & Help">
          <IconButton
            onClick={handleHelpClick}
            size="small"
            sx={{
              color: 'secondary.light',
              padding: '2px',
              '&:hover': {
                backgroundColor: 'secondary.light',
                color: 'white'
              }
            }}
          >
            <HelpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );

  const adminNavigation = [
    {
      kind: "header",
      title: "Admin",
    },
    { segment: "admin/tags", title: "Tags", icon: <Label /> },
    { segment: "admin/listings", title: "Listings", icon: <List /> },
    { segment: "admin/users", title: "Users", icon: <People /> },
  ];

  const userNavigation = () => {
    if (!user) return [];
    return [
      { segment: "home", title: "Home", icon: <Home /> },
      { segment: "user-dashboard/profile", title: "Profile", icon: <Person /> },
      {
        segment: `achievements?ocid=${user.oc_id}`,
        title: "Achievements",
        icon: <EmojiEvents />,
        pattern: "achievements",
      },
      {
        segment: "user-dashboard/sign-ups",
        title: "Sign Ups",
        icon: <Assignment />,
      },
    ];
  };

  const unregisteredUserNavigation = () => {
    if (isAdmin || isMasterAdmin)
      return [
        { segment: "signup", title: "Sign Up as user", icon: <Person /> },
      ];

    return [];
  };

  const masterAdminNavigation = [
    { kind: "header", title: "Master Admin" },
    { segment: "admin-configs", title: "Admin Configs", icon: <Tune /> },
    ...(isDemoUser ? [
      { segment: "demo/configuration", title: "Configuration", icon: <Settings /> },
    ] : []),
  ];

  const navigation = [
    ...(isRegisteredUser ? userNavigation() : unregisteredUserNavigation()),
    ...(isAdmin ? adminNavigation : []),
    ...(isMasterAdmin ? masterAdminNavigation : []),
  ];

  const toolbarActions = () => {
    const router = useRouter();
    if (authState?.isAuthenticated) return null;
    
    const onClick = () => router.push(`/login?originUrl=${encodeURIComponent(window.location.href)}`);
    
    return (
      <Button variant="contained" onClick={onClick}>
        Login / Sign up
      </Button>
    );
  };

  return (
    <React.Suspense fallback={<Loading />}>
      <NextAppProvider
        navigation={navigation}
        theme={theme}
        branding={{
          homeUrl: "/home",
          title: clientConfig.appTitle,
          logo: <CustomLogo />,
        }}
      >
        <DashboardLayout
          hideNavigation={!authState?.isAuthenticated}
          slots={{
            sidebarFooter: Logout,
            toolbarActions,
          }}
        >
          {children}
        </DashboardLayout>
      </NextAppProvider>
      
      <DemoModal
        open={showDemoModal}
        onClose={handleCloseDemoModal}
      />
    </React.Suspense>
  );
};
