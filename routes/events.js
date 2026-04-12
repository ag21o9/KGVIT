import express from "express";
import { upload } from "../config/cloudinary.config.js";
import {
    createEvent,
    deleteEvent,
    getEventBySlug,
    getEvents,
    permissions,
    updateEvent,
} from "../controllers/events.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/events", getEvents);
router.get("/events/:slug", getEventBySlug);

router.use(authMiddleware, checkPermission(permissions.events));

router.post("/events", upload.single("coverImage"), createEvent);
router.put("/events/:id", upload.single("coverImage"), updateEvent);
router.delete("/events/:id", deleteEvent);

export default router;
