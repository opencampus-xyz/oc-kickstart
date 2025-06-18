import { Button, Tooltip } from "@mui/material";
import { useState, useEffect } from "react";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import { enqueueSnackbar } from "notistack";

export const ListingSignUp = ({ listing, size = "medium" }) => {
  const [signUpStatus, setSignUpStatus] = useState(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { isRegisteredUser } = useUser();
  const fetchWithAuth = useAuthenticatedFetch();

  const fetchSignUpStatus = async () => {
    if (!isRegisteredUser) return;
    try {
      const response = await fetchWithAuth(`/auth-user/listing-signup-status/${listing.id}`);
      const data = await response.json();
      setSignUpStatus(data.sign_up_status);
    } catch (error) {
      console.error('Error fetching signup status:', error);
      enqueueSnackbar('Error fetching signup status', { variant: 'error' });
    }
  };

  useEffect(() => {
    fetchSignUpStatus();
  }, [listing.id, isRegisteredUser]);

  const handleSignUp = async () => {
    try {
      await fetchWithAuth("/auth-user/signup-for-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      setSignUpStatus('pending');
      enqueueSnackbar('Successfully signed up for listing', { variant: 'success' });
    } catch (error) {
      console.error('Error signing up for listing:', error);
      enqueueSnackbar(error.message || 'Error signing up for listing', { variant: 'error' });
    }
  };

  const disableSignUp = listing.status !== "active" || !!signUpStatus;
  const disableSignUpTooltip = () => {
    if (!isRegisteredUser) return "Please login to sign up for a listing";
    if (listing.status !== "active") return "This listing is not active";
    if (signUpStatus === "pending") return "Your sign up is pending approval";
    return "You have already signed up for this listing";
  };

  return (
    <Tooltip
      open={tooltipOpen}
      onOpen={() => setTooltipOpen(disableSignUp)}
      onClose={() => setTooltipOpen(false)}
      title={disableSignUpTooltip()}
    >
      <span>
        <Button
          variant="outlined"
          onClick={handleSignUp}
          disabled={disableSignUp}
          size={size}
        >
          Sign Up
        </Button>
      </span>
    </Tooltip>
  );
}; 