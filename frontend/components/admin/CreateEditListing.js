import { LISTING_TRIGGER_MODES } from "@/constants";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
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

export const CreateEditListing = ({ listing, refetch }) => {
  const fetchWithAuth = useAuthenticatedFetch();
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(listing?.tags ?? []);
  const [selectedTriggerMode, setSelectedTriggerMode] = useState(
    listing?.trigger_mode ?? "manual"
  );
  const [publishPopoverEl, setPublishPopoverEl] = useState(null);
  const isEdit = !!listing;
  const router = useRouter();

  useEffect(() => {
    setSelectedTags(listing?.tags ?? []);
    setSelectedTriggerMode(listing?.trigger_mode ?? "manual");
  }, [listing]);

  const createListing = async (formJson) => {
    try {
      const response = await fetchWithAuth("/admin/listing/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formJson),
      });
      const data = await response.json();
      
      // Wait a moment for the transaction to be committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the listing exists before navigating
      const verifyResponse = await fetchWithAuth(`/admin/listing/${data.id}`);
      if (!verifyResponse.ok) {
        throw new Error('Failed to verify listing was created');
      }
      
      enqueueSnackbar("Listing created successfully", { variant: "success" });
      return data;
    } catch (error) {
      console.error('Error in createListing:', error);
      enqueueSnackbar(error.message || "Error creating listing", { variant: "error" });
      throw error; // Re-throw to prevent navigation
    }
  };

  const updateListing = async (listingId, formJson) => {
    try {
      const response = await fetchWithAuth("/admin/listing/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: listingId, ...formJson }),
      });
      const data = await response.json();
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
      await fetchWithAuth("/admin/listing/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: listing.id }),
      });
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
      await fetchWithAuth("/admin/listing/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: listing.id }),
      });
      enqueueSnackbar("Listing deleted successfully", { variant: "success" });
      refetch();
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error deleting listing", { variant: "error" });
    }
  };

  const getActiveTags = async () => {
    const response = await fetchWithAuth("/public/tags");
    const data = response.json ? await response.json() : response;
    setTags(data.data || []);
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
    try {
      const formData = new FormData(event.currentTarget);
      const formJson = Object.fromEntries(formData.entries());
      formJson.tags = compact(selectedTags);
      
      if (isEdit) {
        await updateListing(listing.id, formJson);
      } else {
        const data = await createListing(formJson);
        if (data?.id) {
          router.push(`/admin/listings/${data.id}`);
        }
      }
    } catch (error) {
      console.error('Error in onSubmit:', error);
      // Error is already shown by createListing/updateListing
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
