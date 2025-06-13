import db from "./db.js";

export const signup = async (name, email, ocid) => {
  // First check if user already exists
  const existingUserQueryStr = `
    SELECT * FROM users WHERE oc_id = $1 OR email = $2 LIMIT 1
  `;
  const existingUser = await db.query(existingUserQueryStr, [ocid, email]);
  
  if (existingUser.rows.length > 0) {
    const existingUser = existingUser.rows[0];
    if (existingUser.oc_id === ocid) {
      throw new Error("User with this OCID already exists");
    }
    if (existingUser.email === email) {
      throw new Error("User with this email already exists");
    }
  }

  const userQueryStr = `
    INSERT INTO users (name, email, oc_id) VALUES ($1, $2, $3)
  `;
  await db.query(userQueryStr, [name, email, ocid]);
};
