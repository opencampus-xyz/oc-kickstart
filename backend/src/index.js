import cors from "cors";
import { secondsToMilliseconds } from "date-fns";
import express from "express";
import adminRouter from "./admin/index.js";
import userRouter from "./auth-user/index.js";
import { authWithToken } from "./auth.js";
import db from "./db.js";
import masterAdminRouter from "./master-admin/index.js";
import publicRouter from "./public/index.js";
import { signup } from "./signup.js";
import { asyncWrapper } from "./utils.js";
import { VCIssuerService } from "./vc-issuer.js";
const app = express();

setInterval(() => {
  VCIssuerService.getInstance().run();
}, secondsToMilliseconds(parseInt(process.env.VC_ISSUANCE_INTERVAL)>30?30:parseInt(process.env.VC_ISSUANCE_INTERVAL)));

app.use(cors());
app.use(express.json());

app.use("/public", publicRouter);

app.use((req, res, next) => authWithToken(req, res, next));

app.post(
  "/signup",
  asyncWrapper(async (req, res) => {
    const { name, email } = req.body;
    const ocid = req.authenticatedUser;
    await signup(name, email, ocid);
    res.json({
      message: "User created successfully",
    });
  })
);

app.get(
  "/user",
  asyncWrapper(async (req, res) => {
    const ocid = req.authenticatedUser;
    // check if the user is a master admin
    const isMasterAdmin = process.env.MASTER_ADMIN_OCID === ocid;
    // check if the user is admin
    const adminQueryStr = `
  SELECT admin_ocids FROM admin_configs
  `;
    const adminResult = await db.query(adminQueryStr);
    const adminOcids = adminResult.rows[0]?.admin_ocids ?? [];
    const isAdmin = adminOcids.includes(ocid);
    // check if the user is a user
    const userQueryStr = `
  SELECT * FROM users WHERE oc_id = $1 LIMIT 1
  `;
    const userResult = await db.query(userQueryStr, [ocid]);

    res.json({
      isMasterAdmin,
      isAdmin,
      isRegisteredUser: userResult?.rows.length > 0,
      user: userResult?.rows[0],
    });
  })
);

app.use("/auth-user", userRouter);
app.use("/admin", adminRouter);
app.use("/master-admin", masterAdminRouter);

app.listen(4000, () => console.log(`Server running on port 4000`));
