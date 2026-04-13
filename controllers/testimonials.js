import { prisma } from "../lib/prisma.js";
import { cloudinaryClient } from "../config/cloudinary.config.js";

const TESTIMONIALS_PERMISSION = "Testimonials";

const parseBoolean = (value, defaultValue = undefined) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
    }
    return defaultValue;
};

const normalizeType = (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return String(value).trim().toUpperCase();
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

const validatePayloadForType = ({ type, content, videoUrl }) => {
    if (type !== "TEXT" && type !== "VIDEO") {
        return "type must be either TEXT or VIDEO";
    }

    if (type === "VIDEO" && !videoUrl) {
        return "videoUrl is required when type is VIDEO";
    }

    if (type === "TEXT" && !content) {
        return "content is required when type is TEXT";
    }

    return null;
};

export const requiredPermission = TESTIMONIALS_PERMISSION;

export const getTestimonialsAdmin = async (req, res, next) => {
    try {
        const testimonials = await prisma.testimonial.findMany({
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        });

        res.json({ success: true, data: testimonials });
    } catch (error) {
        next(error);
    }
};

export const getTestimonialById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const testimonial = await prisma.testimonial.findUnique({ where: { id } });
        if (!testimonial) {
            return res.status(404).json({ success: false, message: "Testimonial not found" });
        }

        res.json({ success: true, data: testimonial });
    } catch (error) {
        next(error);
    }
};

export const createTestimonial = async (req, res, next) => {
    try {
        const { name, designation, content, videoUrl } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }

        const type = normalizeType(req.body.type) || "TEXT";
        const validationError = validatePayloadForType({
            type,
            content: content ? String(content).trim() : "",
            videoUrl: videoUrl ? String(videoUrl).trim() : "",
        });

        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const uploadedImageUrl = await uploadImageBuffer(req.file, "testimonials");
        const imageUrl = uploadedImageUrl || req.body.imageUrl || null;

        const testimonial = await prisma.testimonial.create({
            data: {
                name,
                designation: designation ?? null,
                type,
                content: type === "TEXT" ? content : null,
                videoUrl: type === "VIDEO" ? videoUrl : null,
                imageUrl,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0,
                isPublished: parseBoolean(req.body.isPublished, true),
            },
        });

        res.status(201).json({ success: true, data: testimonial });
    } catch (error) {
        next(error);
    }
};

export const updateTestimonial = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, designation, content, videoUrl, imageUrl } = req.body;

        const existing = await prisma.testimonial.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Testimonial not found" });
        }

        const finalType = normalizeType(req.body.type) || existing.type;
        const finalContent = content ?? existing.content ?? "";
        const finalVideoUrl = videoUrl ?? existing.videoUrl ?? "";

        const validationError = validatePayloadForType({
            type: finalType,
            content: String(finalContent).trim(),
            videoUrl: String(finalVideoUrl).trim(),
        });

        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const uploadedImageUrl = await uploadImageBuffer(req.file, "testimonials");

        const testimonial = await prisma.testimonial.update({
            where: { id },
            data: {
                name: name ?? undefined,
                designation: designation ?? undefined,
                type: finalType,
                content: finalType === "TEXT" ? content ?? undefined : null,
                videoUrl: finalType === "VIDEO" ? videoUrl ?? undefined : null,
                imageUrl: uploadedImageUrl || imageUrl || undefined,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : undefined,
                isPublished: parseBoolean(req.body.isPublished, undefined),
            },
        });

        res.json({ success: true, data: testimonial });
    } catch (error) {
        next(error);
    }
};

export const deleteTestimonial = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.testimonial.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Testimonial not found" });
        }

        await prisma.testimonial.delete({ where: { id } });
        res.json({ success: true, message: "Testimonial deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const toggleTestimonial = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.testimonial.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Testimonial not found" });
        }

        const testimonial = await prisma.testimonial.update({
            where: { id },
            data: {
                isPublished: !existing.isPublished,
            },
        });

        res.json({ success: true, data: testimonial });
    } catch (error) {
        next(error);
    }
};
