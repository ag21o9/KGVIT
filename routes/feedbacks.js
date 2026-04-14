import express from "express";
import {
    createFeedback,
    getAllFeedback,
    getFeedbackAnalytics,
    createAlumniFeedback,
    getAllAlumniFeedback,
    getAlumniAnalytics,
    requiredPermission,
} from "../controllers/feedbacks.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// STUDENT FEEDBACK - PUBLIC
router.post("/feedback", createFeedback);

// STUDENT FEEDBACK - ADMIN
router.get("/feedback", authMiddleware, checkPermission(requiredPermission), getAllFeedback);

router.get(
    "/feedback/analytics",
    authMiddleware,
    checkPermission(requiredPermission),
    getFeedbackAnalytics
);

// ALUMNI FEEDBACK - PUBLIC
router.post("/alumni-feedback", createAlumniFeedback);

// ALUMNI FEEDBACK - ADMIN
router.get(
    "/alumni-feedback",
    authMiddleware,
    checkPermission(requiredPermission),
    getAllAlumniFeedback
);

router.get(
    "/alumni-feedback/analytics",
    authMiddleware,
    checkPermission(requiredPermission),
    getAlumniAnalytics
);

export default router;
