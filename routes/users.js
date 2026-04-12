import express from "express";
import {
    assignPermissionsToRole,
    createPermission,
    createRole,
    createUser,
    deleteRole,
    deleteUser,
    getPermissions,
    getRoles,
    getUserById,
    getUsers,
    requiredPermission,
    updateRole,
    updateUser,
} from "../controllers/users.js";
import { upload } from "../config/cloudinary.config.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All user-management endpoints require the User Management permission.
router.use(authMiddleware, checkPermission(requiredPermission));

router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.post("/users", upload.single("image"), createUser);
router.put("/users/:id", upload.single("image"), updateUser);
router.delete("/users/:id", deleteUser);

router.get("/roles", getRoles);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);
router.put("/roles/:id/permissions", assignPermissionsToRole);

router.get("/permissions", getPermissions);
router.post("/permissions", createPermission);

export default router;
