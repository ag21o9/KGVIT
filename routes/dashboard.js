import express from "express";
import { getDashboardStats, permissions } from "../controllers/adminPortal.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware, checkPermission(permissions.dashboard));

router.get("/dashboard", getDashboardStats);

export default router;
