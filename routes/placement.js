import express from "express";
import { upload } from "../config/cloudinary.config.js";
import {
    createPlacement,
    deletePlacement,
    getPlacements,
    permissions,
    updatePlacement,
} from "../controllers/portal.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/placements", getPlacements);

router.use(authMiddleware, checkPermission(permissions.placements));

router.post("/placements", upload.single("companyLogo"), createPlacement);
router.put("/placements/:id", upload.single("companyLogo"), updatePlacement);
router.delete("/placements/:id", deletePlacement);

export default router;
