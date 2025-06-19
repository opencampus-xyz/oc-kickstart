"use client";
import { useUser } from "@/providers/UserProvider";
import { Alert, Divider, TextField } from "@mui/material";
import { LoginButton, useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isIndexedDBMode } from "@/utils";
import styles from "./login.module.css";

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const generateRandomEmail = () => {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${randomString}@ocgenerictest.com`;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const { isInitialized } = useUser();
  const router = useRouter();
  const { authState } = useOCAuth();
  const params = useSearchParams();
  const originUrl = params.get("originUrl") ? decodeURIComponent(params.get("originUrl")) : null;
  const isDemoMode = isIndexedDBMode();

  useEffect(() => {
    if (isInitialized && authState?.isAuthenticated) {
      router.push(originUrl ?? "/redirect");
    }
  }, [isInitialized, authState, originUrl]);

  useEffect(() => {
    if (isDemoMode) {
      const masterAdminOcid = localStorage.getItem('master_admin_ocid');
      if (!masterAdminOcid) {
        const randomEmail = generateRandomEmail(); 
        setEmail(randomEmail);
        setIsEmailLocked(true);
      } else {
        setIsEmailLocked(false);
      }
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode && !isEmailLocked) {
      const checkMasterAdmin = () => {
        const masterAdminOcid = localStorage.getItem('master_admin_ocid');
        if (!masterAdminOcid && !isEmailLocked) {
          const randomEmail = generateRandomEmail();
          setEmail(randomEmail);
          setIsEmailLocked(true);
        }
      };

      checkMasterAdmin();
      
      const timeoutId = setTimeout(checkMasterAdmin, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isDemoMode, isEmailLocked]);

  const isInvalidLogin = params.get("invalidLogin") === "true";
  const isAdminLogin = params.get("adminLogin") === "true";

  const onChange = (e) => {
    if (isDemoMode && isEmailLocked) {
      return;
    }

    const value = e.target.value;

    setEmail(value);
    if (!value) {
      setError("Email is required");
      return;
    }
    if (!validateEmail(value)) {
      setError("Invalid email");
      return;
    }

    setError(null);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.loginContainer}>
        <div>If you already have an account, please sign in with you OCID</div>
        <LoginButton state={{ path: "login", originUrl }} />
        {isInvalidLogin && (
          <Alert severity="error">
            Looks like you don't have an account yet, please sign up below
          </Alert>
        )}
        {isAdminLogin && (
          <Alert severity="info">
            To create a user account, please sign up with email below
          </Alert>
        )}
        <Divider
          sx={{ width: "100%", marginTop: "16px", marginBottom: "16px" }}
        />
        <div>
          If you don't have an account, please sign up here with your OCID{" "}
        </div>
        <TextField
          required
          id="email"
          label="Email"
          value={email}
          onChange={onChange}
          sx={{ minWidth: "300px" }}
          error={!!error}
          helperText={error}
          disabled={isDemoMode && isEmailLocked}
        />
        <LoginButton state={{ email, path: "signup", originUrl }} />
      </div>
    </div>
  );
}
