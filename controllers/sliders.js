import { prisma } from "../lib/prisma.js";
import { cloudinaryClient } from "../config/cloudinary.config.js";

const PAGE_MANAGEMENT_PERMISSION = "Page Management";

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

const parseBoolean = (value, defaultValue = undefined) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
    }
    return defaultValue;
};

export const requiredPermission = PAGE_MANAGEMENT_PERMISSION;

export const getSliders = async (req, res, next) => {
    try {
        const sliders = await prisma.slider.findMany({
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        });

        res.json({ success: true, data: sliders });
    } catch (error) {
        next(error);
    }
};

export const createSlider = async (req, res, next) => {
    try {
        const { title, caption, linkUrl } = req.body;
        const order = Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0;
        const isActive = parseBoolean(req.body.isActive, true);

        const uploadedUrl = await uploadImageBuffer(req.file, "sliders");
        const imageUrl = uploadedUrl || req.body.imageUrl;

        if (!imageUrl) {
            return res.status(400).json({ success: false, message: "image is required" });
        }

        const slider = await prisma.slider.create({
            data: {
                title: title ?? null,
                caption: caption ?? null,
                linkUrl: linkUrl ?? null,
                imageUrl,
                order,
                isActive,
            },
        });

        res.status(201).json({ success: true, data: slider });
    } catch (error) {
        next(error);
    }
};

export const updateSlider = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, caption, linkUrl, imageUrl } = req.body;

        const existing = await prisma.slider.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Slider not found" });
        }

        const uploadedUrl = await uploadImageBuffer(req.file, "sliders");

        const slider = await prisma.slider.update({
            where: { id },
            data: {
                title: title ?? undefined,
                caption: caption ?? undefined,
                linkUrl: linkUrl ?? undefined,
                imageUrl: uploadedUrl || imageUrl || undefined,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : undefined,
                isActive: parseBoolean(req.body.isActive, undefined),
            },
        });

        res.json({ success: true, data: slider });
    } catch (error) {
        next(error);
    }
};

export const deleteSlider = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.slider.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Slider not found" });
        }

        await prisma.slider.delete({ where: { id } });
        res.json({ success: true, message: "Slider deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const toggleSlider = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.slider.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Slider not found" });
        }

        const slider = await prisma.slider.update({
            where: { id },
            data: { isActive: !existing.isActive },
        });

        res.json({ success: true, data: slider });
    } catch (error) {
        next(error);
    }
};

export const getFacilities = async (req, res, next) => {
    try {
        const facilities = await prisma.facility.findMany({
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        });

        res.json({ success: true, data: facilities });
    } catch (error) {
        next(error);
    }
};

export const createFacility = async (req, res, next) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "title is required" });
        }

        const order = Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0;
        const isActive = parseBoolean(req.body.isActive, true);

        const uploadedUrl = await uploadImageBuffer(req.file, "facilities");
        const imageUrl = uploadedUrl || req.body.imageUrl;

        if (!imageUrl) {
            return res.status(400).json({ success: false, message: "image is required" });
        }

        const facility = await prisma.facility.create({
            data: {
                title,
                imageUrl,
                order,
                isActive,
            },
        });

        res.status(201).json({ success: true, data: facility });
    } catch (error) {
        next(error);
    }
};

export const updateFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, imageUrl } = req.body;

        const existing = await prisma.facility.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        const uploadedUrl = await uploadImageBuffer(req.file, "facilities");

        const facility = await prisma.facility.update({
            where: { id },
            data: {
                title: title ?? undefined,
                imageUrl: uploadedUrl || imageUrl || undefined,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : undefined,
                isActive: parseBoolean(req.body.isActive, undefined),
            },
        });

        res.json({ success: true, data: facility });
    } catch (error) {
        next(error);
    }
};

export const deleteFacility = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.facility.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        await prisma.facility.delete({ where: { id } });
        res.json({ success: true, message: "Facility deleted successfully" });
    } catch (error) {
        next(error);
    }
};
