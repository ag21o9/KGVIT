import express from "express";
import { signup, login } from "../controllers/auth.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", authMiddleware, checkPermission("User Management"), signup);

export default router;