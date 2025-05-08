"use client";
import { useUser } from "@/providers/UserProvider";
import { Alert, Divider, TextField } from "@mui/material";
import { LoginButton, useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./login.module.css";

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const { isInitialized } = useUser();
  const router = useRouter();
  const { authState } = useOCAuth();

  useEffect(() => {
    if (isInitialized && authState?.isAuthenticated) router.push("/redirect");
  }, [isInitialized, authState]);

  const params = useSearchParams();
  const isInvalidLogin = params.get("invalidLogin") === "true";
  const isAdminLogin = params.get("adminLogin") === "true";

  const onChange = (e) => {
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
        <LoginButton state={{ path: "login" }} />
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
        />
        <LoginButton state={{ email, path: "signup" }} />
      </div>
    </div>
  );
}
