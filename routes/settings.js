import express from "express";
import {
    getSettings,
    permissions,
    upsertSettings,
} from "../controllers/adminPortal.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/settings", getSettings);

router.use(authMiddleware, checkPermission(permissions.settings));
router.put("/settings", upsertSettings);

export default router;
