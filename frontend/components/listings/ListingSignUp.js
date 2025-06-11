import { Button, Tooltip } from "@mui/material";
import { useState, useEffect } from "react";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";

export const ListingSignUp = ({ listing, size = "medium" }) => {
  const [signUpStatus, setSignUpStatus] = useState(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { isRegisteredUser } = useUser();
  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {
    if (!isRegisteredUser) return;
    fetchWithAuth(`/auth-user/listing-signup-status/${listing.id}`)
      .then(res => res.json())
      .then(data => setSignUpStatus(data.sign_up_status));
  }, [listing.id, isRegisteredUser]);

  const handleSignUp = () => {
    fetchWithAuth("/auth-user/signup-for-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id }),
    }).then(() => setSignUpStatus('pending'));
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