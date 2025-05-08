"use client";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import { AccountCircle } from "@mui/icons-material";
import { Button, TextField, Typography } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useState } from "react";
import styles from "./Profile.module.css";

export default function Profile() {
  const { user } = useUser();
  const [username, setUsername] = useState(user.name);
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useAuthenticatedFetch();

  const updateUsername = async () => {
    setLoading(true);
    if (!username) {
      enqueueSnackbar("Please provide a username", { variant: "error" });
      return;
    }
    await fetchWithAuth("/auth-user/update-username", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });
    setLoading(false);
  };
  return (
    <div>
      <Typography variant="h2">Profile</Typography>
      <div className={styles.profileContainer}>
        <AccountCircle sx={{ fontSize: 200 }} />
        <div>
          <b>Email:</b> {user.email}
        </div>
        <div>
          <b>OCID:</b> {user.oc_id}
        </div>
        <div className={styles.usernameInput}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <Button loading={loading} onClick={updateUsername}>
          Update Username
        </Button>
      </div>
    </div>
  );
}
