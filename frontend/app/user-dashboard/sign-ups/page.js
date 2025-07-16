"use client";

import { Table } from "@/components/common/Table";
import { useApi } from "@/providers/ApiProvider";
import { format } from "date-fns";
import { capitalize } from "lodash";

export default function SignUpsPage() {
  const { apiService } = useApi();
  const columns = [
    { field: "listing_name", headerName: "Listing", width: 300 },
    {
      field: "user_listing_status",
      headerName: "Sign up status",
      width: 150,
      renderCell: (params) => capitalize(params.row.user_listing_status),
    },
    {
      field: "vc_issue_status",
      headerName: "Issue status",
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
      width: 300,
      renderCell: (params) =>
        format(new Date(params.row.created_ts), "dd MMM yyyy HH:mm"),
    },
  ];

  return (
    <Table
      columns={columns}
      fetchData={async (params) => await apiService.getUserSignups(params)}
      pageTitle="Sign Ups"
      emptyMessage="No sign ups found."
    />
  );
}
