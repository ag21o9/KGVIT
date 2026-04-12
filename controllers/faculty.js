import { prisma } from "../lib/prisma.js";
import { cloudinaryClient } from "../config/cloudinary.config.js";

const FACULTY_PERMISSION = "Faculty Management";

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

export const requiredPermission = FACULTY_PERMISSION;

export const getFaculty = async (req, res, next) => {
    try {
        const facultyList = await prisma.faculty.findMany({
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
            include: {
                department: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        res.json({ success: true, data: facultyList });
    } catch (error) {
        next(error);
    }
};

export const getFacultyById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const faculty = await prisma.faculty.findUnique({
            where: { id },
            include: {
                department: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        if (!faculty) {
            return res.status(404).json({ success: false, message: "Faculty not found" });
        }

        res.json({ success: true, data: faculty });
    } catch (error) {
        next(error);
    }
};

export const createFaculty = async (req, res, next) => {
    try {
        const {
            name,
            email,
            designation,
            qualification,
            experience,
            bio,
            staffType,
            departmentId,
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }

        if (departmentId) {
            const department = await prisma.department.findUnique({ where: { id: departmentId } });
            if (!department) {
                return res.status(400).json({ success: false, message: "Invalid departmentId" });
            }
        }

        const uploadedPhotoUrl = await uploadImageBuffer(req.file, "faculty");
        const photoUrl = uploadedPhotoUrl || req.body.photoUrl || null;

        const faculty = await prisma.faculty.create({
            data: {
                name,
                email: email ?? null,
                designation: designation ?? null,
                qualification: qualification ?? null,
                experience: experience ?? null,
                bio: bio ?? null,
                photoUrl,
                staffType: staffType ?? null,
                departmentId: departmentId || null,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0,
                isFeatured: parseBoolean(req.body.isFeatured, false),
                isActive: parseBoolean(req.body.isActive, true),
            },
            include: {
                department: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        res.status(201).json({ success: true, data: faculty });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Email already exists" });
        }
        next(error);
    }
};

export const updateFaculty = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            designation,
            qualification,
            experience,
            bio,
            staffType,
            departmentId,
            photoUrl,
        } = req.body;

        const existing = await prisma.faculty.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Faculty not found" });
        }

        if (departmentId) {
            const department = await prisma.department.findUnique({ where: { id: departmentId } });
            if (!department) {
                return res.status(400).json({ success: false, message: "Invalid departmentId" });
            }
        }

        const uploadedPhotoUrl = await uploadImageBuffer(req.file, "faculty");

        const faculty = await prisma.faculty.update({
            where: { id },
            data: {
                name: name ?? undefined,
                email: email ?? undefined,
                designation: designation ?? undefined,
                qualification: qualification ?? undefined,
                experience: experience ?? undefined,
                bio: bio ?? undefined,
                photoUrl: uploadedPhotoUrl || photoUrl || undefined,
                staffType: staffType ?? undefined,
                departmentId:
                    departmentId === null || departmentId === ""
                        ? null
                        : departmentId ?? undefined,
                order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : undefined,
                isFeatured: parseBoolean(req.body.isFeatured, undefined),
                isActive: parseBoolean(req.body.isActive, undefined),
            },
            include: {
                department: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        res.json({ success: true, data: faculty });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Email already exists" });
        }
        next(error);
    }
};

export const deleteFaculty = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.faculty.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Faculty not found" });
        }

        await prisma.faculty.delete({ where: { id } });

        res.json({ success: true, message: "Faculty deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const toggleFacultyFeature = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.faculty.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Faculty not found" });
        }

        const faculty = await prisma.faculty.update({
            where: { id },
            data: { isFeatured: !existing.isFeatured },
            include: {
                department: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        res.json({ success: true, data: faculty });
    } catch (error) {
        next(error);
    }
};
