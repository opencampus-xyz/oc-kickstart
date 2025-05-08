"use client";

import { Loading } from "@/components/common/Loading";
import { useUser } from "@/providers/UserProvider";
import { LoginCallBack, useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RedirectPage() {
  const router = useRouter();
  const { authState, ocAuth } = useOCAuth();
  const user = useUser();
  const {
    isMasterAdmin,
    isAdmin,
    isRegisteredUser,
    isInitialized: isUserInitialized,
  } = user;

  const stateFromSDK = ocAuth?.getStateParameter();

  const loginSuccess = async () => {
    if (stateFromSDK) {
      const { path } = JSON.parse(stateFromSDK);
      if (path === "signup") {
        router.push("/signup");
        return;
      }
    }
    if (isMasterAdmin) {
      router.push("/admin-configs");
      return;
    } else if (isAdmin) {
      router.push("/admin");
      return;
    } else if (isRegisteredUser) {
      router.push("/user-dashboard");
      return;
    } else {
      router.push("/signup");
    }
  };

  useEffect(() => {
    if (isUserInitialized && !!authState?.isAuthenticated) {
      if (authState?.error) {
        enqueueSnackbar(authState.error, {
          variant: "error",
        });
        return;
      }
      loginSuccess();
    }
  }, [authState, loginSuccess, isUserInitialized, stateFromSDK]);

  return (
    <LoginCallBack
      successCallback={loginSuccess}
      customLoadingComponent={<Loading />}
    />
  );
}
