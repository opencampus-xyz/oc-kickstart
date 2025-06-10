"use client";
import { Loading } from "@/components/common/Loading";
import { ListingShareButton } from "@/components/listings/ListingShareButton";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
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
  const { authState, isInitialized } = useOCAuth();
  const fetchWithAuth = useAuthenticatedFetch();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { user, isRegisteredUser } = useUser();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [error, setError] = useState(null);

  

  const fetchListingById = async () => {
    try {
      const listingData = await fetchWithAuth(`/admin/listing/${id}`);
      if (!listingData.ok) {
        throw new Error(`Failed to fetch listing: ${listingData.status}`);
      }
      const listingDetails = await listingData.json();
      setListing({
        ...listingDetails,
        sign_up_status: null
      });
    } catch (error) {
      console.error('Error fetching listing:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
        enqueueSnackbar("Please log in to view this listing", { variant: "error" });
        router.push('/login');
      } else {
        enqueueSnackbar("Error fetching listing", { variant: "error" });
        router.push('/home');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    setLoading(true);
    fetchListingById();
  }, [id, isInitialized, authState?.isAuthenticated]);

  if (!isInitialized || loading) return <Loading />;
  if (!authState?.isAuthenticated) return null;
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
