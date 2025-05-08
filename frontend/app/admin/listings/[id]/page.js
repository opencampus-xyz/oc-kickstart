"use client";
import { CreateEditListing } from "@/components/admin/CreateEditListing";
import { Loading } from "@/components/common/Loading";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useParams } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

export default function ListingPage() {
  const { id } = useParams();
  const fetchWithAuth = useAuthenticatedFetch();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchListingById = async () => {
    try {
      const data = await fetchWithAuth(`/admin/listing/${id}`);
      const listing = await data.json();
      setListing(listing);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error fetching listing", { variant: "error" });
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchListingById();
    setLoading(false);
  }, [id]);

  if (loading) return <Loading />;
  return <CreateEditListing listing={listing} refetch={fetchListingById} />;
}
