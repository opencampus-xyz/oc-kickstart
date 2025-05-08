"use client";
import { Loading } from "@/components/common/Loading";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import { Button, TextField } from "@mui/material";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import "../globals.css";

export default function Signup() {
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

  const { email, path } = JSON.parse(stateFromSDK);
  if ((user.isMasterAdmin || user.isAdmin) && path !== "signup") {
    ocAuth.logout(`${window.location.origin}/login?adminLogin=true`);
    return;
  }
  if (!email) {
    ocAuth.logout(`${window.location.origin}/login?invalidLogin=true`);
    return;
  }

  const handleSignup = async () => {
    try {
      if (!name) {
        setError("Name is required");
        return;
      }
      await fetchWithAuth("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });
      await getUser();
      enqueueSnackbar("Signed up successfully", {
        variant: "success",
      });
      router.push("/home");
    } catch (error) {
      enqueueSnackbar("Error signing up", {
        variant: "error",
      });
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
