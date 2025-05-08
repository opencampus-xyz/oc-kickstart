import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  // for mac docker
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
});

export default pool;
