import express from "express";
import {
    createInquiry,
    getInquiries,
    permissions,
    updateInquiryStatus,
} from "../controllers/adminPortal.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/inquiries", createInquiry);


router.use(authMiddleware, checkPermission(permissions.leads));
router.get("/inquiries", getInquiries);
router.put("/inquiries/:id/status", updateInquiryStatus);

export default router;
