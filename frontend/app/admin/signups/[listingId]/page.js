"use client";

import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { Button, Menu, MenuItem, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { ArrowLeftIcon } from "@mui/x-date-pickers";
import { format } from "date-fns";
import { capitalize } from "lodash";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignUpsPage() {
  const { listingId } = useParams();
  const [userListings, setUserListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const fetchWithAuth = useAuthenticatedFetch();
  const router = useRouter();

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
      renderCell: (params) => {
        const rowId = `${params.row.user_id}-${params.row.listing_id}`;
        return (
          <div>
            <Button 
              onClick={(e) => {
                setMenuAnchorEl(e.currentTarget);
                setSelectedRowId(rowId);
              }}
            >
              Actions
            </Button>
            <Menu
              anchorEl={menuAnchorEl}
              open={selectedRowId === rowId}
              onClose={() => {
                setMenuAnchorEl(null);
                setSelectedRowId(null);
              }}
            >
              <MenuItem
                disabled={params.row.status !== "pending"}
                onClick={() => {
                  handleUpdateStatus(
                    params.row.user_id,
                    params.row.listing_id,
                    "approved"
                  );
                  setMenuAnchorEl(null);
                  setSelectedRowId(null);
                }}
              >
                Approve
              </MenuItem>
              <MenuItem
                disabled={params.row.status !== "pending"}
                onClick={() => {
                  handleUpdateStatus(
                    params.row.user_id,
                    params.row.listing_id,
                    "declined"
                  );
                  setMenuAnchorEl(null);
                  setSelectedRowId(null);
                }}
              >
                Decline
              </MenuItem>
              <MenuItem
                disabled={params.row.status !== "approved"}
                onClick={() => {
                  handleUpdateStatus(
                    params.row.user_id,
                    params.row.listing_id,
                    "completed"
                  );
                  setMenuAnchorEl(null);
                  setSelectedRowId(null);
                }}
              >
                Complete
              </MenuItem>
              <MenuItem
                disabled={
                  params.row.status !== "completed" ||
                  params.row.trigger_mode === "auto" ||
                  !!params.row.vc_issue_status ||
                  params.row.status === "pending" ||
                  params.row.status === "declined"
                }
                onClick={() => {
                  handleIssueOCA(params.row.user_id, params.row.listing_id);
                  setMenuAnchorEl(null);
                  setSelectedRowId(null);
                }}
              >
                Issue
              </MenuItem>
              <MenuItem
                disabled={params.row.status !== "completed" || params.row.vc_issue_status !== "failed"}
                onClick={() => {
                  handleIssueOCA(params.row.user_id, params.row.listing_id);
                  setMenuAnchorEl(null);
                  setSelectedRowId(null);
                }}
              >
                Reissue
              </MenuItem>
            </Menu>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Button onClick={() => router.push(`/admin/listings/${listingId}`)}>
        <ArrowLeftIcon />
        Back to Listing
      </Button>
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
    </>
  );
}
