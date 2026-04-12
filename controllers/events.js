import { prisma } from "../lib/prisma.js";
import { cloudinaryClient } from "../config/cloudinary.config.js";

const EVENT_MANAGEMENT_PERMISSION = "Event Management";
const ACHIEVEMENTS_PERMISSION = "Achievements & Placements";

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

const uploadImageBuffer = async (file, folder) => {
    if (!file) return null;
    if (!file.buffer) {
        throw new Error("Upload buffer missing. Ensure multer uses memoryStorage.");
    }

    const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinaryClient.uploader.upload_stream(
            { folder, resource_type: "image" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(file.buffer);
    });

    return uploadResult.secure_url;
};

export const getEvents = async (req, res, next) => {
    try {
        const events = await prisma.event.findMany({
            orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
        });

        res.json({ success: true, data: events });
    } catch (error) {
        next(error);
    }
};

export const getEventBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const event = await prisma.event.findUnique({ where: { slug } });
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        res.json({ success: true, data: event });
    } catch (error) {
        next(error);
    }
};

export const createEvent = async (req, res, next) => {
    try {
        const {
            title,
            slug,
            excerpt,
            description,
            category,
            startAt,
            endAt,
            venue,
            coverImage,
            isFeatured,
            isActive,
        } = req.body;

        if (!title || !description || !startAt) {
            return res.status(400).json({
                success: false,
                message: "title, description and startAt are required",
            });
        }

        const finalSlug = slugify(slug || title);
        if (!finalSlug) {
            return res.status(400).json({ success: false, message: "Invalid slug" });
        }

        const uploadedCoverImage = await uploadImageBuffer(req.file, "events");

        const event = await prisma.event.create({
            data: {
                title,
                slug: finalSlug,
                excerpt: excerpt ?? null,
                description,
                category: category ?? null,
                startAt: new Date(startAt),
                endAt: endAt ? new Date(endAt) : null,
                venue: venue ?? null,
                coverImage: uploadedCoverImage || coverImage || null,
                isFeatured: parseBoolean(isFeatured, false),
                isActive: parseBoolean(isActive, true),
            },
        });

        res.status(201).json({ success: true, data: event });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            title,
            slug,
            excerpt,
            description,
            category,
            startAt,
            endAt,
            venue,
            coverImage,
            isFeatured,
            isActive,
        } = req.body;

        const existing = await prisma.event.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        const uploadedCoverImage = await uploadImageBuffer(req.file, "events");

        const event = await prisma.event.update({
            where: { id },
            data: {
                title: title ?? undefined,
                slug: slug ? slugify(slug) : undefined,
                excerpt: excerpt ?? undefined,
                description: description ?? undefined,
                category: category ?? undefined,
                startAt: startAt ? new Date(startAt) : undefined,
                endAt: endAt === null || endAt === "" ? null : endAt ? new Date(endAt) : undefined,
                venue: venue ?? undefined,
                coverImage: uploadedCoverImage || coverImage || undefined,
                isFeatured: parseBoolean(isFeatured, undefined),
                isActive: parseBoolean(isActive, undefined),
            },
        });

        res.json({ success: true, data: event });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.event.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        await prisma.event.delete({ where: { id } });
        res.json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getAchievements = async (req, res, next) => {
    try {
        const achievements = await prisma.achievement.findMany({
            orderBy: [{ year: "desc" }, { createdAt: "desc" }],
        });

        res.json({ success: true, data: achievements });
    } catch (error) {
        next(error);
    }
};

export const createAchievement = async (req, res, next) => {
    try {
        const { title, description, category, year, imageUrl, isActive } = req.body;

        if (!title || !year) {
            return res.status(400).json({ success: false, message: "title and year are required" });
        }

        const uploadedImageUrl = await uploadImageBuffer(req.file, "achievements");

        const achievement = await prisma.achievement.create({
            data: {
                title,
                description: description ?? null,
                category: category ?? undefined,
                year: Number(year),
                imageUrl: uploadedImageUrl || imageUrl || null,
                isActive: parseBoolean(isActive, true),
            },
        });

        res.status(201).json({ success: true, data: achievement });
    } catch (error) {
        next(error);
    }
};

export const updateAchievement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, category, year, imageUrl, isActive } = req.body;

        const existing = await prisma.achievement.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Achievement not found" });
        }

        const uploadedImageUrl = await uploadImageBuffer(req.file, "achievements");

        const achievement = await prisma.achievement.update({
            where: { id },
            data: {
                title: title ?? undefined,
                description: description ?? undefined,
                category: category ?? undefined,
                year: year ? Number(year) : undefined,
                imageUrl: uploadedImageUrl || imageUrl || undefined,
                isActive: parseBoolean(isActive, undefined),
            },
        });

        res.json({ success: true, data: achievement });
    } catch (error) {
        next(error);
    }
};

export const deleteAchievement = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.achievement.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Achievement not found" });
        }

        await prisma.achievement.delete({ where: { id } });
        res.json({ success: true, message: "Achievement deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const permissions = {
    events: EVENT_MANAGEMENT_PERMISSION,
    achievements: ACHIEVEMENTS_PERMISSION,
};
