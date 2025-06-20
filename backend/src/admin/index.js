import { Router } from "express";
import { createVCIssueJobs } from "../create-vc-issue-jobs.js";
import db from "../db.js";
import { asyncWrapper, queryWithPagination } from "../utils.js";

const router = new Router();

const adminAuthMiddleware = asyncWrapper(async (req, res, next) => {
  const ocid = req.authenticatedUser;
  const adminQueryStr = `
    SELECT admin_ocids FROM admin_configs
    `;
  const adminResult = await db.query(adminQueryStr);
  const adminOcids = adminResult.rows[0]?.admin_ocids ?? [];
  const isAdmin = adminOcids.includes(ocid);
  const isMasterAdmin = process.env.MASTER_ADMIN_OCID === req.authenticatedUser;
  if (!isAdmin && !isMasterAdmin) {
    throw new Error("Unauthorized");
  }
  next();
});

router.use(adminAuthMiddleware);

router.post(
  "/tag",
  asyncWrapper(async (req, res) => {
    const {
      name,
      description,
      can_issue_oca,
      method,
      title,
      achievementType,
      expireInDays,
    } = req.body;
    if (method === "create") {
      const existingTag = await db.query("SELECT * FROM tags WHERE name = $1", [
        name,
      ]);
      if (existingTag.rows.length > 0) {
        throw new Error("Tag already exists");
      }
    }

    const vc_properties = {
      title,
      achievementType,
      expireInDays,
    };
    const upsertTagQueryStr = `
    INSERT INTO tags (name, description, can_issue_oca, vc_properties) VALUES ($1, $2, $3, $4) 
    ON CONFLICT (name) DO UPDATE SET description = $2, can_issue_oca = $3, vc_properties = $4 RETURNING id, name
      `;
    const tag = await db.query(upsertTagQueryStr, [
      name,
      description,
      can_issue_oca,
      vc_properties,
    ]);
    res.json(tag.rows[0]);
  })
);

router.post(
  "/tag/archive/:id",
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const tag = await db.query(
      "UPDATE tags SET archived_ts = $1 WHERE id = $2",
      [new Date(), id]
    );
    res.json(tag.rows[0]);
  })
);

router.get(
  "/listings",
  asyncWrapper(async (req, res) => {
    const { page, pageSize, searchText } = req.query;
    const { result, total } = await queryWithPagination(
      `
      SELECT listings.id, listings.name, listings.description, listings.created_ts , listings.published_ts, listings.status, 
      COUNT(*) OVER() AS total, COUNT(case when ul.listing_id = listings.id THEN 1 END)::int as signups_count FROM listings
      LEFT JOIN user_listings ul on ul.listing_id = listings.id
      ${searchText?.length ? `WHERE listings.name LIKE '%${searchText}%'` : ""}
      GROUP BY listings.id
      ORDER BY listings.created_ts DESC
      `,
      { page, pageSize }
    );
    res.json({ data: result, total });
  })
);

router.get(
  "/listing/:id",
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const listing = await db.query(
      `SELECT l.*, lt.tag_id as tag_id FROM listings l 
left join listing_tags lt on l.id = lt.listing_id
where l.id = $1`,
      [id]
    );
    const tags = listing.rows.map((row) => row.tag_id);
    const result = {
      ...listing.rows[0],
      tags,
    };
    res.json(result);
  })
);

router.get(
  "/listing/signups/:id",
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const signups = await db.query(
      `
      SELECT ul.user_id, ul.listing_id, ul.created_ts , ul.status, u.name as user_name, u.oc_id as user_oc_id, l.trigger_mode as trigger_mode, 
      COUNT (case when vij.status IS NOT NULL AND vij.listing_id = ul.listing_id THEN 1 END)::int as vc_count,
      COUNT(case when vij.status = 'pending' AND vij.listing_id = ul.listing_id THEN 1 END)::int as vc_pending_count,
      COUNT(case when vij.status = 'failed' AND vij.listing_id = ul.listing_id THEN 1 END)::int as vc_failed_count 
      FROM user_listings ul 
      LEFT JOIN users u on ul.user_id = u.id
      LEFT JOIN listings l on ul.listing_id = l.id
      LEFT JOIN vc_issue_jobs vij on vij.user_id = ul.user_id and vij.listing_id = ul.listing_id
      WHERE ul.listing_id = $1
      GROUP BY ul.user_id, ul.listing_id, ul.status, u.name, u.oc_id, l.trigger_mode, ul.created_ts
      ORDER BY ul.status asc
    `,
      [id]
    );

    const signupsWithVCStatus = signups.rows.map((row) => {
      const { vc_pending_count, vc_failed_count, vc_count } = row;
      const vcStatus =
        vc_pending_count > 0
          ? "pending"
          : vc_failed_count > 0
          ? "failed"
          : "success";
      return { ...row, vc_issue_status: vc_count > 0 ? vcStatus : null };
    });

    res.json(signupsWithVCStatus);
  })
);

router.post(
  "/listing/signups/update-status",
  asyncWrapper(async (req, res) => {
    const { userId, listingId, status } = req.body;
    const signup = await db.query(
      "UPDATE user_listings SET status = $3 WHERE user_id = $1 AND listing_id = $2",
      [userId, listingId, status]
    );

    const listing = await db.query(
      "SELECT trigger_mode FROM listings WHERE id = $1",
      [listingId]
    );
    const triggerMode = listing.rows[0].trigger_mode;
    if (triggerMode === "auto" && status === "completed") {
      await createVCIssueJobs(userId, listingId);
    }
    res.json(signup.rows[0]);
  })
);

router.post(
  "/listing/signups/issue-oca",
  asyncWrapper(async (req, res) => {
    const { userId, listingId } = req.body;
    await createVCIssueJobs(userId, listingId);

    res.json({ success: true });
  })
);

router.post(
  "/listing/create",
  asyncWrapper(async (req, res) => {
    const {
      name,
      description,
      triggerMode,
      maxSignUps,
      achievementType,
      expireInDays,
      tags,
      title,
    } = req.body;
    const vc_properties = {
      title,
      achievementType,
      expireInDays: expireInDays ? parseInt(expireInDays) : null,
    };

    const client = await db.connect();
    await client.query("BEGIN");
    try {
      const listing = await client.query(
        "INSERT INTO listings (name, description, trigger_mode, sign_ups_limit, vc_properties) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [
          name,
          description,
          triggerMode.toLowerCase(),
          parseInt(maxSignUps),
          vc_properties,
        ]
      );
      const createdListing = listing.rows[0];
      for (const tag of tags) {
        await client.query(
          "INSERT INTO listing_tags (listing_id, tag_id) VALUES ($1, $2)",
          [createdListing.id, tag]
        );
      }
      await client.query("COMMIT");
      res.json(createdListing);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.release();
    }
  })
);

router.post(
  "/listing/update",
  asyncWrapper(async (req, res) => {
    const {
      id,
      name,
      description,
      triggerMode,
      maxSignUps,
      achievementType,
      expireInDays,
      tags,
    } = req.body;
    const vc_properties = {
      title: name,
      achievementType,
      expireInDays: expireInDays ? parseInt(expireInDays) : null,
    };
    const client = await db.connect();
    await client.query("BEGIN");
    try {
      await db.query(
        "UPDATE listings SET name = $1, description = $2, trigger_mode = $3, sign_ups_limit = $4, vc_properties = $5 WHERE id = $6",
        [
          name,
          description,
          triggerMode,
          parseInt(maxSignUps),
          vc_properties,
          id,
        ]
      );
      await client.query("DELETE FROM listing_tags WHERE listing_id = $1", [
        id,
      ]);
      for (const tag of tags) {
        await client.query(
          "INSERT INTO listing_tags (listing_id, tag_id) VALUES ($1, $2)",
          [id, tag]
        );
      }
      await client.query("COMMIT");
      res.json({ id });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.release();
    }
  })
);

router.post(
  "/listing/publish",
  asyncWrapper(async (req, res) => {
    const { id } = req.body;
    const listing = await db.query(
      "UPDATE listings SET published_ts = $2, status = 'active' WHERE id = $1",
      [id, new Date()]
    );
    res.json(listing.rows[0]);
  })
);

router.post(
  "/listing/delete",
  asyncWrapper(async (req, res) => {
    const { id } = req.body;
    const listing = await db.query(
      "UPDATE listings SET status = 'deleted', deleted_ts = $2 WHERE id = $1",
      [id, new Date()]
    );
    res.json(listing.rows[0]);
  })
);

router.get(
  "/users",
  asyncWrapper(async (req, res) => {
    const { page, pageSize, searchText } = req.query;
    const { result, total } = await queryWithPagination(
      `
      SELECT *, COUNT (*) OVER() as total FROM users
      ${
        searchText?.length > 0 ? `WHERE search_text LIKE '%${searchText}%'` : ""
      }
      ORDER BY users.created_ts
      `,
      { page, pageSize }
    );
    res.json({ data: result, total });
  })
);

router.get(
  "/tags",
  asyncWrapper(async (req, res) => {
    const { page, pageSize, searchText } = req.query;
    const { result, total } = await queryWithPagination(
      `
        SELECT *, count(*) OVER() AS total
        FROM tags 
        WHERE archived_ts IS NULL ${
          searchText?.length > 0 ? `AND tags.name LIKE '%${searchText}%'` : ""
        }
        ORDER BY tags.created_ts DESC`,
      { page, pageSize }
    );
    res.json({ data: result, total });
  })
);

router.post(
  "/add-tag",
  asyncWrapper(async (req, res) => {
    const { tag, listings } = req.body;
    for (const listing of listings) {
      await db.query(
        "INSERT INTO listing_tags (listing_id, tag_id) VALUES ($1, $2)",
        [listing, tag]
      );
    }

    res.json({ status: "successful" });
  })
);

export default router;
