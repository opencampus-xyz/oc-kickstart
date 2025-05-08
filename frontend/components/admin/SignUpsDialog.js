import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { format } from "date-fns";
import { capitalize } from "lodash";
import { useEffect, useState } from "react";
import styles from "./SignUpsDialog.module.css";

export const SignUpsDialog = ({ listingId, buttonVariant = "contained" }) => {
  const [open, setOpen] = useState(false);
  const [userListings, setUserListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useAuthenticatedFetch();

  const fetchUserListings = async () => {
    const data = await fetchWithAuth(`/admin/listing/signups/${listingId}`);
    const userListings = await data.json();
    setUserListings(userListings);
  };

  const handleUpdateStatus = async (userId, listingId, status) => {
    setLoading(true);
    await fetchWithAuth(`/admin/listing/signups/update-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, listingId, status }),
    });
    setLoading(false);
    fetchUserListings();
  };

  const handleIssueOCA = async (userId, listingId) => {
    setLoading(true);
    await fetchWithAuth(`/admin/listing/signups/issue-oca`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, listingId }),
    });
    await fetchUserListings();
    setLoading(false);
  };

  useEffect(() => {
    fetchUserListings();
  }, [listingId]);

  const columns = [
    { field: "user_name", headerName: "User Name", width: 150 },
    { field: "user_oc_id", headerName: "User OCID", width: 150 },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (params) => capitalize(params.row.status),
    },
    {
      field: "vc_issue_status",
      headerName: "VC Issue Status",
      width: 150,
      renderCell: (params) => {
        if (!params.row.vc_issue_status) {
          return "N/A";
        }
        return capitalize(params.row.vc_issue_status);
      },
    },
    {
      field: "created_ts",
      headerName: "Created At",
      width: 150,
      renderCell: (params) =>
        format(new Date(params.row.created_ts), "yyyy-MM-dd hh:mm"),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 350,
      renderCell: (params) => (
        <div className={styles.actionsCell}>
          <Button
            variant="contained"
            color="primary"
            disabled={params.row.status !== "pending"}
            onClick={() =>
              handleUpdateStatus(
                params.row.user_id,
                params.row.listing_id,
                "approved"
              )
            }
          >
            Approve
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={params.row.status !== "pending"}
            onClick={() =>
              handleUpdateStatus(
                params.row.user_id,
                params.row.listing_id,
                "declined"
              )
            }
          >
            Decline
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={params.row.status !== "approved"}
            onClick={() =>
              handleUpdateStatus(
                params.row.user_id,
                params.row.listing_id,
                "completed"
              )
            }
          >
            Complete
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={
              params.row.status !== "completed" ||
              params.row.trigger_mode === "auto" ||
              !!params.row.vc_issue_status
            }
            onClick={() =>
              handleIssueOCA(params.row.user_id, params.row.listing_id)
            }
          >
            Issue
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Button
        variant={buttonVariant}
        color="primary"
        onClick={() => setOpen(true)}
      >
        View signups
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Signups</DialogTitle>
        <DialogContent>
          {userListings.length > 0 ? (
            <DataGrid
              rows={userListings}
              columns={columns}
              getRowId={(row) => `${row.user_id}-${row.listing_id}`}
              loading={loading}
            />
          ) : (
            <Typography variant="h6">No signups found</Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
