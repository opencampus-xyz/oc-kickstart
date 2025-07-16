"use client";
import { OCConnect } from "@opencampus/ocid-connect-js";
import { SnackbarProvider } from "notistack";
import { AppProvider } from "./providers/AppProvider";
import { UserProvider } from "./providers/UserProvider";
import { ApiProvider } from "./providers/ApiProvider";

export default function Providers({ children }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  let opts = {
    clientId: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID,
    storageType: "cookie",
    cookieKeyPrefix: process.env.NEXT_PUBLIC_COOKIE_KEY_PREFIX,
    domain: process.env.NEXT_PUBLIC_SSO_COOKIE_DOMAIN,
    redirectUri: `${origin}/redirect`,
    sameSite: false,
  };

  const isSandboxMode = process.env.NEXT_PUBLIC_SANDBOX_MODE === "true";

  return (
    <OCConnect opts={opts} sandboxMode={isSandboxMode}>
      <ApiProvider>
        <UserProvider>
          <SnackbarProvider>
            <AppProvider>{children}</AppProvider>
          </SnackbarProvider>
        </UserProvider>
      </ApiProvider>
    </OCConnect>
  );
}
