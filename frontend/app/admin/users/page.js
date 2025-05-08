"use client";
import { Table } from "@/components/common/Table";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Users() {
  const router = useRouter();

  const columns = [
    { field: "id", headerName: "ID", width: 150 },
    { field: "name", headerName: "Name", width: 150 },
    { field: "email", headerName: "Email", width: 300 },
    { field: "oc_id", headerName: "OC ID", width: 150 },
    {
      field: "actions",
      headerName: "Actions",
      width: 300,
      renderCell: (params) => {
        return (
          <Button
            variant="text"
            color="primary"
            onClick={() => {
              router.push(`/achievements?ocid=${params.row.oc_id}`);
            }}
          >
            View issued OCAs
          </Button>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      fetchURL="/admin/users"
      pageTitle="Users"
      emptyMessage="No users found."
    />
  );
}
