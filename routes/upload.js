import express from "express";
import { fileUpload } from "../config/cloudinary.config.js";
import { uploadFile, permissions } from "../controllers/adminPortal.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware, checkPermission(permissions.settings));
router.post("/upload", fileUpload.single("file"), uploadFile);

export default router;
