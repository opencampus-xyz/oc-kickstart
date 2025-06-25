"use client";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { Loading } from "@/components/common/Loading";
import { publicFetch } from "@/db/utils";
import { Pagination, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";
import styles from "../home/home.module.css";

const PAGE_SIZE = 9;
export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const searchParams = useSearchParams();
  const ocid = searchParams.get("ocid");

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("pageSize", PAGE_SIZE);
      const response = await publicFetch(`/achievements/${ocid}?${params}`);
      const { data, total } = await response.json();
      setAchievements(data);
      setTotal(total);
      setLoading(false);
    } catch (error) {
      enqueueSnackbar("Error fetching achievements", {
        variant: "error",
      });
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAchievements();
  }, [page]);

  return (
    <div className={styles.pageContainer}>
      <Typography variant="h2">Achievements</Typography>
      <div className={styles.paginationContainer}>
        <div>{total} achievements found.</div>
        {achievements.length > 0 && (
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
          achievements.map((achievement, index) => (
            <AchievementCard key={`${achievement.id}_${index}`} achievement={achievement} />
          ))}
      </div>
    </div>
  );
}
