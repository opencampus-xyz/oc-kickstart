"use client";
import { Loading } from "@/components/common/Loading";
import { ListingShareButton } from "@/components/listings/ListingShareButton";
import { useParams, useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import {
  Chip,
  Divider,
  Typography
} from "@mui/material";
import { format } from "date-fns";
import styles from "./listing.module.css";
import { useOCAuth } from "@opencampus/ocid-connect-js";
import { useUser } from "@/providers/UserProvider";
import { publicFetch } from "@/utils";

export default function ListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isInitialized } = useOCAuth();
  const { isRegisteredUser } = useUser();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [error, setError] = useState(null);

  const fetchListingById = async () => {
    try {
      const response = await publicFetch(`/listings/${id}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        // Get the error text to help with debugging
        const errorText = await response.text();
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorText
        });
        
        if (response.status === 500) {
          throw new Error('Server error: Unable to fetch listing. Please try again later.');
        } else if (response.status === 404) {
          throw new Error('Listing not found');
        } else {
          throw new Error(`Failed to fetch listing: ${response.status} ${response.statusText}`);
        }
      }
      const listingData = await response.json();
      setListing({
        ...listingData,
        sign_up_status: null
      });
    } catch (error) {
      console.error('Error fetching listing:', error);
      enqueueSnackbar(error.message || "Error fetching listing", { 
        variant: "error",
        autoHideDuration: 5000
      });
      router.push('/home');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    setLoading(true);
    fetchListingById();
  }, [id, isInitialized]);

  if (!isInitialized || loading) return <Loading />;
  if (!listing) return null;
  
  return (
    <div className={styles.pageContainer}>
      <div className={styles.listingContainer}>
        <div className={styles.header}>
          <Typography variant="h2">{listing.name}</Typography>
          {listing.vc_properties?.achievementType && (
            <Chip 
              label={listing.vc_properties.achievementType} 
              color="primary" 
              variant="outlined"
            />
          )}
          <ListingShareButton
            listing={listing}
            showShareDialog={showShareDialog}
            setShowShareDialog={setShowShareDialog}
          />
        </div>

        <Divider sx={{ my: 2 }} />

        <div className={styles.section}>
          <Typography variant="h6" color="text.secondary">About</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {listing.description}
          </Typography>
        </div>

        <div className={styles.section}>
          <Typography variant="h6" color="text.secondary">Details</Typography>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <Typography variant="subtitle2" color="text.secondary">Status</Typography>
              <Typography variant="body1">{listing.status}</Typography>
            </div>
            <div className={styles.detailItem}>
              <Typography variant="subtitle2" color="text.secondary">Sign Up Limit</Typography>
              <Typography variant="body1">{listing.sign_ups_limit || 'Unlimited'}</Typography>
            </div>
            <div className={styles.detailItem}>
              <Typography variant="subtitle2" color="text.secondary">Created</Typography>
              <Typography variant="body1">
                {format(new Date(listing.created_ts), 'PPP')}
              </Typography>
            </div>
            {listing.published_ts && (
              <div className={styles.detailItem}>
                <Typography variant="subtitle2" color="text.secondary">Published</Typography>
                <Typography variant="body1">
                  {format(new Date(listing.published_ts), 'PPP')}
                </Typography>
              </div>
            )}
          </div>
        </div>

        {listing.tag_names?.length > 0 && (
          <div className={styles.section}>
            <Typography variant="h6" color="text.secondary">Tags</Typography>
            <div className={styles.tagsContainer}>
              {listing.tag_names.map((tagName, index) => (
                tagName && <Chip key={index} label={tagName} variant="outlined" sx={{ mr: 1, mb: 1 }} />
              ))}
            </div>
          </div>
        )}

        {listing.vc_properties && (
          <div className={styles.section}>
            <Typography variant="h6" color="text.secondary">Achievement Details</Typography>
            <div className={styles.detailsGrid}>
              {listing.vc_properties.title && (
                <div className={styles.detailItem}>
                  <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                  <Typography variant="body1">{listing.vc_properties.title}</Typography>
                </div>
              )}
              {listing.vc_properties.achievementType && (
                <div className={styles.detailItem}>
                  <Typography variant="subtitle2" color="text.secondary">Achievement Type</Typography>
                  <Typography variant="body1">{listing.vc_properties.achievementType}</Typography>
                </div>
              )}
              {listing.vc_properties.expireInDays && (
                <div className={styles.detailItem}>
                  <Typography variant="subtitle2" color="text.secondary">Expires In</Typography>
                  <Typography variant="body1">{listing.vc_properties.expireInDays} days</Typography>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
