"use client";
import { useUser } from "@/providers/UserProvider";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { isDemoMode } from "@/utils";
import DemoLoginPage from "@/components/login/DemoLoginPage";
import LoginPage from "@/components/login/LoginPage";

export default function Login() {
  const { isInitialized } = useUser();
  const router = useRouter();
  const { authState } = useOCAuth();
  const params = useSearchParams();
  const originUrl = params.get("originUrl") ? decodeURIComponent(params.get("originUrl")) : null;
  const demoMode = isDemoMode();

  const isInvalidLogin = params.get("invalidLogin") === "true";
  const isAdminLogin = params.get("adminLogin") === "true";

  useEffect(() => {
    if (isInitialized && authState?.isAuthenticated) {
      router.push(originUrl ?? "/redirect");
    }
  }, [isInitialized, authState, originUrl]);

  if (demoMode) {
    return <DemoLoginPage isInvalidLogin={isInvalidLogin} isAdminLogin={isAdminLogin} originUrl={originUrl} />
  } else {
    return <LoginPage isInvalidLogin={isInvalidLogin} isAdminLogin={isAdminLogin} originUrl={originUrl} />
  }
}
