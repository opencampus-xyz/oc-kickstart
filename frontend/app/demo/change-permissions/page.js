"use client";
import { useUser } from "@/providers/UserProvider";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { Button, Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import React, { useState, useEffect } from "react";

export default function ChangePermissions() {
  const { isMasterAdmin, isAdmin, isRegisteredUser, user, isInitialized } = useUser();
  const fetchWithAuth = useAuthenticatedFetch();
  const [anchorEl, setAnchorEl] = useState(null);
  const [permissions, setPermissions] = useState({
    "master-admin": isMasterAdmin,
    "admin": isAdmin,
    "registered-user": true
  });
  const open = Boolean(anchorEl);
  const [adminOCIDs, setAdminOCIDs] = useState("");
  
  useEffect(() => {
    setPermissions({
      "master-admin": isMasterAdmin,
      "admin": isAdmin,
      "registered-user": true
    });
  }, [isMasterAdmin, isAdmin]);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePermissionChange = (permission) => (event) => {
    if (permission === "registered-user") {
      return;
    }
    
    setPermissions(prev => ({
      ...prev,
      [permission]: event.target.checked
    }));
  };

  const handleChangePermissions = async () => {
    if (permissions["master-admin"]) {
      localStorage.setItem('master_admin_ocid', user.oc_id);
      
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
    } else {
      if (isMasterAdmin) {
        localStorage.removeItem('master_admin_ocid');
      }
    }
    
    if (permissions["admin"]) {
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
    } else {
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
  };

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
      
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={permissions["master-admin"]}
              onChange={handlePermissionChange("master-admin")}
            />
          }
          label="Master Admin"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={permissions["admin"]}
              onChange={handlePermissionChange("admin")}
            />
          }
          label="Admin"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={permissions["registered-user"]}
              disabled={true}
            />
          }
          label="Registered User (Always enabled)"
        />
      </FormGroup>
      
      <Button onClick={handleChangePermissions} variant="contained" sx={{ mt: 2 }}>
        Change Permissions
      </Button>
    </div>
  );
}