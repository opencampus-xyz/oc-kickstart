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

router.put(
  "/tag/:tagId",
  asyncWrapper(async (req, res) => {
    const {
      name,
      description,
      can_issue_oca,
      title,
      achievementType,
      expireInDays,
    } = req.body;
    const { tagId } = req.params;
      const existingTag = await db.query("SELECT * FROM tags WHERE name = $1 and id != $2", [
        name,
        tagId
      ]);
      if (existingTag.rows.length > 0) {
        throw new Error("Tag with the same name already exists");
      }

    const vc_properties = {
      title,
      achievementType,
      expireInDays,
    };
    const updateTagQueryStr = `
    UPDATE tags 
    SET name = $1, description = $2, can_issue_oca = $3, vc_properties = $4 
    WHERE id = $5
    RETURNING *
      `;
    const tag = await db.query(updateTagQueryStr, [
      name,
      description,
      can_issue_oca,
      vc_properties,
      tagId
    ]);
    res.json(tag.rows[0]);
  })
);

router.post(
  "/tag",
  asyncWrapper(async (req, res) => {
    const {
      name,
      description,
      can_issue_oca,
      title,
      achievementType,
      expireInDays,
    } = req.body;
      const existingTag = await db.query("SELECT * FROM tags WHERE name = $1", [
        name,
      ]);
      if (existingTag.rows.length > 0) {
        throw new Error("Tag already exists");
      }

    const vc_properties = {
      title,
      achievementType,
      expireInDays,
    };
    const insertTagQueryStr = `
    INSERT INTO tags (name, description, can_issue_oca, vc_properties) VALUES ($1, $2, $3, $4) RETURNING *
      `;
    const tag = await db.query(insertTagQueryStr, [
      name,
      description,
      can_issue_oca,
      vc_properties,
    ]);
    res.json(tag.rows[0]);
  })
);

router.post(
  "/tag/:id/archive",
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
  "/listings/:id",
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
  "/listings/:id/signups",
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

router.put(
  "/listings/:listingId/signups/:userId",
  asyncWrapper(async (req, res) => {
    const { listingId, userId } = req.params;
    const { status } = req.body;
    const signup = await db.query(
      "UPDATE user_listings SET status = $3 WHERE user_id = $1 AND listing_id = $2 RETURNING *",
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
  "/listings/:listingId/issue",
  asyncWrapper(async (req, res) => {
    const {listingId} = req.params;
    const { userId } = req.body;
    await createVCIssueJobs(userId, listingId);

    res.json({ success: true });
  })
);

router.post(
  "/listings",
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

router.put(
  "/listings/:listingId",
  asyncWrapper(async (req, res) => {
    const { listingId } = req.params;
    const {
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
      await client.query(
        "UPDATE listings SET name = $1, description = $2, trigger_mode = $3, sign_ups_limit = $4, vc_properties = $5 WHERE id = $6",
        [
          name,
          description,
          triggerMode,
          parseInt(maxSignUps),
          vc_properties,
          listingId,
        ]
      );
      await client.query("DELETE FROM listing_tags WHERE listing_id = $1", [
        listingId,
      ]);
      for (const tag of tags) {
        await client.query(
          "INSERT INTO listing_tags (listing_id, tag_id) VALUES ($1, $2)",
          [listingId, tag]
        );
      }
      await client.query("COMMIT");
      res.json({ listingId });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.release();
    }
  })
);

router.post(
  "/listings/:listingId/publish",
  asyncWrapper(async (req, res) => {
    const { listingId } = req.params;
    const listing = await db.query(
      "UPDATE listings SET published_ts = $2, status = 'active' WHERE id = $1",
      [listingId, new Date()]
    );
    res.json(listing.rows[0]);
  })
);

router.post(
  "/listings/:listingId/delete",
  asyncWrapper(async (req, res) => {
    const { listingId } = req.params;
    const listing = await db.query(
      "UPDATE listings SET status = 'deleted', deleted_ts = $2 WHERE id = $1",
      [listingId, new Date()]
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
  "/tags/:tagId/add-to-listings",
  asyncWrapper(async (req, res) => {
    const { tagId } = req.params;
    const {  listingIds } = req.body;
    for (const listingId of listingIds) {
      await db.query(
        "INSERT INTO listing_tags (listing_id, tag_id) VALUES ($1, $2)",
        [listingId, tagId]
      );
    }

    res.json({ status: "successful" });
  })
);

export default router;
