import { Loading } from "@/components/common/Loading";
import { config } from "@/config";
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
} from "@mui/icons-material";
import { Button } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { DashboardLayout } from "@toolpad/core";
import { NextAppProvider } from "@toolpad/core/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { useUser } from "./UserProvider";

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

  const navigation = [
    ...(isRegisteredUser ? userNavigation() : unregisteredUserNavigation()),
    ...(isAdmin ? adminNavigation : []),
    ...(isMasterAdmin ? masterAdminNavigation : []),
  ];

  const toolbarActions = () => {
    const router = useRouter();
    if (authState?.isAuthenticated) return null;
    const onClick = () => router.push("/login");
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
          logo: (
            <Image
              src={config.logoUrl}
              width={20}
              height={20}
              alt={config.appTitle}
            />
          ),
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
    </React.Suspense>
  );
};
