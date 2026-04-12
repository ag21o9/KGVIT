import express from "express";
import {
    createLead,
    deleteLead,
    getLeadById,
    getLeads,
    permissions,
    updateLead,
} from "../controllers/adminPortal.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/leads",createLead);

router.use(authMiddleware, checkPermission(permissions.leads));

router.get("/leads", getLeads);
router.get("/leads/:id", getLeadById);
router.put("/leads/:id",updateLead);
router.delete("/leads/:id", deleteLead);

export default router;
