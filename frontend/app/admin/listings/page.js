"use client";
import { Table } from "@/components/common/Table";
import { Button } from "@mui/material";
import { format } from "date-fns";
import { capitalize } from "lodash";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { useApi } from "@/providers/ApiProvider";

export default function Listings() {
  const router = useRouter();
  const { apiService } = useApi();

  const columns = [
    { field: "id", headerName: "ID", width: 150 },
    { field: "name", headerName: "Name", width: 200 },
    {
      field: "created_ts",
      headerName: "Created At",
      width: 150,
      renderCell: (params) =>
        format(new Date(params.row.created_ts), "yyyy-MM-dd hh:mm"),
    },
    {
      field: "published_ts",
      headerName: "Published At",
      width: 150,
      renderCell: (params) =>
        params.row.published_ts ? format(new Date(params.row.published_ts), "yyyy-MM-dd hh:mm") : '',
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (params) => capitalize(params.row.status),
    },
    {
      field: "actions",
      headerName: "Actions",
      renderCell: (params) => {
        return (
          <Button
            variant="text"
            color="primary"
            onClick={() => {
              router.push(`/admin/listings/${params.row.id}`);
            }}
          >
            Edit
          </Button>
        );
      },
    },
    {
      field: "signups",
      headerName: "Sign Ups",
      width: 200,
      renderCell: (params) => {
        return (
          <Button
            onClick={() => router.push(`/admin/signups/${params.row.id}`)}
          >
            {`View SignUps (${params.row.signups_count})`}
          </Button>
        );
      },
    },
  ];

  const formatData = (data) =>
    data.map((listing) => ({
      id: listing.id,
      name: listing.name,
      description: listing.description,
      created_ts: listing.created_ts,
      published_ts: listing.published_ts,
      status: listing.status,
      signups_count: listing.signups_count,
    }));

  return (
    <Table
      columns={columns}
      fetchData={async (params) => await apiService.adminGetListings(params)}
      pageTitle="Listings"
      formatDataFunc={formatData}
      emptyMessage="No listings found. Please create one."
      headerComp={() => (
        <div className={styles.buttonContainer}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/admin/listings/create")}
          >
            Add Listing
          </Button>
        </div>
      )}
    />
  );
}
