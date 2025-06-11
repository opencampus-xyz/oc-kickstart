import { Router } from "express";
import db from "../db.js";
import { asyncWrapper, queryWithPagination } from "../utils.js";
const router = new Router();

const registeredUserMiddleware = asyncWrapper(async (req, res, next) => {
  const ocid = req.authenticatedUser;
  const userQueryStr = "SELECT * FROM users WHERE oc_id = $1 LIMIT 1";
  const userResult = await db.query(userQueryStr, [ocid]);
  if (userResult.rows.length === 0) {
    return next(new Error("User not found"));
  }
  req.user = userResult.rows[0];
  next();
});

router.use(registeredUserMiddleware);

router.post(
  "/update-username",
  asyncWrapper(async (req, res) => {
    const { username } = req.body;
    const ocid = req.authenticatedUser;
    const updateUsernameQueryStr = `
    UPDATE users SET name = $1 WHERE oc_id = $2
    `;
    await db.query(updateUsernameQueryStr, [username, ocid]);
    res.json({ message: "Username updated successfully" });
  })
);

router.get(
  "/listings",
  asyncWrapper(async (req, res) => {
    const { searchTitle, searchTags, page, pageSize, searchStatus } = req.query;

    let searchQueryStr = [];
    if (searchTags) {
      searchQueryStr.push(
        `tags.id = all (select id from tags where id in (${searchTags}))`
      );
    }

    if (searchTitle) {
      searchQueryStr.push(`listings.name like '%${searchTitle}%'`);
    }

    if (searchStatus !== "all") {
      searchQueryStr.push(`user_listings.status = '${searchStatus}'`);
    }
    const listingsQueryStr = `
    SELECT listings.*, 
    user_listings.status as sign_up_status, 
    array_agg(tags.name) as tag_names,
    array_agg(tags.id) as tag_ids,
    count(*) OVER() AS total
    FROM listings
    LEFT JOIN user_listings on listings.id = user_listings.listing_id
	  AND user_listings.user_id = $1
    LEFT JOIN listing_tags on listing_tags.listing_id = listings.id
    LEFT JOIN tags on tags.id = listing_tags.tag_id
    WHERE listings.status = 'active' and tags.archived_ts is null
    ${searchQueryStr.length > 0 ? `and ${searchQueryStr.join(" and ")}` : []}
    GROUP BY listings.id, user_listings.status
    ORDER BY listings.created_ts desc
    `;

    const { result, total } = await queryWithPagination(
      listingsQueryStr,
      { pageSize, page },
      [req.user.id]
    );
    res.json({
      listings: result,
      total,
    });
  })
);

router.post(
  "/signup-for-listing",
  asyncWrapper(async (req, res) => {
    const { listingId } = req.body;
    const user = req.user;
    if (!user.name) {
      throw new Error("Missing username for signing up for listing");
    }

    const userListingQueryStr = `
    SELECT sign_ups_limit::int, 
    COUNT(case when ul.user_id = $2 and ul.status IN ('approved', 'pending') THEN 1 END)::int as user_sign_up_count,
    COUNT(case when ul.status = 'approved' THEN 1 END)::int as sign_ups_count 
    FROM user_listings ul LEFT JOIN listings ON ul.listing_id = listings.id 
    WHERE ul.listing_id = $1
    GROUP BY listings.id
    `;
    const userListingResult = await db.query(userListingQueryStr, [
      listingId,
      user.id.toString(),
    ]);
    const userListingData = userListingResult.rows[0];
    if (
      userListingData &&
      userListingData.sign_ups_limit &&
      userListingData.sign_ups_limit <= userListingData.sign_ups_count
    ) {
      throw new Error("Listing signups limit reached");
    }

    if (userListingData && userListingData.user_sign_up_count > 0) {
      throw new Error("You've already signed up for this listing.");
    }

    const signUpForListingQueryStr = `
    INSERT INTO user_listings (listing_id, user_id, status) VALUES ($1, $2, 'pending')
    `;
    await db.query(signUpForListingQueryStr, [listingId, req.user.id]);
    res.json({ message: "Signed up for listing successfully" });
  })
);

router.get(
  "/sign-ups",
  asyncWrapper(async (req, res) => {
    const { page, pageSize, searchText } = req.query;
    const signUpsQueryStr = `
    SELECT l.name as listing_name, l.id, ul.status as user_listing_status, ul.created_ts,
    COUNT(case when vij.status IS NOT NULL AND vij.listing_id = ul.listing_id THEN 1 END)::int as vc_count,
    COUNT(case when vij.status = 'pending' AND vij.listing_id = ul.listing_id THEN 1 END)::int as vc_pending_count,
    COUNT(case when vij.status = 'failed' AND vij.listing_id = ul.listing_id THEN 1 END)::int as vc_failed_count,
    COUNT(*) OVER() AS total  
    FROM user_listings ul
    LEFT JOIN vc_issue_jobs vij on vij.user_id = ul.user_id
    LEFT JOIN listings l on ul.listing_id = l.id
    WHERE ul.user_id = $1 ${
      searchText?.length > 0 ? `and l.name LIKE '%${searchText}%'` : ""
    }
    GROUP BY l.name, l.id, ul.status, ul.created_ts
    ORDER BY l.created_ts DESC
    `;

    const { result, total } = await queryWithPagination(
      signUpsQueryStr,
      { page, pageSize },
      [req.user.id]
    );
    const signupsWithVCStatus = result.map((row) => {
      const { vc_pending_count, vc_failed_count, vc_count } = row;
      const vcStatus =
        vc_pending_count > 0
          ? "pending"
          : vc_failed_count > 0
          ? "failed"
          : "success";
      return { ...row, vc_issue_status: vc_count > 0 ? vcStatus : null };
    });
    res.json({ data: signupsWithVCStatus, total });
  })
);

router.get(
  "/listing-signup-status/:listingId",
  asyncWrapper(async (req, res) => {
    const { listingId } = req.params;
    const signUpStatusQueryStr = `
      select status as sign_up_status
      from user_listings
      where user_id = $1 and listing_id = $2
      limit 1
    `;
    const result = await db.query(signUpStatusQueryStr, [req.user.id, listingId]);
    res.json({ sign_up_status: result.rows[0]?.sign_up_status || null });
  })
);

export default router;
