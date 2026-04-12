import express from "express";
import { upload } from "../config/cloudinary.config.js";
import {
    archiveNotice,
    createNotice,
    deleteNotice,
    getNotices,
    permissions,
    updateNotice,
} from "../controllers/portal.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/notices", getNotices);

router.use(authMiddleware, checkPermission(permissions.notices));

router.post("/notices", createNotice);
router.put("/notices/:id", updateNotice);
router.delete("/notices/:id", deleteNotice);
router.patch("/notices/:id/archive", archiveNotice);

export default router;
