import { LISTING_TRIGGER_MODES } from "@/constants";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { compact } from "lodash";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import styles from "./CreateEditListing.module.css";
import { EditVCProperties } from "./EditVCProperties";
import { useApi } from "@/providers/ApiProvider";

export const CreateEditListing = ({ listing, refetch }) => {
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(listing?.tags ?? []);
  const [selectedTriggerMode, setSelectedTriggerMode] = useState(
    listing?.trigger_mode ?? "manual"
  );
  const [publishPopoverEl, setPublishPopoverEl] = useState(null);
  const isEdit = !!listing;
  const router = useRouter();
  const { apiService } = useApi();

  useEffect(() => {
    setSelectedTags(listing?.tags ?? []);
    setSelectedTriggerMode(listing?.trigger_mode ?? "manual");
  }, [listing]);

  const createListing = async (formJson) => {
    try {
      const data = await apiService.adminCreateListing(formJson);
      enqueueSnackbar("Listing created successfully", { variant: "success" });

      return data;
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error creating listing", { variant: "error" });
    }
  };

  const updateListing = async (listingId, formJson) => {
    try {
      const data = await apiService.adminUpdateListing(listingId, formJson);
      enqueueSnackbar("Listing updated successfully", { variant: "success" });
      refetch();
      return data;
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error updating listing", { variant: "error" });
    }
  };

  const publishListing = async () => {
    try {
      if (!listing) {
        enqueueSnackbar("Listing not found, please save the listing first.", {
          variant: "error",
        });
        return;
      }
      await apiService.adminPublishListing(listing.id);
      setPublishPopoverEl(null);
      enqueueSnackbar("Listing published successfully", { variant: "success" });
      refetch();
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error publishing listing", { variant: "error" });
    }
  };

  const deleteListing = async () => {
    try {
      await apiService.adminDeleteListing(listing.id);
      enqueueSnackbar("Listing deleted successfully", { variant: "success" });
      refetch();
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error deleting listing", { variant: "error" });
    }
  };

  const getActiveTags = async () => {
    const data = await apiService.publicGetTags();
    setTags(data);
  };

  useEffect(() => {
    try {
      getActiveTags();
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error fetching tags", { variant: "error" });
    }
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries(formData.entries());
    formJson.tags = compact(selectedTags);
    if (isEdit) {
      await updateListing(listing.id, formJson);
    } else {
      const data = await createListing(formJson);

      router.push(`/admin/listings/${data.id}`);
    }
  };

  return (
    <form onSubmit={onSubmit} className={styles.formContainer}>
      <div className={styles.heading}>
        <Typography variant="h4">
          {isEdit
            ? `Edit Listing: ${listing.name} (${listing.status})`
            : "Create Listing"}
        </Typography>
        {isEdit && (
          <Button onClick={() => router.push(`/admin/signups/${listing.id}`)}>
            View SignUps
          </Button>
        )}
      </div>
      <TextField
        label="Name"
        name="name"
        required
        slotProps={{ inputLabel: { shrink: true } }}
        defaultValue={listing?.name}
      />
      <TextField
        label="Description"
        name="description"
        required
        defaultValue={listing?.description}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <FormControl>
        <InputLabel id="trigger-mode-label">Trigger Mode</InputLabel>
        <Select
          labelId="trigger-mode-label"
          label="Trigger Mode"
          name="triggerMode"
          required
          value={selectedTriggerMode}
          onChange={(event) => {
            setSelectedTriggerMode(event.target.value);
          }}
        >
          {LISTING_TRIGGER_MODES.map((mode) => (
            <MenuItem value={mode}>{mode}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Max Sign Ups"
        name="maxSignUps"
        required
        defaultValue={listing?.sign_ups_limit}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <EditVCProperties vcProperties={listing?.vc_properties} />
      <FormControl>
        <InputLabel id="tags-label">Tags</InputLabel>
        <Select
          labelId="tags-label"
          label="Tags"
          name="tags"
          multiple
          value={selectedTags}
          onChange={(event) => {
            setSelectedTags(event.target.value);
          }}
        >
          {tags.map((tag) => (
            <MenuItem value={tag.id}>{tag.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button type="submit">Save</Button>
      <Button
        onClick={(e) => setPublishPopoverEl(e.currentTarget)}
        disabled={!listing || listing.status !== "draft"}
      >
        Publish
      </Button>
      <Popover
        onClose={() => setPublishPopoverEl(null)}
        open={!!publishPopoverEl}
        anchorEl={publishPopoverEl}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: 60, horizontal: "center" }}
      >
        <div
          style={{
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 16,
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div>Are you sure to publish this listing?</div>
          <Button color="primary" variant="contained" onClick={publishListing}>
            Confirm
          </Button>
        </div>
      </Popover>
      <Button onClick={deleteListing} disabled={!listing}>
        Delete
      </Button>
    </form>
  );
};