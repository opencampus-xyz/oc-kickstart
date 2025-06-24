"use client";
import { Loading } from "@/components/common/Loading";
import { useParams, useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { publicFetch } from "@/db/utils";
import { ListingDetails } from "@/components/listings/ListingDetails";

export default function ListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchListingById = async () => {
    try {
      const response = await publicFetch(`/listings/${id}`);
      if (!response.ok) {
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
      const data = await response.json();
      setListing({
        ...data,
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
    setLoading(true);
    fetchListingById();
  }, [id]);

  if (loading) return <Loading />;
  if (!listing) return null;
  
  return (
    <ListingDetails listing={listing} />
  );
}
