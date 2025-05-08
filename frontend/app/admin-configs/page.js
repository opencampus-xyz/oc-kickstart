"use client";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import { Button, TextField } from "@mui/material";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import "../globals.css";

export default function AdminConfigs() {
  const [adminOCIDs, setAdminOCIDs] = useState("");
  const fetchWithAuth = useAuthenticatedFetch();
  const { isInitialized, isMasterAdmin } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isMasterAdmin) {
      router.push("/home");
    }
  }, [isMasterAdmin, router]);

  const handleSaveConfigs = async () => {
    try {
      await fetchWithAuth("/master-admin/admin-configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminOCIDs }),
      });
      enqueueSnackbar("Successfully updated admin configs", {
        variant: "success",
      });
    } catch (e) {
      enqueueSnackbar("Error saving admin configs", { variant: "error" });
    }
  };

  const getAdminConfigs = async () => {
    const response = await fetchWithAuth("/master-admin/admin-configs");
    const data = await response.json();
    setAdminOCIDs(data?.admin_ocids?.join(",") ?? []);
  };

  useEffect(() => {
    if (!isInitialized) return;
    getAdminConfigs();
  }, [isInitialized]);

  return (
    <ProtectedRoute>
      <div className="pageContainer">
        <TextField
          label="Admin OCIDs"
          helperText="Enter OCIDs separated by commas"
          value={adminOCIDs}
          onChange={(e) => setAdminOCIDs(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleSaveConfigs}>
          Save configs
        </Button>
      </div>
    </ProtectedRoute>
  );
}
