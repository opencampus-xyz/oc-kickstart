import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./ListingCard.module.css";
import { ListingShareButton } from "./ListingShareButton";
import { ListingSignUp } from "./ListingSignUp";

export const ListingCard = ({ listing, refetch }) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const router = useRouter();

  return (
    <>
      <Card
        key={listing.id}
        sx={{ width: 300 }}
        variant="outlined"
        onClick={() => window.open(`/listings/${listing.id}`, "_blank")}
        className={styles.listingCardContainer}
      >
        <CardActionArea>
          <CardContent>
            <div className={styles.listingCardTitle}>
              <div>{listing.name}</div>
              <Chip label={listing.vc_properties.achievementType} />
            </div>
            <Typography variant="body2" component="div">
              {listing.description}
            </Typography>
          </CardContent>
        </CardActionArea>
        <CardActions>
          <ListingSignUp listing={listing} size="small" />
          <Tooltip title="Share Listing">
            <span>
              <ListingShareButton
                listing={listing}
                showShareDialog={showShareDialog}
                setShowShareDialog={setShowShareDialog}
              />
            </span>
          </Tooltip>
        </CardActions>
      </Card>
    </>
  );
};
