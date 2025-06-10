import { format } from "date-fns";
import { Chip, Divider, Typography } from "@mui/material";
import { ListingShareButton } from "./ListingShareButton";
import styles from "./ListingDetails.module.css";
import { useState } from "react";

export const ListingDetails = ({ listing }) => {
const [showShareDialog, setShowShareDialog] = useState(false);
  return <div className={styles.pageContainer}>
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
};