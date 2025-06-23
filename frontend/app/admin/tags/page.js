"use client";
import { AddTagToListingsDialog } from "@/components/admin/AddTagToListingsDialog";
import { CreateEditTagDialog } from "@/components/admin/CreateEditTagDialog";
import { Table } from "@/components/common/Table";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { Button } from "@mui/material";
import { format } from "date-fns";
import { useState } from "react";
import styles from "../admin.module.css";

export default function Tags() {
  const [editingTag, setEditingTag] = useState(null);
  const [showTagEditModal, setShowTagEditModal] = useState(false);
  const [tagToBeAdded, setTagToBeAdded] = useState(false);

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
                setShowTagEditModal(true);
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

  const formatData = (data) => {
    const formatted = data.map((tag) => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      created_ts: tag.created_ts,
      can_issue_oca: tag.can_issue_oca,
      status: tag.archived_ts ? "Archived" : "Active",
      vc_properties: tag.vc_properties,
    }));
    return formatted;
  };

  const onClose = () => {
    setShowTagEditModal(false);
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
            onClick={() => setShowTagEditModal(true)}
          >
            Add Tag
          </Button>
          <CreateEditTagDialog
            open={showTagEditModal}
            onClose={onClose}
            refetch={refetch}
            editingTag={editingTag}
            setTagToBeAdded={setTagToBeAdded}
          />
          <AddTagToListingsDialog
            tag={tagToBeAdded}
            open={!!tagToBeAdded}
            onClose={() => setTagToBeAdded(false)}
            refetch={refetch}
          />
        </div>
      )}
    />
  );
}
