import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
} from "@mui/material";
import styles from "./ListingCardDetailsDialog.module.css";

export const ListingCardDetailsDialog = ({
  showDetailsDialog,
  setShowDetailsDialog,
  listing,
}) => {
  return (
    <Dialog
      open={showDetailsDialog}
      onClose={() => setShowDetailsDialog(false)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {listing.name} <Chip label={listing.vc_properties.achievementType} />
      </DialogTitle>
      <DialogContent>
        <div className={styles.aboutHeader}>About:</div>
        <div className={styles.aboutContent}>{listing.description}</div>
        <Divider />
        <div className={styles.detailContainer}>
          <div>Sign Up Limit:</div>
          <div>{listing.sign_ups_limit}</div>
        </div>
        <div className={styles.tagsContainer}>
          {listing.tag_names.map((tagName, index) => {
            if (tagName) {
              return <Chip key={index} label={tagName} variant="outlined" />;
            }
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};