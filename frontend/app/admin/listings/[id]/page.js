"use client";
import { CreateEditListing } from "@/components/admin/CreateEditListing";
import { Loading } from "@/components/common/Loading";
import { useApi } from "@/providers/ApiProvider";
import { useParams } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

export default function ListingPage() {
  const { id } = useParams();
  const { apiService } = useApi();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchListingById = async () => {
    try {
      const listing = await apiService.adminGetListingById(id);
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