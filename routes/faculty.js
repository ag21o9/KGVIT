import express from "express";
import { upload } from "../config/cloudinary.config.js";
import {
    createFaculty,
    deleteFaculty,
    getFaculty,
    getFacultyById,
    requiredPermission,
    toggleFacultyFeature,
    updateFaculty,
} from "../controllers/faculty.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/faculty", getFaculty);
router.get("/faculty/:id", getFacultyById);

router.use(authMiddleware, checkPermission(requiredPermission));

router.post("/faculty", upload.single("photo"), createFaculty);
router.put("/faculty/:id", upload.single("photo"), updateFaculty);
router.delete("/faculty/:id", deleteFaculty);
router.patch("/faculty/:id/feature", toggleFacultyFeature);

export default router;
