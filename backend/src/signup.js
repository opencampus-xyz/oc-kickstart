import db from "./db.js";

export const signup = async (name, email, ocid) => {
  const userQueryStr = `
    INSERT INTO users (name, email, oc_id) VALUES ($1, $2, $3)
    `;
  await db.query(userQueryStr, [name, email, ocid]);
};
