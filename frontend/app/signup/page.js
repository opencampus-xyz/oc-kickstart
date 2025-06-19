"use client";
import { Loading } from "@/components/common/Loading";
import { FirstUserModal } from "@/components/demo/FirstUserModal";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import { Button, TextField } from "@mui/material";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { isIndexedDBMode } from "@/utils";
import "../globals.css";

export default function Signup() {
  const [name, setName] = useState("");
  const [error, setError] = useState();
  const [showFirstUserModal, setShowFirstUserModal] = useState(false);
  const [isWaitingForModal, setIsWaitingForModal] = useState(false);
  const { ocAuth, authState } = useOCAuth();
  const router = useRouter();
  const fetchWithAuth = useAuthenticatedFetch();
  const user = useUser();
  const { getUser, isRegisteredUser } = user;
  const stateFromSDK = ocAuth?.getStateParameter();
  const isDemoMode = isIndexedDBMode();

  useEffect(() => {
    // Only redirect if we're not waiting to show the modal
    if (isRegisteredUser && !isWaitingForModal) {
      router.push("/user-dashboard/profile");
    }
  }, [isRegisteredUser, isWaitingForModal, router]);

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

      const requestBody = { 
        name, 
        email: email
      };

      const response = await fetchWithAuth("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to sign up");
      }

      // Only check for first user modal in demo mode
      if (isDemoMode) {
        // Set waiting state to prevent automatic redirect
        setIsWaitingForModal(true);

        // After successful signup, get updated user data
        await getUser();
        
        // Check if user is now a master admin (indicating they're the first user)
        const updatedUserResponse = await fetchWithAuth("/user", {
          method: "GET",
        });
        const updatedUserData = await updatedUserResponse.json();
        
        if (updatedUserData.isMasterAdmin) {
          // This is the first user, show the modal
          setShowFirstUserModal(true);
        } else {
          // Regular user, proceed with normal flow
          setIsWaitingForModal(false);
          enqueueSnackbar("Signed up successfully", {
            variant: "success",
          });
          
          if (originUrl) {
            router.push(originUrl);
          } else {
            router.push("/user-dashboard/profile");
          }
        }
      } else {
        await getUser();
        enqueueSnackbar("Signed up successfully", {
          variant: "success",
        });
        
        if (originUrl) {
          router.push(originUrl);
        } else {
          router.push("/user-dashboard/profile");
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError(error.message);
      setIsWaitingForModal(false);
      enqueueSnackbar(error.message || "Error signing up", {
        variant: "error",
      });
    }
  };

  const handleModalClose = async () => {
    setShowFirstUserModal(false);
    setIsWaitingForModal(false);
    enqueueSnackbar("Signed up successfully", {
      variant: "success",
    });
    
    if (originUrl) {
      router.push(originUrl);
    } else {
      router.push("/user-dashboard/profile");
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

      {/* Only render the modal in demo mode */}
      {isDemoMode && (
        <FirstUserModal 
          open={showFirstUserModal} 
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
