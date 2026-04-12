import express from "express";
import { upload } from "../config/cloudinary.config.js";
import {
    createAchievement,
    deleteAchievement,
    getAchievements,
    permissions,
    updateAchievement,
} from "../controllers/events.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/achievements", getAchievements);

router.use(authMiddleware, checkPermission(permissions.achievements));

router.post("/achievements", upload.single("image"), createAchievement);
router.put("/achievements/:id", upload.single("image"), updateAchievement);
router.delete("/achievements/:id", deleteAchievement);

export default router;
