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

router.get(
  "/app-config",
  asyncWrapper(async (req, res) => {
    console.log('Reading app config from:', CONFIG_FILE_PATH);
    try {
      const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
      console.log('Config data read:', configData);
      res.json(JSON.parse(configData));
    } catch (error) {
      console.log('Error reading config file:', error.message);
      const defaultConfig = {
        appTitle: "OC Kickstart",
        logoUrl: "/assets/logo.svg",
        theme: "light"
      };
      res.json(defaultConfig);
    }
  })
);

router.post(
  "/app-config",
  asyncWrapper(async (req, res) => {
    const config = req.body;
    
    if (!config.appTitle || !config.logoUrl || !config.theme) {
      throw new Error("Missing required configuration fields");
    }
    
    const logoUrlRegex = /^(https?:\/\/[^\s]+|\/[^\s]*)$/;
    if (!logoUrlRegex.test(config.logoUrl)) {
      throw new Error("Logo URL must be a relative path (starting with /) or a valid HTTP/HTTPS URL");
    }
    
    const configDir = path.dirname(CONFIG_FILE_PATH);
    
    try {
      await fs.access(configDir);
    } catch (error) {
      await fs.mkdir(configDir, { recursive: true });
    }
    
    const configJson = JSON.stringify(config, null, 2);
    await fs.writeFile(CONFIG_FILE_PATH, configJson);
    
    res.json({ 
      message: "App config updated successfully",
      config: config
    });
  })
);

export default router;
