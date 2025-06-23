import { Alert, Divider, TextField } from "@mui/material";
import { LoginButton } from "@opencampus/ocid-connect-js";
import { useState } from "react";
import styles from "../../app/login/login.module.css";


const generateRandomEmail = () => {
    const randomString = Math.random().toString(36).substring(2, 10);
    return `${randomString}@ockickstarttest.com`;
  };

export default function DemoLoginPage({isInvalidLogin, isAdminLogin, originUrl}) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState(null);
    const [isEmailLocked, setIsEmailLocked] = useState(false);

    useEffect(() => {
        const checkMasterAdmin = () => {
        const masterAdminOcid = localStorage.getItem('master_admin_ocid');
        if (!masterAdminOcid && !isEmailLocked) {
            const randomEmail = generateRandomEmail();
            setEmail(randomEmail);
            setIsEmailLocked(true);
        } else if (masterAdminOcid && isEmailLocked) {
            setIsEmailLocked(false);
        }
        };

        checkMasterAdmin();
      }, [isEmailLocked]);
    
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