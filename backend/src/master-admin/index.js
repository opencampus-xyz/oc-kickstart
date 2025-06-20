import { Router } from "express";
import db from "../db.js";
import { asyncWrapper } from "../utils.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = new Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE_PATH = path.join(__dirname, '..', '..', 'app-config.json');

const masterAdminAuthMiddleware = asyncWrapper(async (req, res, next) => {
  const isMasterAdmin = process.env.MASTER_ADMIN_OCID === req.authenticatedUser;
  if (!isMasterAdmin) {
    throw new Error("Unauthorized");
  }
  next();
});

router.use(masterAdminAuthMiddleware);

router.get(
  "/admin-configs",
  asyncWrapper(async (req, res) => {
    const adminQueryStr = `
    SELECT admin_ocids FROM admin_configs
    `;
    const adminResult = await db.query(adminQueryStr);
    res.json(adminResult?.rows[0] ?? {});
  })
);

router.post(
  "/admin-configs",
  asyncWrapper(async (req, res) => {
    const { adminOCIDs } = req.body;
    const adminOCIDsArray = adminOCIDs.split(",");
    const existingAdminQueryStr = await db.query("SELECT * from admin_configs");
    let adminQueryStr;
    if (existingAdminQueryStr.rows.length > 0) {
      adminQueryStr = `
        UPDATE admin_configs SET admin_ocids = $1::text[]
        `;
    } else {
      adminQueryStr = `
        INSERT INTO admin_configs (admin_ocids) VALUES ($1::text[])
      `;
    }
    const queryResult = await db.query(adminQueryStr, [adminOCIDsArray]);
    res.json({
      message: "Admin configs updated successfully",
    });
  })
);

export default router;
