import express from "express";
import {
	createFeedback,
	getAllFeedback,
	getFeedbackAnalytics,
	requiredPermission,
} from "../controllers/feedbacks.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// PUBLIC
router.post("/feedback", createFeedback);

// ADMIN
router.get("/feedback", authMiddleware, checkPermission(requiredPermission), getAllFeedback);

router.get(
	"/feedback/analytics",
	authMiddleware,
	checkPermission(requiredPermission),
	getFeedbackAnalytics
);

export default router;
