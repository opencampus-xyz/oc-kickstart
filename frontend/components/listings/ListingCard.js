import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import {
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useState } from "react";
import styles from "./ListingCard.module.css";
import { ListingCardDetailsDialog } from "./ListingCardDetailsDialog";

export const ListingCard = ({ listing, refetch }) => {
  const { user, isRegisteredUser } = useUser();
  const fetchWithAuth = useAuthenticatedFetch();
  const [loading, setLoading] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const router = useRouter();
  const signUpForListing = async (e, listingId) => {
    e.stopPropagation();
    if (!isRegisteredUser) {
      router.push("/login");
      return;
    }
    if (!user.name) {
      enqueueSnackbar("Please update your username to sign up for a listing", {
        variant: "error",
      });
      router.push("/user-dashboard/profile");
      return;
    }
    setLoading(true);
    await fetchWithAuth("/auth-user/signup-for-listing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });
    setLoading(false);
    refetch();
  };

  const disableSignUp = !!listing.sign_up_status;
  const disableSignUpTooltip = () => {
    if (!isRegisteredUser) return "Please login to sign up for a listing";
    if (listing.sign_up_status === "pending")
      return "Your sign up is pending approval";
    return "You have already signed up for this listing";
  };

  return (
    <>
      <Card
        key={listing.id}
        sx={{ width: 300 }}
        variant="outlined"
        onClick={() => setShowDetailsDialog(true)}
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
          <Tooltip
            open={tooltipOpen}
            onOpen={() => setTooltipOpen(disableSignUp)}
            onClose={() => setTooltipOpen(false)}
            title={disableSignUpTooltip()}
          >
            <span>
              <Button
                size="small"
                color="primary"
                onClick={(e) => signUpForListing(e, listing.id)}
                loading={loading}
                disabled={disableSignUp}
              >
                Sign Up
              </Button>
            </span>
          </Tooltip>
        </CardActions>
      </Card>
      <ListingCardDetailsDialog
        listing={listing}
        setShowDetailsDialog={setShowDetailsDialog}
        showDetailsDialog={showDetailsDialog}
      />
    </>
  );
};
