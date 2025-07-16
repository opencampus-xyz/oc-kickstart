import { Button, Tooltip } from "@mui/material";
import { useState, useEffect } from "react";
import { useUser } from "@/providers/UserProvider";
import { enqueueSnackbar } from "notistack";
import { useRouter } from "next/navigation";
import { useApi } from "@/providers/ApiProvider";

export const ListingSignUp = ({ listing, size = "medium" }) => {
  const [signUpStatus, setSignUpStatus] = useState(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { isRegisteredUser } = useUser();
  const { apiService } = useApi();
  const router = useRouter();

  const fetchSignUpStatus = async () => {
    if (!isRegisteredUser) return;
    try {
      const data = await apiService.getUserListingSignUpStatus(listing.id);
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
    if (!isRegisteredUser) {
      // Redirect to login page with return URL
      const currentUrl = encodeURIComponent(window.location.href);
      router.push(`/login?originUrl=${currentUrl}`);
      return;
    }

    try {
      await apiService.signupForListing(listing.id);
      setSignUpStatus('pending');
      enqueueSnackbar('Successfully signed up for listing', { variant: 'success' });
    } catch (error) {
      console.error('Error signing up for listing:', error);
      enqueueSnackbar(error.message || 'Error signing up for listing', { variant: 'error' });
    }
  };

  const disableSignUp = listing.status !== "active" || !!signUpStatus;
  const disableSignUpTooltip = () => {
    if (!isRegisteredUser) return "Click to login and sign up for this listing";
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