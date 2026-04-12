import { prisma } from "../lib/prisma.js";

const COURSES_PERMISSION = "Courses Management";

const slugify = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

const parseBoolean = (value, defaultValue = undefined) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
    }
    return defaultValue;
};

export const requiredPermission = COURSES_PERMISSION;

export const getCourseCategories = async (req, res, next) => {
    try {
        const categories = await prisma.categoryCourse.findMany({
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
            include: {
                parent: {
                    select: { id: true, name: true, slug: true },
                },
                children: {
                    select: { id: true, name: true, slug: true },
                    orderBy: { order: "asc" },
                },
            },
        });

        res.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

export const createCourseCategory = async (req, res, next) => {
    try {
        const { name, slug, parentId } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }

        const finalSlug = slugify(slug || name);
        if (!finalSlug) {
            return res.status(400).json({ success: false, message: "Invalid slug" });
        }

        if (parentId) {
            const parent = await prisma.categoryCourse.findUnique({ where: { id: parentId } });
            if (!parent) {
                return res.status(400).json({ success: false, message: "Invalid parentId" });
            }
        }

        const category = await prisma.categoryCourse.create({
            data: {
                name,
                slug: finalSlug,
                parentId: parentId || null,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0,
            },
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const updateCourseCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, slug, parentId } = req.body;

        const existing = await prisma.categoryCourse.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Course category not found" });
        }

        if (parentId) {
            if (parentId === id) {
                return res.status(400).json({ success: false, message: "parentId cannot be self" });
            }

            const parent = await prisma.categoryCourse.findUnique({ where: { id: parentId } });
            if (!parent) {
                return res.status(400).json({ success: false, message: "Invalid parentId" });
            }
        }

        const category = await prisma.categoryCourse.update({
            where: { id },
            data: {
                name: name ?? undefined,
                slug: slug ? slugify(slug) : undefined,
                parentId:
                    parentId === null || parentId === ""
                        ? null
                        : parentId ?? undefined,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : undefined,
            },
        });

        res.json({ success: true, data: category });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const deleteCourseCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.categoryCourse.findUnique({
            where: { id },
            include: {
                children: { select: { id: true } },
                courses: { select: { id: true } },
            },
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: "Course category not found" });
        }

        if (existing.children.length || existing.courses.length) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete category with child categories or courses",
            });
        }

        await prisma.categoryCourse.delete({ where: { id } });
        res.json({ success: true, message: "Course category deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getCourses = async (req, res, next) => {
    try {
        const courses = await prisma.course.findMany({
            orderBy: [{ createdAt: "desc" }],
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        res.json({ success: true, data: courses });
    } catch (error) {
        next(error);
    }
};

export const getCourseBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const course = await prisma.course.findUnique({
            where: { slug },
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        res.json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

export const createCourse = async (req, res, next) => {
    try {
        const {
            title,
            slug,
            description,
            duration,
            fee,
            eligibility,
            attachments,
            categoryId,
            isActive,
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: "title and description are required",
            });
        }

        const finalSlug = slugify(slug || title);
        if (!finalSlug) {
            return res.status(400).json({ success: false, message: "Invalid slug" });
        }

        if (categoryId) {
            const category = await prisma.categoryCourse.findUnique({ where: { id: categoryId } });
            if (!category) {
                return res.status(400).json({ success: false, message: "Invalid categoryId" });
            }
        }

        const course = await prisma.course.create({
            data: {
                title,
                slug: finalSlug,
                description,
                duration: duration ?? null,
                fee: fee ?? null,
                eligibility: eligibility ?? null,
                attachments: attachments ?? null,
                categoryId: categoryId || null,
                isActive: parseBoolean(isActive, true),
            },
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        res.status(201).json({ success: true, data: course });
    } catch (error) {
        console.log(error)
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const updateCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            title,
            slug,
            description,
            duration,
            fee,
            eligibility,
            attachments,
            categoryId,
            isActive,
        } = req.body;

        const existing = await prisma.course.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        if (categoryId) {
            const category = await prisma.categoryCourse.findUnique({ where: { id: categoryId } });
            if (!category) {
                return res.status(400).json({ success: false, message: "Invalid categoryId" });
            }
        }

        const course = await prisma.course.update({
            where: { id },
            data: {
                title: title ?? undefined,
                slug: slug ? slugify(slug) : undefined,
                description: description ?? undefined,
                duration: duration ?? undefined,
                fee: fee ?? undefined,
                eligibility: eligibility ?? undefined,
                attachments: attachments ?? undefined,
                categoryId:
                    categoryId === null || categoryId === ""
                        ? null
                        : categoryId ?? undefined,
                isActive: parseBoolean(isActive, undefined),
            },
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        res.json({ success: true, data: course });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const deleteCourse = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.course.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        await prisma.course.delete({ where: { id } });
        res.json({ success: true, message: "Course deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getDepartments = async (req, res, next) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: departments });
    } catch (error) {
        next(error);
    }
};

export const createDepartment = async (req, res, next) => {
    try {
        const { name, slug, description, isActive } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }

        const finalSlug = slugify(slug || name);
        if (!finalSlug) {
            return res.status(400).json({ success: false, message: "Invalid slug" });
        }

        const department = await prisma.department.create({
            data: {
                name,
                slug: finalSlug,
                description: description ?? null,
                isActive: parseBoolean(isActive, true),
            },
        });

        res.status(201).json({ success: true, data: department });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const updateDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, slug, description, isActive } = req.body;

        const existing = await prisma.department.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Department not found" });
        }

        const department = await prisma.department.update({
            where: { id },
            data: {
                name: name ?? undefined,
                slug: slug ? slugify(slug) : undefined,
                description: description ?? undefined,
                isActive: parseBoolean(isActive, undefined),
            },
        });

        res.json({ success: true, data: department });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const deleteDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.department.findUnique({
            where: { id },
            include: { faculties: { select: { id: true } } },
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: "Department not found" });
        }

        if (existing.faculties.length) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete department with assigned faculty",
            });
        }

        await prisma.department.delete({ where: { id } });
        res.json({ success: true, message: "Department deleted successfully" });
    } catch (error) {
        next(error);
    }
};
