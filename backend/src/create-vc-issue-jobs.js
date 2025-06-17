import { addDays } from "date-fns";
import db from "./db.js";
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// Generate a random namespace using v4, but use it with v5 for deterministic UUIDs
const UUID_NAMESPACE = uuidv4();

export const createVCIssueJobs = async (userId, listingId) => {
  // get listing, tags and user details to create the payload
  const signups = await db.query(
    `SELECT listings.description, listings.vc_properties, users.* FROM user_listings 
    JOIN listings ON user_listings.listing_id = listings.id
    JOIN users ON user_listings.user_id = users.id
    WHERE user_listings.user_id = $1 AND user_listings.listing_id = $2 AND user_listings.status = 'completed'
    `,
    [userId, listingId]
  );

  if (signups.rows.length === 0) {
    throw new Error("No approved signups found");
  }

  if (signups.rows.length > 1) {
    throw new Error("Multiple approved signups found");
  }

  const signup = signups.rows[0];

  const tags = await db.query(
    `SELECT tags.description, tags.vc_properties, tags.id FROM listing_tags 
    JOIN tags ON listing_tags.tag_id = tags.id 
    WHERE listing_tags.listing_id = $1 AND tags.archived_ts IS NULL AND tags.can_issue_oca = TRUE
    `,
    [listingId]
  );

  const now = new Date();
  const listingVcProperties = signup.vc_properties;

  const tagsDetails = tags.rows;

  const userDetails = {
    ocId: signup.oc_id,
    name: signup.name,
    email: signup.email,
  };

  const generateOCAPayload = (vcProperties, description, identifier, title) => {
    const uniqueString = `${userId}${identifier}${title}`;
    const issuerRefId = uuidv5(uniqueString, UUID_NAMESPACE);

    return {
      holderOcId: userDetails.ocId,
      issuerRefId: issuerRefId,
      credentialPayload: {
        awardedDate: now,
        validFrom: now,
        validUntil: vcProperties.expireInDays
          ? addDays(now, vcProperties.expireInDays)
          : undefined,
        description,
        credentialSubject: {
          name: userDetails.name,
          email: userDetails.email,
          achievement: {
            identifier,
            achievementType: vcProperties.achievementType,
            name: title,
            description,
          },
        },
      },
    };
  };

  const vcIssueJobsPayloads = [
    generateOCAPayload(
      listingVcProperties,
      signup.description,
      listingId,
      listingVcProperties.title
    ),
    ...tagsDetails.map((tag) =>
      generateOCAPayload(
        tag.vc_properties,
        tag.description,
        tag.id,
        `${listingVcProperties.title}${tag.vc_properties.title}`
      )
    ),
  ];

  await db.query(
    `INSERT INTO vc_issue_jobs (payload, user_id, listing_id) 
    SELECT * FROM jsonb_to_recordset($1::jsonb) as x (payload jsonb, user_id uuid, listing_id uuid)`,
    [
      JSON.stringify(
        vcIssueJobsPayloads.map((payload) => ({
          payload,
          user_id: userId,
          listing_id: listingId,
        }))
      ),
    ]
  );
};
