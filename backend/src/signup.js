import db from "./db.js";

export const signup = async (name, email, ocid) => {
  try {
    const userQueryStr = `
      INSERT INTO users (name, email, oc_id) VALUES ($1, $2, $3)
    `;
    await db.query(userQueryStr, [name, email, ocid]);
  } catch (error) {
    if (error.code === '23505') {
      if (error.constraint === 'users_oc_id_key') {
        throw new Error("User with this OCID already exists");
      }
      if (error.constraint === 'users_email_key') {
        throw new Error("User with this email already exists");
      }
    }
    throw error;
  }
};
