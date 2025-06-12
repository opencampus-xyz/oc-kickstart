"use client";
import { Loading } from "@/components/common/Loading";
import { SearchBar } from "@/components/common/SearchBar";
import { ListingCard } from "@/components/listings/ListingCard";
import { USER_LISTING_STATUSES } from "@/constants";
import { useDB } from "@/hooks/useDB";
import { useUser } from "@/providers/UserProvider";
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
import { Suspense, useEffect, useState } from "react";
import styles from "./home.module.css";

const PAGE_SIZE = 9;

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTags, setSearchTags] = useState([]);
  const [searchText, setSearchText] = useState();
  const [searchStatus, setSearchStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [tags, setTags] = useState([]);
  const [total, setTotal] = useState(0);
  const { isRegisteredUser, user } = useUser();
  const { db, isInitialized, error: dbError } = useDB();

  const fetchListings = async (targetPage) => {
    if (!isInitialized || !db) {
      return; // Don't try to fetch if DB isn't ready
    }

    setLoading(true);
    try {
      const result = await db.getListings({
        page: (targetPage ?? page) - 1,
        pageSize: PAGE_SIZE,
        searchText,
        searchTags,
        searchStatus: searchStatus === 'all' ? null : searchStatus,
        includeUserSignups: isRegisteredUser,
        userId: user?.id
      });
      setListings(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error fetching listings", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    if (!isInitialized || !db) {
      return; // Don't try to fetch if DB isn't ready
    }

    try {
      const result = await db.getTags();
      setTags(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("Error fetching tags", {
        variant: "error",
      });
      setTags([]); // Set empty array on error
    }
  };

  useEffect(() => {
    if (isInitialized && db) {
      fetchTags();
      fetchListings();
    }
  }, [isInitialized, db, isRegisteredUser, searchTags, page, searchStatus]);

  const handleChangeTags = (e) => {
    setPage(1);
    setSearchTags(e.target.value);
  };

  const handleChangeStatus = (e) => {
    setPage(1);
    setSearchStatus(e.target.value);
  };

  const handleSearch = () => {
    fetchListings(1);
  };

  if (dbError) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Database</h2>
        <p>{dbError.message}</p>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  if (!isInitialized || !db) {
    return (
      <div className={styles.loadingContainer}>
        <Loading />
        <p>Initializing database...</p>
      </div>
    );
  }

  const tagsKeyById = keyBy(tags || [], "id");
  return (
    <Suspense fallback={
      <div className={styles.loadingContainer}>
        <Loading />
        <p>Loading...</p>
      </div>
    }>
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
                        <Chip 
                          key={value} 
                          label={tagsKeyById[value]?.name || value} 
                        />
                      ))}
                    </Box>
                  )}
                >
                  {(tags || []).map((tag) => (
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
            {loading && <Loading />}
            {!loading &&
              listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  refetch={() => fetchListings(page)}
                />
              ))}
          </div>
        </div>
      </div>
    </Suspense>
  );
}
