"use client";
import { Loading } from "@/components/common/Loading";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import { Button, TextField } from "@mui/material";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import "../../app/globals.css";

export function SignUp() {
  const [name, setName] = useState("");
  const [error, setError] = useState();
  const { ocAuth, authState } = useOCAuth();
  const router = useRouter();
  const fetchWithAuth = useAuthenticatedFetch();
  const user = useUser();
  const { getUser, isRegisteredUser } = user;
  const stateFromSDK = ocAuth?.getStateParameter();

  useEffect(() => {
    if (isRegisteredUser) {
      router.push("/user-dashboard/profile");
    }
  }, [isRegisteredUser, router]);

  if (!authState.isAuthenticated) return <Loading />;
  if (!stateFromSDK) return null;

  const email = stateFromSDK ? JSON.parse(stateFromSDK).email : authState.user?.email;
  const path = stateFromSDK ? JSON.parse(stateFromSDK).path : null;
  const originUrl = stateFromSDK ? JSON.parse(stateFromSDK).originUrl : null;

  if (!user.isMasterAdmin) {
    if (path !== "signup") {
      ocAuth.logout(`${window.location.origin}/login?adminLogin=true`);
      return null;
    }
    if (!email) {
      ocAuth.logout(`${window.location.origin}/login?invalidLogin=true`);
      return null;
    }
  }

  const handleSignup = async () => {
    try {
      if (!name) {
        setError("Name is required");
        return;
      }
      const requestBody = { name, email };
      const response = await fetchWithAuth("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to sign up");
      }
      await getUser();
      enqueueSnackbar("Signed up successfully", { variant: "success" });
      if (originUrl) {
        router.push(originUrl);
      } else {
        router.push("/user-dashboard/profile");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError(error.message);
      enqueueSnackbar(error.message || "Error signing up", { variant: "error" });
    }
  };

  return (
    <div className="pageContainer">
      <div>Signing up for email: {email}</div>
      <TextField
        required
        label="Name"
        onChange={(e) => setName(e.target.value)}
        error={!!error}
        helperText={error}
      />
      <Button variant="contained" onClick={handleSignup}>
        Signup
      </Button>
    </div>
  );
} 