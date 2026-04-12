import { prisma } from "../lib/prisma.js";
import { cloudinaryClient } from "../config/cloudinary.config.js";

const PLACEMENTS_PERMISSION = "Achievements & Placements";
const NOTICES_PERMISSION = "Notice Board";
const RESOURCES_PERMISSION = "Downloads Management";

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
            {
                folder,
                resource_type: "image",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(file.buffer);
    });

    return uploadResult.secure_url;
};

export const permissions = {
    placements: PLACEMENTS_PERMISSION,
    notices: NOTICES_PERMISSION,
    resources: RESOURCES_PERMISSION,
};

export const getPlacements = async (req, res, next) => {
    try {
        const placements = await prisma.placement.findMany({
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        });

        res.json({ success: true, data: placements });
    } catch (error) {
        next(error);
    }
};

export const createPlacement = async (req, res, next) => {
    try {
        const { companyName, studentName, year, testimonial, companyLogo, isActive } = req.body;

        if (!companyName || !studentName || !year) {
            return res.status(400).json({
                success: false,
                message: "companyName, studentName and year are required",
            });
        }

        const uploadedLogo = await uploadImageBuffer(req.file, "placements");

        const placement = await prisma.placement.create({
            data: {
                companyName,
                studentName,
                year: Number(year),
                testimonial: testimonial ?? null,
                companyLogo: uploadedLogo || companyLogo || null,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0,
                isActive: parseBoolean(isActive, true),
            },
        });

        res.status(201).json({ success: true, data: placement });
    } catch (error) {
        next(error);
    }
};

export const updatePlacement = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { companyName, studentName, year, testimonial, companyLogo, isActive } = req.body;

        const existing = await prisma.placement.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Placement not found" });
        }

        const uploadedLogo = await uploadImageBuffer(req.file, "placements");

        const placement = await prisma.placement.update({
            where: { id },
            data: {
                companyName: companyName ?? undefined,
                studentName: studentName ?? undefined,
                year: year ? Number(year) : undefined,
                testimonial: testimonial ?? undefined,
                companyLogo: uploadedLogo || companyLogo || undefined,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : undefined,
                isActive: parseBoolean(isActive, undefined),
            },
        });

        res.json({ success: true, data: placement });
    } catch (error) {
        next(error);
    }
};

export const deletePlacement = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.placement.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Placement not found" });
        }

        await prisma.placement.delete({ where: { id } });
        res.json({ success: true, message: "Placement deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getNotices = async (req, res, next) => {
    try {
        const notices = await prisma.notice.findMany({
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        });

        res.json({ success: true, data: notices });
    } catch (error) {
        next(error);
    }
};

export const createNotice = async (req, res, next) => {
    try {
        const { title, content, type, publishedAt, expiresAt, isArchived, isActive } = req.body;

        if (!title || !content || !type || !publishedAt) {
            return res.status(400).json({
                success: false,
                message: "title, content, type and publishedAt are required",
            });
        }

        const notice = await prisma.notice.create({
            data: {
                title,
                content,
                type,
                publishedAt: new Date(publishedAt),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isArchived: parseBoolean(isArchived, false),
                isActive: parseBoolean(isActive, true),
            },
        });

        res.status(201).json({ success: true, data: notice });
    } catch (error) {
        next(error);
    }
};

export const updateNotice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, content, type, publishedAt, expiresAt, isArchived, isActive } = req.body;

        const existing = await prisma.notice.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Notice not found" });
        }

        const notice = await prisma.notice.update({
            where: { id },
            data: {
                title: title ?? undefined,
                content: content ?? undefined,
                type: type ?? undefined,
                publishedAt: publishedAt ? new Date(publishedAt) : undefined,
                expiresAt: expiresAt === null || expiresAt === "" ? null : expiresAt ? new Date(expiresAt) : undefined,
                isArchived: parseBoolean(isArchived, undefined),
                isActive: parseBoolean(isActive, undefined),
            },
        });

        res.json({ success: true, data: notice });
    } catch (error) {
        next(error);
    }
};

export const deleteNotice = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.notice.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Notice not found" });
        }

        await prisma.notice.delete({ where: { id } });
        res.json({ success: true, message: "Notice deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const archiveNotice = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.notice.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Notice not found" });
        }

        const notice = await prisma.notice.update({
            where: { id },
            data: { isArchived: !existing.isArchived },
        });

        res.json({ success: true, data: notice });
    } catch (error) {
        next(error);
    }
};

export const getResources = async (req, res, next) => {
    try {
        const resources = await prisma.resource.findMany({
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        });

        res.json({ success: true, data: resources });
    } catch (error) {
        next(error);
    }
};

export const createResource = async (req, res, next) => {
    try {
        const { title, content, type, fileUrl, publishedAt, isActive } = req.body;

        if (!title || !type || !publishedAt) {
            return res.status(400).json({
                success: false,
                message: "title, type and publishedAt are required",
            });
        }

        const resource = await prisma.resource.create({
            data: {
                title,
                content: content ?? null,
                type,
                fileUrl: fileUrl ?? null,
                publishedAt: new Date(publishedAt),
                isActive: parseBoolean(isActive, true),
            },
        });

        res.status(201).json({ success: true, data: resource });
    } catch (error) {
        next(error);
    }
};

export const updateResource = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, content, type, fileUrl, publishedAt, isActive } = req.body;

        const existing = await prisma.resource.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }

        const resource = await prisma.resource.update({
            where: { id },
            data: {
                title: title ?? undefined,
                content: content ?? undefined,
                type: type ?? undefined,
                fileUrl: fileUrl ?? undefined,
                publishedAt: publishedAt ? new Date(publishedAt) : undefined,
                isActive: parseBoolean(isActive, undefined),
            },
        });

        res.json({ success: true, data: resource });
    } catch (error) {
        next(error);
    }
};

export const deleteResource = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.resource.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }

        await prisma.resource.delete({ where: { id } });
        res.json({ success: true, message: "Resource deleted successfully" });
    } catch (error) {
        next(error);
    }
};
