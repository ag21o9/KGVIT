import { prisma } from "../lib/prisma.js";
import { cloudinaryClient } from "../config/cloudinary.config.js";

const USER_MANAGEMENT_PERMISSION = "User Management";

const toPublicUser = (user) => {
    const { password, ...safeUser } = user;
    return safeUser;
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

const uploadUserImageIfPresent = async (file) => {
    if (!file) return null;
    if (!file.buffer) {
        throw new Error("Upload buffer missing. Ensure multer uses memoryStorage.");
    }

    const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinaryClient.uploader.upload_stream(
            {
                folder: "users",
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

export const getUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: "asc" },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true },
                        },
                    },
                },
            },
        });

        const payload = users.map((user) => ({
            ...toPublicUser(user),
            permissions: user.role.permissions.map((rp) => rp.permission.name),
        }));

        res.json({ success: true, data: payload });
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true },
                        },
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            data: {
                ...toPublicUser(user),
                permissions: user.role.permissions.map((rp) => rp.permission.name),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req, res, next) => {
    try {
        const { name, email, password, roleId } = req.body;

        if (!name || !email || !password || !roleId) {
            return res.status(400).json({
                success: false,
                message: "name, email, password and roleId are required",
            });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Email already exists" });
        }

        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) {
            return res.status(400).json({ success: false, message: "Invalid roleId" });
        }

        const imageUrlFromUpload = await uploadUserImageIfPresent(req.file);
        const imageUrl = imageUrlFromUpload || req.body.image || null;

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password,
                roleId,
                image: imageUrl,
            },
            include: {
                role: true,
            },
        });

        res.status(201).json({ success: true, data: toPublicUser(user) });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, password, roleId, image } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (email && email !== existingUser.email) {
            const userWithEmail = await prisma.user.findUnique({ where: { email } });
            if (userWithEmail) {
                return res.status(409).json({ success: false, message: "Email already exists" });
            }
        }

        if (roleId) {
            const role = await prisma.role.findUnique({ where: { id: roleId } });
            if (!role) {
                return res.status(400).json({ success: false, message: "Invalid roleId" });
            }
        }

        const imageUrlFromUpload = await uploadUserImageIfPresent(req.file);

        const user = await prisma.user.update({
            where: { id },
            data: {
                name: name ?? undefined,
                email: email ?? undefined,
                password: password ?? undefined,
                roleId: roleId ?? undefined,
                image: imageUrlFromUpload || image || undefined,
            },
            include: {
                role: true,
            },
        });

        res.json({ success: true, data: toPublicUser(user) });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await prisma.user.delete({ where: { id } });

        res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getRoles = async (req, res, next) => {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: "asc" },
            include: {
                permissions: {
                    include: { permission: true },
                },
            },
        });

        const payload = roles.map((role) => ({
            id: role.id,
            name: role.name,
            permissions: role.permissions.map((rp) => rp.permission),
        }));

        res.json({ success: true, data: payload });
    } catch (error) {
        next(error);
    }
};

export const createRole = async (req, res, next) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Role name is required" });
        }

        const role = await prisma.role.create({ data: { name } });

        res.status(201).json({ success: true, data: role });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Role already exists" });
        }

        next(error);
    }
};

export const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Role name is required" });
        }

        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }

        const updatedRole = await prisma.role.update({
            where: { id },
            data: { name },
        });

        res.json({ success: true, data: updatedRole });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Role already exists" });
        }

        next(error);
    }
};

export const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;

        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }

        await prisma.role.delete({ where: { id } });

        res.json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getPermissions = async (req, res, next) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: permissions });
    } catch (error) {
        next(error);
    }
};

export const createPermission = async (req, res, next) => {
    try {
        const { name, description, permissions } = req.body;

        if (Array.isArray(permissions) && permissions.length > 0) {
            const normalized = permissions
                .filter((item) => item?.name)
                .map((item) => ({
                    name: String(item.name).trim(),
                    description: item.description ?? null,
                }));

            if (!normalized.length) {
                return res.status(400).json({
                    success: false,
                    message: "permissions[] must include at least one object with name",
                });
            }

            const created = [];
            const skipped = [];

            for (const item of normalized) {
                try {
                    const permission = await prisma.permission.create({ data: item });
                    created.push(permission);
                } catch (error) {
                    if (error.code === "P2002") {
                        skipped.push(item.name);
                        continue;
                    }
                    throw error;
                }
            }

            return res.status(201).json({
                success: true,
                message: "Bulk permission seed completed",
                data: { created, skipped },
            });
        }

        if (!name) {
            return res.status(400).json({ success: false, message: "Permission name is required" });
        }

        const permission = await prisma.permission.create({
            data: { name, description: description ?? null },
        });

        res.status(201).json({ success: true, data: permission });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Permission already exists" });
        }

        next(error);
    }
};

export const assignPermissionsToRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { permissionIds = [], permissionNames = [], replace = true } = req.body;

        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }

        let resolvedPermissionIds = [...permissionIds];

        if (permissionNames.length) {
            const byName = await prisma.permission.findMany({
                where: { name: { in: permissionNames } },
                select: { id: true, name: true },
            });

            const existingNames = new Set(byName.map((p) => p.name));
            const missing = permissionNames.filter((name) => !existingNames.has(name));

            if (missing.length) {
                return res.status(400).json({
                    success: false,
                    message: "Some permissionNames do not exist",
                    data: { missing },
                });
            }

            resolvedPermissionIds = [...resolvedPermissionIds, ...byName.map((p) => p.id)];
        }

        const uniquePermissionIds = [...new Set(resolvedPermissionIds)];

        if (!uniquePermissionIds.length) {
            return res.status(400).json({
                success: false,
                message: "permissionIds or permissionNames are required",
            });
        }

        const permissionCount = await prisma.permission.count({
            where: { id: { in: uniquePermissionIds } },
        });

        if (permissionCount !== uniquePermissionIds.length) {
            return res.status(400).json({
                success: false,
                message: "One or more permissionIds are invalid",
            });
        }

        await prisma.$transaction(async (tx) => {
            if (parseBoolean(replace, true)) {
                await tx.rolePermission.deleteMany({ where: { roleId: id } });
            }

            for (const permissionId of uniquePermissionIds) {
                await tx.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: id,
                            permissionId,
                        },
                    },
                    create: {
                        roleId: id,
                        permissionId,
                    },
                    update: {},
                });
            }
        });

        const updatedRole = await prisma.role.findUnique({
            where: { id },
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            message: "Permissions assigned successfully",
            data: {
                id: updatedRole.id,
                name: updatedRole.name,
                permissions: updatedRole.permissions.map((rp) => rp.permission),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const requiredPermission = USER_MANAGEMENT_PERMISSION;
