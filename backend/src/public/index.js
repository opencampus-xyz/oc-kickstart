import { Router } from "express";
import db from "../db.js";
import { asyncWrapper, queryWithPagination } from "../utils.js";

const router = new Router();

router.get(
  "/achievements/:ocid",
  asyncWrapper(async (req, res) => {
    const ocid = req.params.ocid;
    const { page, pageSize } = req.query;

    let tokenIds = [];
    let achievements = [];
    try {
      const response = await fetch(
        `${process.env.CREDENTIALS_URL}?ocid=${ocid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      tokenIds = data.tokenIds;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch achievements");
    }

    if (!tokenIds?.length) {
      res.json({ data: [], total: 0 });
      return;
    }

    const paginatedTokenIds = tokenIds.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    for (const tokenId of paginatedTokenIds) {
      try {
        const metadataResponse = await fetch(
          `${process.env.METADATA_URL}/${tokenId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const metadataResult = await metadataResponse.json();
        if (metadataResult.metadata) {
          achievements.push(metadataResult.metadata);
        }
      } catch (error) {
        console.error(error);
        throw new Error("Failed to fetch achievements");
      }
    }

    res.json({ data: achievements, total: tokenIds.length });
  })
);

router.get(
  "/listings",
  asyncWrapper(async (req, res) => {
    const { searchTitle, searchTags, page, pageSize } = req.query;

    let searchQueryStr = [];
    if (searchTags) {
      searchQueryStr.push(
        `tags.id = all (select id from tags where id in (${searchTags}))`
      );
    }

    if (searchTitle) {
      searchQueryStr.push(`listings.name like '%${searchTitle}%'`);
    }
    const listingsQueryStr = `
      select listings.*, 
      array_agg(tags.name) as tag_names,
      array_agg(tags.id) as tag_ids,
      count(*) OVER() AS total 
      from listings
      left join listing_tags on listing_tags.listing_id = listings.id
      left join tags on tags.id = listing_tags.tag_id
      where status = 'active' and tags.archived_ts is null
      ${searchQueryStr.length > 0 ? `and ${searchQueryStr.join(" and ")}` : ""}
      group by listings.id
      order by listings.created_ts desc
      `;

    const { result, total } = await queryWithPagination(listingsQueryStr, {
      pageSize,
      page,
    });
    res.json({
      listings: result,
      total,
    });
  })
);

router.get(
  "/listings/:id",
  asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const listingQueryStr = `
      select listings.*, 
      array_agg(tags.name) as tag_names,
      array_agg(tags.id) as tag_ids
      from listings
      left join listing_tags on listing_tags.listing_id = listings.id
      left join tags on tags.id = listing_tags.tag_id
      where listings.id = $1 and listings.status = 'active' and tags.archived_ts is null
      group by listings.id
    `;
    const result = await db.query(listingQueryStr, [id]);
    
    if (!result?.rows?.[0]) {
      res.status(404).json({ 
        error: 'Listing not found',
        message: 'The requested listing could not be found or is not active'
      });
      return;
    }
    
    res.json(result.rows[0]);
  })
);

router.get(
  "/tags",
  asyncWrapper(async (req, res) => {
    const tags = await db.query("SELECT * FROM tags WHERE archived_ts IS NULL");
    res.json(tags.rows);
  })
);

export default router;
