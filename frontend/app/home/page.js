"use client";
import { Loading } from "@/components/common/Loading";
import { SearchBar } from "@/components/common/SearchBar";
import { ListingCard } from "@/components/listings/ListingCard";
import { USER_LISTING_STATUSES } from "@/constants";
import useAuthenticatedFetch from "@/hooks/useAuthenticatedFetch";
import { useUser } from "@/providers/UserProvider";
import { publicFetch } from "@/db/utils";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
} from "@mui/material";
import { capitalize, keyBy } from "lodash";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState, useMemo } from "react";
import styles from "./home.module.css";
import { useSearchParams, useRouter } from "next/navigation";

const PAGE_SIZE = 9;

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTags, setSearchTags] = useState([]);
  const [searchText, setSearchText] = useState();
  const [searchStatus, setSearchStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [tags, setTags] = useState([]);
  const [total, setTotal] = useState(0);
  const { isRegisteredUser } = useUser();
  const fetchWithAuth = useAuthenticatedFetch();

  const tagsKeyById = useMemo(() => keyBy(tags, "id"), [tags]);

  const fetchListingsWithUserSignUps = async (params) => {
    try {
      const response = await fetchWithAuth(`/auth-user/listings?${params}`);
      const data = await response.json();
      setListings(data.listings);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error fetching listings", {
        variant: "error",
      });
    }
  };

  const fetchListingsForPublic = async (params) => {
    try {
      const response = await publicFetch(`/listings?${params}`);
      const data = await response.json();
      setListings(data.listings);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error fetching listings", {
        variant: "error",
      });
    }
  };

  const fetchListings = async (targetPage) => {
    setLoading(true);

    const params = getSearchParams(targetPage);
    if (isRegisteredUser) {
      await fetchListingsWithUserSignUps(params);
    } else {
      await fetchListingsForPublic(params);
    }
    setLoading(false);
  };

  const fetchTags = async () => {
    try {
      const response = await publicFetch("/tags");
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error fetching tags", {
        variant: "error",
      });
    }
  };

  useEffect(() => {
    fetchTags();
    fetchListings();
  }, [isRegisteredUser, searchTags, page, searchStatus]);

  useEffect(() => {
    const tagsParam = searchParams.get('tags');
    if (tagsParam === null) {
      if (searchTags.length > 0) {
        setSearchTags([]);
      }
    } else {
      const tagIds = tagsParam ? tagsParam.split(',') : [];
      const activeTagIds = tagIds.filter(id => tagsKeyById[id]);
      
      setSearchTags(activeTagIds);
      
      if (activeTagIds.length !== tagIds.length) {
        const params = new URLSearchParams(window.location.search);
        if (activeTagIds.length >= 1) {
          params.set('tags', activeTagIds.join(','));
        } else {
          params.delete('tags');
        }
        if (params.toString()) {
          router.push(`/home?${params.toString()}`);
        }
      }
    }
  }, [searchParams, tagsKeyById, router]);

  const handleChangeTags = (e) => {
    const newTags = e.target.value;
    setPage(1);
    setSearchTags(newTags);
    
    const params = new URLSearchParams(window.location.search);
    if (newTags.length >= 1) {
      params.set('tags', newTags.join(','));
    } else {
      params.delete('tags');
    }
    
    if (params.toString()) {
      router.push(`/home?${params.toString()}`);
    }
  };

  const handleChangeStatus = (e) => {
    setPage(1);
    setSearchStatus(e.target.value);
  };

  const getSearchParams = (targetPage) => {
    const params = new URLSearchParams();
    if (searchText?.length > 0) {
      params.append("searchTitle", searchText);
    }
    if (searchTags.length > 0) {
      params.append(
        "searchTags",
        searchTags.map((tag) => `'${tag}'`).join(",")
      );
    }

    const pageQuery = targetPage ?? page;
    params.append("page", pageQuery - 1);
    params.append("pageSize", PAGE_SIZE);
    params.append("searchStatus", searchStatus);

    return params;
  };

  const handleSearch = () => {
    fetchListings(1);
  };

  return (
    <div>
      <img src="/assets/banner.jpg" height="300" width="100%" />
      <div className={styles.pageContainer}>
        <div className={styles.searchContainer}>
          <SearchBar
            searchText={searchText}
            setSearchText={setSearchText}
            handleSearch={handleSearch}
          />
          <div className={styles.dropdownsContainer}>
            <FormControl sx={{ width: "100%" }}>
              <InputLabel>Search by Tags</InputLabel>
              <Select
                fullWidth
                multiple
                value={searchTags}
                onChange={handleChangeTags}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={tagsKeyById[value].name}/>
                    ))}
                  </Box>
                )}
              >
                {tags.map((tag) => (
                  <MenuItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {isRegisteredUser && (
              <FormControl sx={{ width: 200 }}>
                <InputLabel>Search by Status</InputLabel>
                <Select
                  fullWidth
                  value={searchStatus}
                  onChange={handleChangeStatus}
                >
                  {USER_LISTING_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {capitalize(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </div>
        </div>
        <div className={styles.paginationContainer}>
          <div>{total} listings found.</div>
          {listings.length > 0 && (
            <Pagination
              count={Math.ceil(total / PAGE_SIZE)}
              page={page}
              onChange={(e, page) => setPage(page)}
            />
          )}
        </div>
        <div className={styles.listingsContainer}>
          {loading ? (
            <Loading />
          ) : (
            listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}