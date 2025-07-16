import { Router } from "express";
import db from "../db.js";
import { asyncWrapper, queryWithPagination } from "../utils.js";

const router = new Router();

router.get(
  "/achievements/:ocid",
  asyncWrapper(async (req, res) => {
    const ocid = req.params.ocid;
    const { page, pageSize } = req.query;
    let achievements = [],
      total = 0;
    try {
      const response = await fetch(
        `${process.env.ANALYTICS_URL}?pageSize=${pageSize}&page=${page-1}&holderOcid=${ocid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const analyticsResp = await response.json();
      total = analyticsResp.total;
      const metadataEndpoints = analyticsResp.data.map(
        (data) => data.metadataEndpoint
      );
      await Promise.all(
        metadataEndpoints.map(async (metadataEndpoint) => {
          try {
            const achievementMetadata = await fetch(metadataEndpoint);
            const metadataResult = await achievementMetadata.json();
            if (metadataResult.metadata) {
              achievements.push(metadataResult.metadata);
            }
          } catch (error) {
            console.error(error);
            throw new Error("Failed to fetch achievements");
          }
        })
      );
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch achievements");
    }
    res.json({ data: achievements, total });
  })
);

router.get(
  "/listings",
  asyncWrapper(async (req, res) => {
    const { searchTitle, searchTags, page, pageSize } = req.query;

    let searchQueryStr = [];
    
    if (searchTags) {
      const searchTagsArray = searchTags.split(',')
      searchQueryStr.push(
        `tags.id = all (select id from tags where id in (${searchTagsArray.map(tag => `'${tag}'`).join(',')}))`
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
      data: result,
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
        error: "Listing not found",
        message: "The requested listing could not be found or is not active",
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
