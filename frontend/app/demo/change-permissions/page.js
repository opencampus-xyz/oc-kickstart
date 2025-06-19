"use client";
import { useUser } from "@/providers/UserProvider";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { Button, MenuItem, TextField } from "@mui/material";
import React, { useState } from "react";

export default function ChangePermissions() {
  const { isMasterAdmin, isAdmin, isRegisteredUser, user, isInitialized } = useUser();
  const fetchWithAuth = useAuthenticatedFetch();
  const [anchorEl, setAnchorEl] = useState(null);
  const [newPermission, setNewPermission] = useState(
    isMasterAdmin ? "master-admin" : isAdmin ? "admin" : isRegisteredUser ? "registered-user" : "unregistered-user"
  );
  const open = Boolean(anchorEl);
  const [adminOCIDs, setAdminOCIDs] = useState("");
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChangePermissions = async () => {
    if (newPermission === "master-admin") {
      await fetchWithAuth("/demo/set-master-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ocId: user.oc_id }),
      });
    } else if (newPermission === "admin") {
      if (isMasterAdmin) {
        localStorage.removeItem('master_admin_ocid');
      }
      
      const response = await fetchWithAuth("/master-admin/admin-configs");
      const data = await response.json();
      const currentAdminOCIDs = data?.admin_ocids || [];
      
      if (!currentAdminOCIDs.includes(user.oc_id)) {
        const newAdminOCIDs = [...currentAdminOCIDs, user.oc_id];
        await fetchWithAuth("/master-admin/admin-configs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ adminOCIDs: newAdminOCIDs.join(",") }),
        });
      }
    } else if (newPermission === "registered-user") {
      if (isMasterAdmin) {
        localStorage.removeItem('master_admin_ocid');
      }
      
      const response = await fetchWithAuth("/master-admin/admin-configs");
      const data = await response.json();
      const currentAdminOCIDs = data?.admin_ocids || [];
      const filteredOCIDs = currentAdminOCIDs.filter(ocid => ocid !== user.oc_id);
      
      await fetchWithAuth("/master-admin/admin-configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminOCIDs: filteredOCIDs.join(",") }),
      });
    }
    window.location.reload();
  }

  const permissions = [
    {
      value: "master-admin",
      label: "Master Admin",
    },
    {
      value: "admin",
      label: "Admin",
    },
    {
      value: "registered-user",
      label: "Normal User",
    }
  ];

  // Wait for user data to be initialized before rendering
  if (!isInitialized) {
    return (
      <div>
        <h1>Loading...</h1>
        <p>Please wait while we fetch your user data.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Change Permissions</h1>
      <h2>THIS IS A DEMO ONLY PAGE</h2>
      <h3>User ID: {user ? user.oc_id : "null"}</h3>
      <h3>Type of User: {isMasterAdmin ? "Master Admin" : isAdmin ? "Admin" : isRegisteredUser ? "Normal User" : "Error:Unregistered User"}</h3>
      <TextField
        id="outlined-select-permissions"
        select
        label="Select"
        value={newPermission}
        onChange={(e) => setNewPermission(e.target.value)}
        helperText="Please select your permissions"
      >
        {permissions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <Button onClick={handleChangePermissions}>Change Permissions</Button>
    </div>
  );
}