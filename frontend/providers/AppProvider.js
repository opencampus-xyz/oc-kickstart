import { Loading } from "@/components/common/Loading";
import { DemoModal } from "@/components/demo/DemoModal";
import { config } from "@/config";
import dbService from "@/db/indexeddb/dbService";
import {
  Assignment,
  EmojiEvents,
  Home,
  Label,
  List,
  Logout as LogoutIcon,
  People,
  Person,
  Settings,
  Tune,
  Help as HelpIcon,
} from "@mui/icons-material";
import { Button, IconButton, Tooltip } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { DashboardLayout } from "@toolpad/core";
import { NextAppProvider } from "@toolpad/core/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { useUser } from "./UserProvider";
import { useState, useEffect } from "react";
import { isIndexedDBMode } from '../utils';

const theme = createTheme({
  palette: {
    mode: config.theme,
  },
});

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
  const [isDemoUser, setIsDemoUser] = useState(isIndexedDBMode());
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    const checkAdminConfigs = async () => {
      if (isDemoUser) {
        try {
        // DEMO MODE: we are directly checking the admin configs in the indexeddb without going through fetch
        // This would not be possible in production mode
          const adminConfig = await dbService.adminConfig();
          
          if (!adminConfig || !adminConfig.admin_ocids || adminConfig.admin_ocids.length === 0) {
            setShowDemoModal(true);
          }
        } catch (error) {
          console.error('Error checking admin configs:', error);
          setShowDemoModal(true);
        }
      }
    };

    checkAdminConfigs();
  }, [isDemoUser]);

  const handleCloseDemoModal = () => {
    setShowDemoModal(false);
  };

  const handleHelpClick = () => setShowDemoModal(true);

  // Custom logo component with help button
  const CustomLogo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Image
        src={config.logoUrl}
        width={20}
        height={20}
        alt={config.appTitle}
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
  ];
  const demoNavigation = [
    { kind: "header", title: "Demo" },
    { segment: "demo/change-permissions", title: "Change Permissions", icon: <Settings /> },
  ];

  const navigation = [
    ...(isRegisteredUser ? userNavigation() : unregisteredUserNavigation()),
    ...(isAdmin ? adminNavigation : []),
    ...(isMasterAdmin ? masterAdminNavigation : []),
    ...(isDemoUser ? demoNavigation : []),
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
          title: config.appTitle,
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
