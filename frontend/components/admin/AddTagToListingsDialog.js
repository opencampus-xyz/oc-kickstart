import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { publicFetch } from "@/utils";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import styles from "./CreateEditTagDialog.module.css";

export const AddTagToListingsDialog = ({ open, onClose, tag }) => {
  const [selectedListings, setSelectedListings] = useState([]);
  const [listings, setListings] = useState([]);
  const fetchWithAuth = useAuthenticatedFetch();

  const getActiveListings = async () => {
    const response = await fetchWithAuth("/admin/listings");
    const data = await response.json();
    setListings(data.listings || data.data || []);
  };

  useEffect(() => {
    try {
      getActiveListings();
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error fetching listings", { variant: "error" });
    }
  }, []);

  const handleAddTagToListings = async () => {
    try {
      await fetchWithAuth("/admin/add-tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tag: tag.id,
          listings: selectedListings,
        }),
      });
      enqueueSnackbar("Tag added successfully", {
        variant: "success",
      });
      onClose();
      refetch();
    } catch (error) {
      enqueueSnackbar("Error adding tag", {
        variant: "error",
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Tag to Listings</DialogTitle>
      <DialogContent className={styles.dialogContent}>
        <Typography>Tag Name: {tag?.name}</Typography>
        <FormControl>
          <InputLabel id="listings-label">Listings</InputLabel>
          <Select
            labelId="listings-label"
            label="Listings"
            name="listings"
            multiple
            value={selectedListings}
            onChange={(event) => {
              setSelectedListings(event.target.value);
            }}
          >
            {listings.map((listing) => (
              <MenuItem value={listing.id}>{listing.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleAddTagToListings()}
        >
          Add
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
