"use client";
import { Loading } from "@/components/common/Loading";
import { useParams, useRouter } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { ListingDetails } from "@/components/listings/ListingDetails";
import { useApi } from "@/providers/ApiProvider";

export default function ListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { apiService } = useApi();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchListingById = async () => {
    try {
      const data = await apiService.publicGetListingById(id);
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
