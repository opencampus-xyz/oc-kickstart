"use client";
import { CreateEditTagDialog } from "@/components/admin/CreateEditTagDialog";
import { Table } from "@/components/common/Table";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { Button } from "@mui/material";
import { format } from "date-fns";
import { useState } from "react";
import styles from "../admin.module.css";

export default function Tags() {
  const [editingTag, setEditingTag] = useState(null);
  const [open, setOpen] = useState(false);

  const fetchWithAuth = useAuthenticatedFetch();

  const deleteTag = async (id, refetch) => {
    await fetchWithAuth(`/admin/tag/archive/${id}`, {
      method: "POST",
    });
    await refetch();
  };

  const columns = ({ refetch }) => [
    { field: "id", headerName: "ID", width: 150 },
    { field: "name", headerName: "Name", width: 200 },
    { field: "description", headerName: "Description", width: 150 },
    {
      field: "created_ts",
      headerName: "Created At",
      width: 150,
      renderCell: (params) =>
        format(new Date(params.row.created_ts), "yyyy-MM-dd hh:mm"),
    },
    { field: "can_issue_oca", headerName: "Can Issue OCA", width: 150 },
    { field: "status", headerName: "Status", width: 150 },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      renderCell: (params) => {
        return (
          <div className={styles.rowButtonsContainer}>
            <Button
              variant="text"
              color="primary"
              onClick={() => {
                setEditingTag(params.row);
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              variant="text"
              color="error"
              onClick={() => {
                deleteTag(params.row.id, refetch);
              }}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  const formatData = (data) =>
    data.map((tag) => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      created_ts: tag.created_ts,
      can_issue_oca: tag.can_issue_oca,
      status: tag.archived_ts ? "Archived" : "Active",
      vc_properties: tag.vc_properties,
    }));

  const onClose = () => {
    setOpen(false);
    setEditingTag(null);
  };
  return (
    <Table
      columnsWithRefetch={columns}
      fetchURL="/admin/tags"
      pageTitle="Tags"
      formatDataFunc={formatData}
      emptyMessage="No tags found. Please create one."
      headerComp={({ refetch }) => (
        <div className={styles.buttonContainer}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpen(true)}
          >
            Add Tag
          </Button>
          <CreateEditTagDialog
            open={open}
            onClose={onClose}
            refetch={refetch}
            editingTag={editingTag}
          />
        </div>
      )}
    />
  );
}
