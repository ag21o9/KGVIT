import express from "express";
import {
    createResource,
    deleteResource,
    getResources,
    permissions,
    updateResource,
} from "../controllers/portal.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/resources", getResources);

router.use(authMiddleware, checkPermission(permissions.resources));

router.post("/resources", createResource);
router.put("/resources/:id", updateResource);
router.delete("/resources/:id", deleteResource);

export default router;
