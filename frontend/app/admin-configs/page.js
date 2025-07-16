"use client";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { useUser } from "@/providers/UserProvider";
import { Button, TextField } from "@mui/material";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { useApi } from "@/providers/ApiProvider";
import "../globals.css";

export default function AdminConfigs() {
  const [adminOCIDs, setAdminOCIDs] = useState("");
  const { apiService } = useApi();
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
      await apiService.setAdminOCIDs(adminOCIDs);
      enqueueSnackbar("Successfully updated admin configs", {
        variant: "success",
      });
    } catch (e) {
      enqueueSnackbar("Error saving admin configs", { variant: "error" });
    }
  };

  const getAdminConfigs = async () => {
    const data = await apiService.getAdminConfig();
    setAdminOCIDs(data?.admin_ocids?.join(",") ?? []);
  };

  useEffect(() => {
    if (!isInitialized) return;
    getAdminConfigs();
  }, [isInitialized]);

  return (
    <ProtectedRoute>
      <div className="pageContainer">
        <div>You are Master Admin, so you are already an admin</div>
        <div>If you want to add other admins here</div>
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
