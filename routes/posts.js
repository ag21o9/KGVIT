import express from "express";
import { upload } from "../config/cloudinary.config.js";
import {
    createCategory,
    createPost,
    createTag,
    deletePost,
    getCategories,
    getPostBySlug,
    getPosts,
    getTags,
    requiredPermission,
    updatePost,
} from "../controllers/posts.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/posts", getPosts);
router.get("/posts/:slug", getPostBySlug);
router.get("/categories", getCategories);
router.get("/tags", getTags);

router.use(authMiddleware, checkPermission(requiredPermission));

router.post("/posts", upload.single("coverImage"), createPost);
router.put("/posts/:id", upload.single("coverImage"), updatePost);
router.delete("/posts/:id", deletePost);

router.post("/categories", createCategory);
router.post("/tags", createTag);

export default router;
