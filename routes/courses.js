import express from "express";
import {
    createCourse,
    createCourseCategory,
    createDepartment,
    deleteCourse,
    deleteCourseCategory,
    deleteDepartment,
    getCourseBySlug,
    getCourseCategories,
    getCourses,
    getDepartments,
    requiredPermission,
    updateCourse,
    updateCourseCategory,
    updateDepartment,
} from "../controllers/courses.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/course-categories", getCourseCategories);
router.get("/courses", getCourses);
router.get("/courses/:slug", getCourseBySlug);
router.get("/departments", getDepartments);

router.use(authMiddleware, checkPermission(requiredPermission));

router.post("/course-categories", createCourseCategory);
router.put("/course-categories/:id", updateCourseCategory);
router.delete("/course-categories/:id", deleteCourseCategory);

router.post("/courses", createCourse);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);

router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

export default router;
