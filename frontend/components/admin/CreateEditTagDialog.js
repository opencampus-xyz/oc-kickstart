import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import styles from "./CreateEditTagDialog.module.css";
import { EditVCProperties } from "./EditVCProperties";
import { useApi } from "@/providers/ApiProvider";

export const CreateEditTagDialog = ({
  open,
  onClose,
  refetch,
  editingTag,
  setTagToBeAdded,
}) => {
  const [showVCFormFields, setShowVCFormFields] = useState(
    editingTag?.can_issue_oca
  );
  const { apiService } = useApi();

  const upsertTag = async (formData) => {
    try {
      let updatedTag;
      if(editingTag){
        updatedTag = await apiService.adminUpdateTag(editingTag.id, {
          ...formData,
          can_issue_oca: !!showVCFormFields,
          expireInDays: parseInt(formData.expireInDays),
        })
      } else {
        updatedTag = await apiService.adminCreateTag({
          ...formData,
          can_issue_oca: !!showVCFormFields,
          expireInDays: parseInt(formData.expireInDays),
        });
      }

      enqueueSnackbar("Tag updated successfully", {
        variant: "success",
      });
      if (!editingTag) {
        setTagToBeAdded(updatedTag);
      }
      onClose();
      refetch();
    } catch (error) {
      console.error("Error updating tag:", error);
      enqueueSnackbar("Error updating tag", {
        variant: "error",
      });
    }
  };

  useEffect(() => {
    setShowVCFormFields(editingTag?.can_issue_oca);
  }, [editingTag]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          component: "form",
          onSubmit: async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries(formData.entries());
            await upsertTag(formJson);
          },
        },
      }}
    >
      <DialogTitle>{editingTag ? "Edit" : "Create"} Tag</DialogTitle>
      <DialogContent className={styles.dialogContent}>
        <TextField
          label="Name"
          id="name"
          name="name"
          required
          fullWidth
          defaultValue={editingTag?.name}
        />
        <TextField
          label="Description"
          id="description"
          name="description"
          required
          fullWidth
          defaultValue={editingTag?.description}
        />
        <FormControlLabel
          control={
            <Checkbox
              id="can_issue_oca"
              name="can_issue_oca"
              onChange={(e) => setShowVCFormFields(e.target.checked)}
              checked={showVCFormFields ?? false}
            />
          }
          label="Can Issue OCA"
        />
        {showVCFormFields && (
          <EditVCProperties vcProperties={editingTag?.vc_properties ?? {}} />
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="primary" type="submit">
          {editingTag ? "Update" : "Create"}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
