import { Alert, Divider, TextField } from "@mui/material";
import { LoginButton } from "@opencampus/ocid-connect-js";
import { useState } from "react";
import styles from "../../app/login/login.module.css";

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function LoginPage({isInvalidLogin, isAdminLogin, originUrl}) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState(null);

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
            />
            <LoginButton state={{ email, path: "signup", originUrl }} />
          </div>
        </div>
      );
}