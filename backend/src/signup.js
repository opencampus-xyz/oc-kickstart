import db from "./db.js";

const ocAuthUrl = process.env.OC_AUTH_URL;

export const signup = async (name, email, ocid) => {
  try {
    const params = new URLSearchParams({ email, ocid }).toString()
    const userValidationResponse = await fetch(`${ocAuthUrl}?${params}`);
    const userValidation = await userValidationResponse.json();
    if (!userValidation?.valid) {
      throw new Error('OCID does not match with the email');
    }
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
