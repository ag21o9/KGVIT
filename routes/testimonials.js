import express from "express";
import { upload } from "../config/cloudinary.config.js";
import {
	createTestimonial,
	deleteTestimonial,
	getTestimonialById,
	getTestimonialsAdmin,
	requiredPermission,
	toggleTestimonial,
	updateTestimonial,
} from "../controllers/testimonials.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/admin", authMiddleware, checkPermission(requiredPermission), getTestimonialsAdmin);
router.get("/:id", getTestimonialById);

router.use(authMiddleware, checkPermission(requiredPermission));

router.post("/", upload.single("image"), createTestimonial);
router.put("/:id", upload.single("image"), updateTestimonial);
router.delete("/:id", deleteTestimonial);
router.patch("/:id/toggle", toggleTestimonial);

export default router;
