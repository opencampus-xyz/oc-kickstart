"use client";
import { CreateEditListing } from "@/components/admin/CreateEditListing";
import { Loading } from "@/components/common/Loading";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useParams } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

export default function ListingPage() {
  const params = useParams();
  console.log('Page params (full object):', JSON.stringify(params, null, 2));
  console.log('Page params type:', typeof params);
  console.log('Page params keys:', Object.keys(params));
  const { id } = params;
  console.log('Listing ID from params:', id);
  console.log('Current URL:', window.location.href);
  const fetchWithAuth = useAuthenticatedFetch();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchListingById = async () => {
    if (!id) {
      console.error('No listing ID provided in URL');
      enqueueSnackbar("No listing ID provided", { variant: "error" });
      return;
    }
    try {
      console.log('Fetching listing with ID:', id);
      const response = await fetchWithAuth(`/admin/listing/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch listing');
      }
      const data = await response.json();
      setListing(data);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || "Error fetching listing", { variant: "error" });
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchListingById().finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  return <CreateEditListing listing={listing} refetch={fetchListingById} />;
}
